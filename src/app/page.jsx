"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders } from "@/hooks/useOrders";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useMenuItems } from "@/hooks/useMenu";
import { formatSAR } from "@/lib/utils";
import {
  ShoppingCart,
  DollarSign,
  UtensilsCrossed,
  Store,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { orders } = useOrders();
  const { restaurants } = useRestaurants();
  const { items: menuItems } = useMenuItems();

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const stats = [
    {
      title: t.totalOrders,
      value: orders.length.toString(),
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-100",
      href: "/orders",
    },
    {
      title: t.totalRevenue,
      value: formatSAR(totalRevenue),
      icon: DollarSign,
      color: "text-green-600 bg-green-100",
      href: "/analytics",
    },
    {
      title: locale === "ar" ? "طلبات نشطة" : "Active Orders",
      value: activeOrders.length.toString(),
      icon: Clock,
      color: "text-orange-600 bg-orange-100",
      href: "/orders",
    },
    {
      title: locale === "ar" ? "قيد الانتظار" : "Pending",
      value: pendingCount.toString(),
      icon: Clock,
      color: "text-yellow-600 bg-yellow-100",
      href: "/orders",
    },
    {
      title: t.menu,
      value: menuItems.length.toString(),
      icon: UtensilsCrossed,
      color: "text-purple-600 bg-purple-100",
      href: "/menu",
    },
    {
      title: t.restaurants,
      value: restaurants.length.toString(),
      icon: Store,
      color: "text-primary bg-primary/10",
      href: "/restaurants",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t.dashboard}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Active Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {locale === "ar"
              ? "الطلبات النشطة الأخيرة"
              : "Recent Active Orders"}
          </CardTitle>
          <Link href="/orders" className="text-sm text-primary hover:underline">
            {locale === "ar" ? "عرض الكل" : "View All"}
          </Link>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {locale === "ar" ? "لا توجد طلبات نشطة" : "No active orders"}
            </p>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm">
                      #{order.orderNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {order.plateNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {formatSAR(order.total)}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : order.status === "preparing"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-orange-100 text-orange-800 border-orange-300"
                      }`}>
                      {t[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
