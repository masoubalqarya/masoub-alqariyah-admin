"use client";

import React from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/lib/i18n";
import AppShell from "@/components/AppShell";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppShell>{children}</AppShell>
      </I18nProvider>
    </AuthProvider>
  );
}
