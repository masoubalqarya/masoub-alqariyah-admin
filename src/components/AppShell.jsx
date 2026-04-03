"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import Sidebar from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";

export default function AppShell({ children }) {
  const { user, userProfile, loading } = useAuth();
  const { dir, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";
  const isPOSPage = pathname === "/pos";
  const role = userProfile?.role;

  // Redirect based on auth + role
  useEffect(() => {
    if (loading) return;

    if (isLoginPage && user) {
      // Redirect to appropriate page based on role
      if (role === "cashier") {
        router.replace("/pos");
      } else {
        router.replace("/");
      }
    } else if (!isLoginPage && !user) {
      router.replace("/login");
    } else if (user && role === "cashier" && !isPOSPage && !isLoginPage) {
      // Cashiers can only access POS
      router.replace("/pos");
    } else if (user && role === "admin" && isPOSPage) {
      // Admins are redirected away from POS to dashboard
      router.replace("/");
    }
  }, [loading, user, role, isLoginPage, isPOSPage, router]);

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
    if (user) return null; // redirecting via useEffect
    return (
      <div dir={dir} className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Protected routes - show nothing while redirecting
  if (!user) {
    return null;
  }

  // Block "user" role entirely
  if (role === "user") {
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

  // POS view for cashiers — full-screen, no sidebar
  if (isPOSPage && role === "cashier") {
    return children;
  }

  // Admin view — sidebar + content
  return (
    <div dir={dir} className="min-h-screen bg-muted/30">
      <Sidebar />
      <main className="ms-64 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
