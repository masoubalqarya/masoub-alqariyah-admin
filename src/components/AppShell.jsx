"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import AdminWalkthrough from "@/components/AdminWalkthrough";
import Sidebar from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";

export default function AppShell({ children }) {
  const { user, userProfile, loading } = useAuth();
  const { dir, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";
  const role = userProfile?.role;

  // Redirect based on authentication
  useEffect(() => {
    if (loading) return;

    if (isLoginPage && user) {
      router.replace("/");
    } else if (!isLoginPage && !user) {
      router.replace("/login");
    }
  }, [loading, user, isLoginPage, router]);

  // Show loading spinner during auth check
  if (loading) {
    return (
      <div
        dir={dir}
        className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login page - no sidebar
  if (isLoginPage) {
    if (user) return null;

    return (
      <div dir={dir} className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Protected routes
  if (!user) {
    return null;
  }

  // Block users without dashboard access
  if (role !== "admin") {
    return (
      <div
        dir={dir}
        className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <ShieldX className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold">{t.noAccessTitle}</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {t.noAccessMessage}
        </p>
      </div>
    );
  }

  // Dashboard layout - sidebar + content
  return (
    <div dir={dir} className="min-h-screen bg-muted/30">
      <Sidebar />
      <AdminWalkthrough key={user.uid} userId={user.uid} />
      <main className="ms-64 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
