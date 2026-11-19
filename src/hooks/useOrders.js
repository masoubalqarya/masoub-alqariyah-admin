"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  orderBy,
  where,
  Timestamp,
  getDocs,
  getDoc,
} from "firebase/firestore";
import app, { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Real-time listener for orders with optional filters.
 */
export function useOrders(filters) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [orderBy("createdAt", "desc")];

    if (filters?.status) {
      constraints.unshift(where("status", "==", filters.status));
    }
    if (filters?.restaurantId) {
      constraints.unshift(where("restaurantId", "==", filters.restaurantId));
    }
    if (filters?.dateFrom) {
      constraints.push(
        where("createdAt", ">=", Timestamp.fromDate(filters.dateFrom)),
      );
    }
    if (filters?.dateTo) {
      constraints.push(
        where("createdAt", "<=", Timestamp.fromDate(filters.dateTo)),
      );
    }

    const q = query(collection(db, "orders"), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error("Orders listener error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [
    filters?.status,
    filters?.restaurantId,
    filters?.dateFrom?.getTime(),
    filters?.dateTo?.getTime(),
  ]);

  return { orders, loading };
}

/**
 * Update order status in Firestore with audit trail.
 * @param {string} orderId
 * @param {string} newStatus
 * @param {string} [changedByUid] - UID of user making the change
 * @param {string} [changedByName] - Display name of user making the change
 */
export async function updateOrderStatus(orderId, newStatus) {
  const snapshot = await getDoc(doc(db, "orders", orderId));
  const order = snapshot.data();
  if (!order) throw new Error("Order not found");
  const call = httpsCallable(getFunctions(app, "europe-west1"), "posAction");
  return call({ action: "transition", branch: order.restaurantId, orderId, expected: order.status, target: newStatus });
}

export async function changeExistingOrder(order, operation, patch, reason, requestId) {
  const call = httpsCallable(getFunctions(app, "europe-west1"), "changeCustomerOrder", { timeout: 30000 });
  return (await call({ orderId: order.id, expectedRevision: order.revision || 0, operation, patch: patch || {}, reason, requestId })).data;
}

/**
 * Fetch all orders for analytics (non-realtime, one-time fetch).
 */
export async function fetchAllOrders(dateFrom, dateTo) {
  const constraints = [orderBy("createdAt", "desc")];

  if (dateFrom) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(dateFrom)));
  }
  if (dateTo) {
    constraints.push(where("createdAt", "<=", Timestamp.fromDate(dateTo)));
  }

  const q = query(collection(db, "orders"), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
