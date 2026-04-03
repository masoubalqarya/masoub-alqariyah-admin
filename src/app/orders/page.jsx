"use client";

import React, { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useOrders, updateOrderStatus, cancelOrder } from "@/hooks/useOrders";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSAR, statusColors, timeElapsed } from "@/lib/utils";
import {
  Clock,
  Car,
  CreditCard,
  Banknote,
  ChefHat,
  Truck,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";

const statusFlow = ["pending", "preparing", "onTheWay", "delivered"];

function getNextStatus(current) {
  const idx = statusFlow.indexOf(current);
  if (idx === -1 || idx >= statusFlow.length - 1) return null;
  return statusFlow[idx + 1];
}

function getNextStatusLabel(next, t) {
  const map = {
    preparing: t.markPreparing,
    onTheWay: t.markOnTheWay,
    delivered: t.markDelivered,
  };
  return map[next] || next;
}

function getNextStatusIcon(next) {
  switch (next) {
    case "preparing":
      return ChefHat;
    case "onTheWay":
      return Truck;
    case "delivered":
      return CheckCircle;
    default:
      return CheckCircle;
  }
}

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const { user, userProfile } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { restaurants } = useRestaurants();

  const filters = useMemo(() => {
    const f = {};
    if (statusFilter !== "all") f.status = statusFilter;
    if (restaurantFilter !== "all") f.restaurantId = restaurantFilter;
    if (dateFilter) {
      const d = new Date(dateFilter);
      f.dateFrom = new Date(d.setHours(0, 0, 0, 0));
      f.dateTo = new Date(d.setHours(23, 59, 59, 999));
    }
    return f;
  }, [statusFilter, restaurantFilter, dateFilter]);

  const { orders, loading } = useOrders(filters);

  const handleAdvanceStatus = async (order) => {
    const next = getNextStatus(order.status);
    if (!next) return;
    setActionLoading(order.id);
    try {
      await updateOrderStatus(
        order.id,
        next,
        user?.uid,
        userProfile?.displayName || user?.email,
      );
    } catch (err) {
      console.error(err);
    }
    setActionLoading(null);
  };

  const handleCancel = async (orderId) => {
    setActionLoading(orderId);
    try {
      await cancelOrder(
        orderId,
        user?.uid,
        userProfile?.displayName || user?.email,
      );
    } catch (err) {
      console.error(err);
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t.ordersTitle}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t.filterByStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses}</SelectItem>
            <SelectItem value="pending">{t.pending}</SelectItem>
            <SelectItem value="preparing">{t.preparing}</SelectItem>
            <SelectItem value="onTheWay">{t.onTheWay}</SelectItem>
            <SelectItem value="delivered">{t.delivered}</SelectItem>
            <SelectItem value="cancelled">{t.cancelled}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t.filterByRestaurant} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allRestaurants}</SelectItem>
            {restaurants.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {locale === "ar" ? r.nameAr : r.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-48"
          dir="ltr"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
            {locale === "ar" ? "مسح التاريخ" : "Clear Date"}
          </Button>
        )}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            const isLoading = actionLoading === order.id;

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          statusColors[order.status]
                        }`}>
                        {t[order.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {order.createdAt?.toDate
                          ? timeElapsed(order.createdAt.toDate())
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    {/* Car Info */}
                    <div className="flex items-center gap-4 text-sm">
                      <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>
                        {order.plateNumber} • {order.carModel} •{" "}
                        {order.carColor}
                      </span>
                    </div>

                    {/* Items Summary */}
                    <div className="text-sm text-muted-foreground">
                      {order.items?.slice(0, 3).map((item, i) => (
                        <span key={i}>
                          {locale === "ar" ? item.nameAr : item.nameEn} x
                          {item.quantity}
                          {i < Math.min(order.items.length, 3) - 1 ? " • " : ""}
                        </span>
                      ))}
                      {order.items?.length > 3 && (
                        <span>
                          {" "}
                          +{order.items.length - 3}{" "}
                          {locale === "ar" ? "أصناف أخرى" : "more"}
                        </span>
                      )}
                    </div>

                    {/* Payment & Total */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {order.paymentMethod === "card" ? (
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Banknote className="w-4 h-4 text-green-500" />
                        )}
                        <span>
                          {order.paymentMethod === "card" ? t.card : t.cash}
                        </span>
                      </div>
                      <span className="font-bold text-lg">
                        {formatSAR(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 p-4 border-t bg-muted/20">
                    {/* View Details */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}>
                      <Eye className="w-4 h-4" />
                    </Button>

                    {/* Advance Status */}
                    {nextStatus && (
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAdvanceStatus(order)}
                        className="flex-1">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {React.createElement(
                              getNextStatusIcon(nextStatus),
                              {
                                className: "w-4 h-4",
                              },
                            )}
                            {getNextStatusLabel(nextStatus, t)}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Cancel */}
                    {order.status !== "cancelled" &&
                      order.status !== "delivered" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isLoading}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t.cancelOrder}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.confirmCancel}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(order.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {t.confirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t.orderDetails} #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t.plateNumber}:
                  </span>
                  <p className="font-medium">{selectedOrder.plateNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.carModel}:</span>
                  <p className="font-medium">{selectedOrder.carModel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.carColor}:</span>
                  <p className="font-medium">{selectedOrder.carColor}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t.paymentMethod}:
                  </span>
                  <p className="font-medium">
                    {selectedOrder.paymentMethod === "card" ? t.card : t.cash}
                  </p>
                </div>
                {selectedOrder.paymentMethod === "cash" && (
                  <>
                    <div>
                      <span className="text-muted-foreground">
                        {t.cashAmount}:
                      </span>
                      <p className="font-medium">
                        {formatSAR(selectedOrder.cashAmount || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t.changeAmount}:
                      </span>
                      <p className="font-medium">
                        {formatSAR(selectedOrder.changeAmount || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">{t.items}</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div>
                        <span className="font-medium text-sm">
                          {locale === "ar" ? item.nameAr : item.nameEn}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {" "}
                          x{item.quantity}
                        </span>
                        {item.selectedSize && (
                          <span className="text-xs text-muted-foreground block">
                            {locale === "ar"
                              ? item.selectedSize.nameAr
                              : item.selectedSize.nameEn}{" "}
                            (+{item.selectedSize.priceAdd} SAR)
                          </span>
                        )}
                        {item.selectedCookingOption && (
                          <span className="text-xs text-muted-foreground block">
                            {locale === "ar"
                              ? item.selectedCookingOption.nameAr
                              : item.selectedCookingOption.nameEn}
                          </span>
                        )}
                        {item.selectedExtras?.map((ext, j) => (
                          <span
                            key={j}
                            className="text-xs text-muted-foreground block">
                            + {locale === "ar" ? ext.nameAr : ext.nameEn} (+
                            {ext.priceAdd} SAR)
                          </span>
                        ))}
                      </div>
                      <span className="font-medium text-sm">
                        {formatSAR(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t font-bold">
                <span>{t.total}</span>
                <span>{formatSAR(selectedOrder.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
