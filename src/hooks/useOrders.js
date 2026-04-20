"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  where,
  Timestamp,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
export async function updateOrderStatus(
  orderId,
  newStatus,
  changedByUid,
  changedByName,
) {
  const orderRef = doc(db, "orders", orderId);
  const updateData = {
    status: newStatus,
    updatedAt: Timestamp.now(),
  };

  if (changedByUid) {
    updateData.statusHistory = arrayUnion({
      status: newStatus,
      changedAt: Timestamp.now(),
      changedBy: changedByUid,
      changedByName: changedByName || "Unknown",
    });
  }

  await updateDoc(orderRef, updateData);
}

/**
 * Cancel an order with audit trail.
 */
export async function cancelOrder(orderId, changedByUid, changedByName) {
  return updateOrderStatus(orderId, "cancelled", changedByUid, changedByName);
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
