"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Loader2, X } from "lucide-react";
import { EVENTS, STATUS, useJoyride } from "react-joyride";
import { useI18n } from "@/lib/i18n";
import { ADMIN_PAGES } from "@/lib/admin-guides";
import { ADMIN_TOUR_STEPS, firstTourStep, prepareTourStep, tourRoute, tourSelector } from "@/lib/admin-tour";
import { Button } from "@/components/ui/button";

export function replayAdminWalkthrough(pageId) {
  window.dispatchEvent(new CustomEvent("admin-walkthrough-open", {
    detail: { pageId: typeof pageId === "string" ? pageId : undefined },
  }));
}

function TourTooltip({ backProps, closeProps, controls, index, primaryProps, size, skipProps, step, tooltipProps }) {
  const { t, dir } = useI18n();
  return (
    <div {...tooltipProps} dir={dir} aria-labelledby="admin-tour-title" aria-describedby="admin-tour-content"
      className="flex max-h-[85dvh] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-xl border bg-card text-card-foreground shadow-xl">
      <div className="relative shrink-0 border-b p-5 pe-12">
        <p className="mb-2 text-xs font-semibold text-primary">{t.quickWalkthrough} ? {index + 1} / {size}</p>
        <h2 id="admin-tour-title" className="text-lg font-bold leading-7">{step.title}</h2>
        <Button {...closeProps} size="icon" variant="ghost" className="absolute end-2 top-2"><X className="h-4 w-4" /></Button>
      </div>
      <div className="min-h-0 overflow-y-auto p-5">
        <label htmlFor="walkthrough-page" className="sr-only">{t.help.chapter}</label>
        <select id="walkthrough-page" value={step.data.page} onChange={(event) => controls.go(firstTourStep(event.target.value))}
          className="mb-4 w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {ADMIN_PAGES.map((page) => <option key={page.id} value={page.id}>{t[page.labelKey]}</option>)}
        </select>
        <div id="admin-tour-content" className="text-sm leading-7 text-muted-foreground">{step.content}</div>
        <Link href={`/help#${step.data.page}`} onClick={() => controls.skip()} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <BookOpen className="h-4 w-4" />{t.help.readGuide}
        </Link>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t p-4">
        {index > 0 && <Button {...backProps} variant="outline" size="sm" />}
        <Button {...primaryProps} size="sm" />
        <Button {...skipProps} variant="ghost" size="sm" className="ms-auto" />
      </div>
    </div>
  );
}

function TourLoader() {
  const { t, dir } = useI18n();
  return <div dir={dir} role="status" className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
    <Loader2 className="h-4 w-4 animate-spin text-primary" />{t.loading}
    <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new Event("admin-walkthrough-stop"))}>{t.tourSkip}</Button>
  </div>;
}

export default function AdminWalkthrough({ userId }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const expectedRoute = useRef(null);
  const pending = useRef(null);
  const [errorPage, setErrorPage] = useState(null);
  const key = `admin_walkthrough_v1:${userId}`;

  const prepare = useCallback(async (spec) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    expectedRoute.current = tourRoute(spec.page);
    await prepareTourStep(spec, { navigate: (route) => router.push(route), pathname: window.location.pathname, signal: controller.signal });
  }, [router]);

  const steps = useMemo(() => ADMIN_TOUR_STEPS.map((spec, index) => {
    const guide = t.help.guides[spec.page];
    const section = guide.sections[spec.section];
    return {
      id: `${spec.page}-${index}`,
      data: { page: spec.page },
      title: spec.labelKey ? t[spec.labelKey] : section.title,
      content: section.body,
      before: () => prepare(spec),
      // Empty/error/loading views have no record controls. Keep their guidance
      // available on the page heading instead of skipping the entire chapter.
      target: () => document.querySelector(tourSelector(spec.target)) || document.querySelector(`[data-tour-page="${spec.page === "login" ? "dashboard" : spec.page}"] h1`),
    };
  }), [prepare, t]);

  const { controls, Tour } = useJoyride({
    continuous: true,
    scrollToFirstStep: true,
    steps,
    tooltipComponent: TourTooltip,
    loaderComponent: TourLoader,
    locale: { back: t.back, close: t.help.closeTour, last: t.tourDone, next: t.tourNext, skip: t.tourSkip, open: t.quickWalkthrough },
    options: {
      blockTargetInteraction: true,
      buttons: ["back", "close", "primary", "skip"],
      closeButtonAction: "skip",
      dismissKeyAction: false,
      overlayClickAction: false,
      skipBeacon: true,
      beforeTimeout: 15000,
      targetWaitTimeout: 5000,
      primaryColor: "#8A776F",
      arrowColor: "#ffffff",
      overlayColor: "rgba(35, 26, 22, 0.58)",
      spotlightRadius: 8,
      scrollOffset: 24,
      zIndex: 1000,
    },
    onEvent: (event, tourControls) => {
      if ([EVENTS.ERROR, EVENTS.TARGET_NOT_FOUND].includes(event.type)) {
        pending.current?.abort();
        tourControls.stop();
        setErrorPage(event.step.data.page);
      } else if (event.type === EVENTS.TOUR_END && [STATUS.FINISHED, STATUS.SKIPPED].includes(event.status)) {
        pending.current?.abort();
        try { localStorage.setItem(key, "seen"); } catch { /* Replay works without storage. */ }
      }
    },
  });

  useEffect(() => {
    let alive = true;
    const show = (event) => {
      setErrorPage(null);
      pending.current?.abort();
      controls.start(firstTourStep(event?.detail?.pageId));
    };
    const stop = () => controls.skip();
    const escape = (event) => {
      if (event.key === "Escape" && controls.info().status === STATUS.RUNNING) {
        event.preventDefault();
        event.stopPropagation();
        controls.skip();
      }
    };
    window.addEventListener("admin-walkthrough-open", show);
    window.addEventListener("admin-walkthrough-stop", stop);
    document.addEventListener("keydown", escape, true);
    Promise.resolve().then(() => {
      try { if (alive && !localStorage.getItem(key)) show(); } catch { /* Sidebar replay stays available. */ }
    });
    return () => {
      alive = false;
      pending.current?.abort();
      window.removeEventListener("admin-walkthrough-open", show);
      window.removeEventListener("admin-walkthrough-stop", stop);
      document.removeEventListener("keydown", escape, true);
    };
  }, [controls, key]);

  useEffect(() => {
    // Browser Back or navigation outside the tour ends it on the chosen page.
    if (expectedRoute.current && pathname !== expectedRoute.current && controls.info().status === STATUS.RUNNING) controls.skip();
  }, [controls, pathname]);

  return <>
    {Tour}
    {errorPage && <div role="alert" className="fixed bottom-4 end-4 z-[1001] max-w-sm space-y-3 rounded-xl border bg-card p-5 shadow-xl">
      <p className="text-sm leading-7">{t.help.tourUnavailable}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => replayAdminWalkthrough(errorPage)}>{t.replayWalkthrough}</Button>
        <Button size="sm" variant="outline" asChild><Link href={`/help#${errorPage}`} onClick={() => setErrorPage(null)}>{t.help.readGuide}</Link></Button>
        <Button size="sm" variant="ghost" onClick={() => setErrorPage(null)}>{t.help.closeTour}</Button>
      </div>
    </div>}
  </>;
}
