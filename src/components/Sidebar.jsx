"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Tag,
  Store,
  BarChart3,
  LogOut,
  Globe,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/orders", icon: ShoppingCart, labelKey: "orders" },
  { href: "/menu", icon: UtensilsCrossed, labelKey: "menu" },
  { href: "/offers", icon: Tag, labelKey: "offers" },
  { href: "/restaurants", icon: Store, labelKey: "restaurants" },
  { href: "/users", icon: Users, labelKey: "users" },
  { href: "/analytics", icon: BarChart3, labelKey: "analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  return (
    <aside className="flex flex-col h-screen w-64 bg-white border-e border-border shadow-sm fixed start-0 top-0 z-40">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-foreground leading-tight">
            {locale === "ar" ? "معصوب القرية" : "Masoub AlQarya"}
          </span>
          <span className="text-xs text-muted-foreground">
            {locale === "ar" ? "لوحة الإدارة" : "Admin Panel"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{t[item.labelKey]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
          <Globe className="w-5 h-5" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={logout}>
          <LogOut className="w-5 h-5" />
          <span>{t.logout}</span>
        </Button>
      </div>
    </aside>
  );
}
