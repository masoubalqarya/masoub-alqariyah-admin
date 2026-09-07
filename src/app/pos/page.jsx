"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useOrders, updateOrderStatus, cancelOrder } from "@/hooks/useOrders";
import { useActiveShift, clockIn, clockOut } from "@/hooks/useShifts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  LogOut,
  Globe,
  ShoppingCart,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  CreditCard,
  Banknote,
  Car,
  Package,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { cn, formatSAR, timeElapsed } from "@/lib/utils";
import { format } from "date-fns";

const KANBAN_COLUMNS = [
  { status: "pending", icon: ShoppingCart, colorClass: "border-t-yellow-500" },
  { status: "preparing", icon: ChefHat, colorClass: "border-t-blue-500" },
  { status: "onTheWay", icon: Truck, colorClass: "border-t-purple-500" },
];

export default function POSPage() {
  const { t, locale, setLocale, dir } = useI18n();
  const { user, userProfile, logout } = useAuth();
  const { activeShift, loading: shiftLoading } = useActiveShift(user?.uid);

  // Filter by cashier's restaurant
  const restaurantId = userProfile?.restaurantId;
  const { orders, loading: ordersLoading } = useOrders({ restaurantId });

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const prevOrderCountRef = useRef(0);

  const playNotification = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => {
        osc.frequency.value = 1000;
        setTimeout(() => {
          osc.frequency.value = 1200;
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, 150);
        }, 150);
      }, 150);
    } catch (e) {
      console.warn("Audio notification failed:", e);
    }
  }, []);

  // Sound notification for new pending orders
  useEffect(() => {
    const pendingOrders = orders.filter((o) => o.status === "pending");
    if (
      pendingOrders.length > prevOrderCountRef.current &&
      prevOrderCountRef.current > 0 &&
      soundEnabled
    ) {
      playNotification();
    }
    prevOrderCountRef.current = pendingOrders.length;
  }, [orders, soundEnabled, playNotification]);

  // Shift timer — subscribe to a 1-second clock tick
  const shiftTimerStore = useRef({ value: "", listeners: new Set() });
  useEffect(() => {
    const store = shiftTimerStore.current;
    if (!activeShift) {
      store.value = "";
      store.listeners.forEach((l) => l());
      return undefined;
    }
    const tick = () => {
      const start = activeShift.clockIn.toDate();
      const now = new globalThis.Date();
      const ms = now.getTime() - start.getTime();
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      store.value = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      store.listeners.forEach((l) => l());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const shiftTimer = useSyncExternalStore(
    useCallback((onStoreChange) => {
      const store = shiftTimerStore.current;
      store.listeners.add(onStoreChange);
      return () => store.listeners.delete(onStoreChange);
    }, []),
    () => shiftTimerStore.current.value,
    () => "",
  );

  const handleClockIn = async () => {
    try {
      await clockIn(
        user.uid,
        userProfile?.displayName || user.email,
        restaurantId,
      );
    } catch (error) {
      console.error("Clock in error:", error);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    try {
      await clockOut(activeShift.id);
    } catch (error) {
      console.error("Clock out error:", error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(
        orderId,
        newStatus,
        user.uid,
        userProfile?.displayName || user.email,
      );
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelOrder(
        cancelTarget.id,
        user.uid,
        userProfile?.displayName || user.email,
      );
    } catch (error) {
      console.error("Cancel error:", error);
    }
    setCancelTarget(null);
  };

  // Today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => o.createdAt?.toDate() >= todayStart);
  const todayDelivered = todayOrders.filter((o) => o.status === "delivered");
  const todayRevenue = todayDelivered.reduce(
    (sum, o) => sum + (o.total || 0),
    0,
  );

  const getNextStatus = (status) => {
    const flow = {
      pending: "preparing",
      preparing: "onTheWay",
      onTheWay: "delivered",
    };
    return flow[status];
  };

  const getNextStatusLabel = (status) => {
    const labels = {
      pending: t.markPreparing,
      preparing: t.markOnTheWay,
      onTheWay: t.markDelivered,
    };
    return labels[status];
  };

  if (ordersLoading || shiftLoading) {
    return (
      <div className="pos-dark flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className="pos-dark min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center">
            <span className="text-gray-900 font-bold text-lg">م</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-yellow-500">{t.posTitle}</h1>
            <p className="text-xs text-gray-400">
              {userProfile?.displayName} — {userProfile?.restaurantName}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-400">{t.todayOrders}</p>
            <p className="text-lg font-bold text-white">{todayOrders.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">{t.todayRevenue}</p>
            <p className="text-lg font-bold text-green-400">
              {formatSAR(todayRevenue)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-gray-400 hover:text-white hover:bg-gray-800">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>

          {/* Shift button */}
          {activeShift ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClockOut}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-xs">{shiftTimer}</span>
              <span className="hidden sm:inline">{t.clockOut}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleClockIn}
              className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Clock className="w-4 h-4" />
              {t.clockIn}
            </Button>
          )}

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="text-gray-400 hover:text-white hover:bg-gray-800">
            <Globe className="w-5 h-5" />
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 gap-0 h-full">
          {KANBAN_COLUMNS.map((col) => {
            const columnOrders = orders.filter((o) => o.status === col.status);
            const Icon = col.icon;

            return (
              <div
                key={col.status}
                className={cn(
                  "flex flex-col h-full border-e border-gray-800 last:border-e-0",
                  "border-t-4",
                  col.colorClass,
                )}>
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-sm">
                      {t[col.status]}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-gray-800 text-gray-300 text-xs">
                    {columnOrders.length}
                  </Badge>
                </div>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
                      {t.noOrders}
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        t={t}
                        onStatusUpdate={handleStatusUpdate}
                        onCancel={() => setCancelTarget(order)}
                        onSelect={() => setSelectedOrder(order)}
                        getNextStatus={getNextStatus}
                        getNextStatusLabel={getNextStatusLabel}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed/Cancelled bar */}
      <CompletedBar orders={orders} t={t} locale={locale} />

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-yellow-500">
              {t.orderDetails} — #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetail order={selectedOrder} t={t} locale={locale} />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelOrder}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t.confirmCancel}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700">
              {t.cancelOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Individual order card for the kanban board */
function OrderCard({
  order,
  t,
  onStatusUpdate,
  onCancel,
  onSelect,
  getNextStatus,
  getNextStatusLabel,
}) {
  const nextStatus = getNextStatus(order.status);
  const elapsed = order.createdAt ? timeElapsed(order.createdAt.toDate()) : "";

  const statusButtonColors = {
    pending: "bg-blue-600 hover:bg-blue-700",
    preparing: "bg-purple-600 hover:bg-purple-700",
    onTheWay: "bg-green-600 hover:bg-green-700",
  };

  return (
    <Card
      className="bg-gray-800/80 border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
      onClick={onSelect}>
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-yellow-500 text-base">
            #{order.orderNumber}
          </span>
          <span className="text-xs text-gray-400">{elapsed}</span>
        </div>

        {/* Car info */}
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <Car className="w-3.5 h-3.5 text-gray-500" />
          <span>
            {order.plateNumber} · {order.carModel} · {order.carColor}
          </span>
        </div>

        {/* Items summary */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Package className="w-3.5 h-3.5" />
          <span>
            {order.items?.length || 0} {t.items} ·{" "}
            {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} qty
          </span>
        </div>

        {/* Payment & Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {order.paymentMethod === "cash" ? (
              <Banknote className="w-4 h-4 text-green-400" />
            ) : (
              <CreditCard className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-xs text-gray-400">
              {order.paymentMethod === "cash" ? t.cash : t.card}
            </span>
          </div>
          <span className="font-bold text-green-400 text-sm">
            {formatSAR(order.total)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {nextStatus && (
            <Button
              size="sm"
              className={cn(
                "flex-1 text-white text-xs h-9",
                statusButtonColors[order.status],
              )}
              onClick={() => onStatusUpdate(order.id, nextStatus)}>
              {getNextStatusLabel(order.status)}
            </Button>
          )}
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs h-9"
              onClick={onCancel}>
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Completed orders bottom bar */
function CompletedBar({ orders, t }) {
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center gap-6 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-gray-400">{t.delivered}:</span>
        <span className="font-bold text-green-400">{delivered.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-gray-400">{t.cancelled}:</span>
        <span className="font-bold text-red-400">{cancelled.length}</span>
      </div>
    </div>
  );
}

/** Order detail view in dialog */
function OrderDetail({ order, t, locale }) {
  return (
    <div className="space-y-4">
      {/* Car Info */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">{t.plateNumber}</p>
          <p className="font-medium">{order.plateNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t.carModel}</p>
          <p className="font-medium">{order.carModel}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t.carColor}</p>
          <p className="font-medium">{order.carColor}</p>
        </div>
      </div>

      {/* Items */}
      <div>
        <p className="text-xs text-gray-400 mb-2">{t.items}</p>
        <div className="space-y-2">
          {order.items?.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-800 rounded-lg p-2 text-sm">
              <div className="flex flex-wrap items-center gap-y-1">
                <span className="font-medium">
                  {locale === "ar" ? item.nameAr : item.nameEn}
                </span>
                <span className="text-gray-400 ms-2">x{item.quantity}</span>
                {item.selectedSize && (
                  <Badge
                    variant="secondary"
                    className="ms-2 text-xs bg-gray-700">
                    {locale === "ar"
                      ? item.selectedSize.nameAr
                      : item.selectedSize.nameEn}
                  </Badge>
                )}
                {item.selectedCookingOption && (
                  <Badge
                    variant="secondary"
                    className="ms-2 text-xs bg-gray-700">
                    {locale === "ar"
                      ? item.selectedCookingOption.nameAr
                      : item.selectedCookingOption.nameEn}
                  </Badge>
                )}
                {item.selectedExtras?.map((ext, j) => (
                  <Badge
                    key={j}
                    variant="secondary"
                    className="ms-2 text-xs bg-gray-700">
                    {locale === "ar" ? ext.nameAr : ext.nameEn}
                  </Badge>
                ))}
              </div>
              <span className="text-green-400 font-medium">
                {formatSAR(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          {order.paymentMethod === "cash" ? (
            <Banknote className="w-5 h-5 text-green-400" />
          ) : (
            <CreditCard className="w-5 h-5 text-blue-400" />
          )}
          <span>{order.paymentMethod === "cash" ? t.cash : t.card}</span>
        </div>
        <span className="text-xl font-bold text-green-400">
          {formatSAR(order.total)}
        </span>
      </div>

      {/* Audit Trail */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">{t.statusHistory}</p>
          <div className="space-y-1">
            {order.statusHistory.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-gray-800 rounded p-2">
                <Badge
                  variant="secondary"
                  className="bg-gray-700 text-gray-300">
                  {t[entry.status] || entry.status}
                </Badge>
                <span className="text-gray-400">{entry.changedByName}</span>
                <span className="text-gray-500">
                  {entry.changedAt
                    ? format(entry.changedAt.toDate(), "HH:mm:ss")
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
