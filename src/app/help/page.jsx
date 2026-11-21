"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ChevronDown, ExternalLink, Play, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { filterHelpPages } from "@/lib/admin-guides";
import { replayAdminWalkthrough } from "@/components/AdminWalkthrough";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HelpPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const help = t.help;
  const pages = filterHelpPages(help, query, category);
  const searching = query.trim().length > 0;
  const reset = () => { setQuery(""); setCategory("all"); };

  // A tour can switch to any chapter. Keep every destination guide available
  // when its full-guide link returns to this already-mounted page.
  useEffect(() => {
    const clearFilters = () => { setQuery(""); setCategory("all"); };
    window.addEventListener("admin-walkthrough-open", clearFilters);
    return () => window.removeEventListener("admin-walkthrough-open", clearFilters);
  }, []);

  return (
    <div data-tour-page="help" className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="" width={64} height={64} className="rounded-full" />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{t.helpCenter}</h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{help.subtitle}</p>
            </div>
          </div>
          <Button data-tour="help-start-tour" onClick={() => replayAdminWalkthrough()}><Play className="h-4 w-4" />{help.startTour}</Button>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{help.tourDescription}</p>
        <div className="relative mt-6 max-w-2xl">
          <label htmlFor="help-search" className="sr-only">{help.search}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input data-tour="help-search" id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={help.searchPlaceholder} className="h-12 bg-background ps-11" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={help.browse}>
          {[["all", help.all], ...Object.entries(help.categories)].map(([id, label]) => (
            <Button key={id} variant={category === id ? "default" : "outline"} size="sm"
              aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</Button>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <nav data-tour="help-browse" aria-label={help.browse} className="rounded-xl border bg-card p-4 xl:sticky xl:top-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" />{help.browse}</h2>
          <ul className="flex flex-wrap gap-1 xl:flex-col">
            {pages.map((page) => <li key={page.id}>
              <a href={`#${page.id}`} className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t[page.labelKey]}</a>
            </li>)}
          </ul>
          <p role="status" className="mt-3 border-t pt-3 text-xs text-muted-foreground">{help.results}: {pages.length}</p>
        </nav>

        <div className="min-w-0 space-y-5">
          {pages.length === 0 && <div className="rounded-xl border border-dashed bg-card p-8 text-center">
            <Search className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{help.emptyTitle}</h2>
            <p className="my-3 text-sm leading-7 text-muted-foreground">{help.emptyBody}</p>
            <Button variant="outline" onClick={reset}>{help.clear}</Button>
          </div>}

          {pages.map((page) => {
            const guide = help.guides[page.id];
            return <article key={page.id} id={page.id} tabIndex={-1} aria-labelledby={`guide-${page.id}`} className="scroll-mt-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              <p className="mb-2 text-xs font-medium text-primary">{help.categories[page.category]}</p>
              <h2 id={`guide-${page.id}`} className="text-xl font-bold">{guide.title}</h2>
              <p className="mb-5 mt-2 text-sm leading-7 text-muted-foreground">{guide.summary}</p>
              <div className="divide-y rounded-lg border px-4">
                {guide.sections.map((section, index) => (
                  <details key={`${index}-${searching}`} open={searching ? true : undefined} className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-semibold leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      {section.title}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="pt-2 text-sm leading-8 text-muted-foreground">{section.body}</p>
                  </details>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <h3 className="text-sm font-semibold">{help.troubleshooting}</h3>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{guide.troubleshooting}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {page.id !== "login" && <Button variant="outline" size="sm" asChild>
                  <Link href={page.href}><ExternalLink className="h-4 w-4" />{help.openPage}</Link>
                </Button>}
                <Button variant="ghost" size="sm" onClick={() => replayAdminWalkthrough(page.id)}><Play className="h-4 w-4" />{help.tourPage}</Button>
              </div>
              {page.id === "login" && <p className="mt-3 text-xs leading-6 text-muted-foreground">{help.loginNote}</p>}
            </article>;
          })}
        </div>
      </div>

      <footer className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">{help.needHelp}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{help.supportBody}</p>
      </footer>
    </div>
  );
}
