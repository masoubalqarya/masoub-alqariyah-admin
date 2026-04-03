"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllOrders } from "@/hooks/useOrders";
import { useCategories } from "@/hooks/useMenu";
import { formatSAR } from "@/lib/utils";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Star,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  format,
} from "date-fns";

const CHART_COLORS = [
  "#8A776F",
  "#D4A373",
  "#E9C46A",
  "#2A9D8F",
  "#264653",
  "#E76F51",
  "#F4A261",
];

export default function AnalyticsPage() {
  const { t, locale } = useI18n();
  const { categories } = useCategories();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
      case "week":
        return {
          dateFrom: startOfWeek(now, { weekStartsOn: 0 }),
          dateTo: endOfDay(now),
        };
      case "month":
        return { dateFrom: startOfMonth(now), dateTo: endOfDay(now) };
      case "custom":
        return {
          dateFrom: customFrom
            ? startOfDay(new Date(customFrom))
            : subDays(now, 30),
          dateTo: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
        };
    }
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    setLoading(true);
    fetchAllOrders(dateFrom, dateTo)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  // KPIs
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const totalOrders = orders.length;
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const avgOrderValue =
    deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

  // Most ordered item
  const itemCounts = {};
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const key = locale === "ar" ? item.nameAr : item.nameEn;
      if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0 };
      itemCounts[key].count += item.quantity;
    });
  });
  const sortedItems = Object.values(itemCounts).sort(
    (a, b) => b.count - a.count,
  );
  const mostOrdered = sortedItems[0]?.name || "-";
  const top5Items = sortedItems.slice(0, 5);

  // Orders over time (line chart)
  const ordersOverTime = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (o.createdAt?.toDate) {
        const key = format(o.createdAt.toDate(), "MM/dd");
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  // Revenue by category (bar chart)
  const revenueByCategory = useMemo(() => {
    const map = {};
    deliveredOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const name = locale === "ar" ? item.nameAr : item.nameEn;
        if (!map[name]) map[name] = 0;
        map[name] += item.subtotal * item.quantity;
      });
    });
    return Object.entries(map)
      .map(([name, revenue]) => ({ name: name.substring(0, 15), revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [deliveredOrders, locale]);

  // Payment breakdown (pie chart)
  const paymentBreakdown = useMemo(() => {
    let card = 0;
    let cash = 0;
    orders.forEach((o) => {
      if (o.paymentMethod === "card") card++;
      else cash++;
    });
    return [
      { name: t.card, value: card },
      { name: t.cash, value: cash },
    ].filter((d) => d.value > 0);
  }, [orders, t]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t.analyticsTitle}</h1>

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-2">
        {["today", "week", "month", "custom"].map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(range)}>
            {range === "today"
              ? t.today
              : range === "week"
                ? t.thisWeek
                : range === "month"
                  ? t.thisMonth
                  : t.custom}
          </Button>
        ))}
        {dateRange === "custom" && (
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40"
              dir="ltr"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t.totalOrders}
                    </p>
                    <p className="text-3xl font-bold mt-1">{totalOrders}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t.totalRevenue}
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {formatSAR(totalRevenue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t.avgOrderValue}
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {formatSAR(avgOrderValue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t.mostOrderedItem}
                    </p>
                    <p className="text-xl font-bold mt-1 truncate">
                      {mostOrdered}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Star className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>{t.ordersOverTime}</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersOverTime.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t.noData}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ordersOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8A776F"
                        strokeWidth={2}
                        dot={{ fill: "#8A776F" }}
                        name={t.orders}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            <Card>
              <CardHeader>
                <CardTitle>{t.revenueByCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t.noData}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatSAR(Number(value))}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#8A776F"
                        radius={[4, 4, 0, 0]}>
                        {revenueByCategory.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t.paymentBreakdown}</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t.noData}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props) =>
                          `${props.name ?? ""} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value">
                        <Cell fill="#2A9D8F" />
                        <Cell fill="#E9C46A" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t.topItems}</CardTitle>
              </CardHeader>
              <CardContent>
                {top5Items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t.noData}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {top5Items.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">
                              {item.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {item.count} {locale === "ar" ? "طلب" : "orders"}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  top5Items[0]?.count
                                    ? (item.count / top5Items[0].count) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
