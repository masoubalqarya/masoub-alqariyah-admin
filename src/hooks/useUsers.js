"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import app from "@/lib/firebase";

/**
 * Real-time listener for staff users (admin/cashier only).
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter((u) => u.role === "admin" || u.role === "cashier");
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error("Users listener error:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { users, loading };
}

/**
 * Create a new user with Firebase Auth + Firestore profile.
 * Uses a secondary app instance to avoid signing out the current admin.
 */
export async function createUser(
  { email, password, displayName, role, restaurantId, restaurantName },
  createdByUid,
) {
  const secondaryApp = initializeApp(app.options, "secondary");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );
    const uid = credential.user.uid;

    await setDoc(doc(db, "users", uid), {
      email,
      displayName,
      role,
      restaurantId: role === "cashier" ? restaurantId : null,
      restaurantName: role === "cashier" ? restaurantName : null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: createdByUid,
    });

    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

/**
 * Update a user profile in Firestore.
 */
export async function updateUser(uid, data) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a staff user: Firebase Auth account + Firestore `users/{uid}`.
 * Auth deletion requires Admin SDK, so this calls a server route.
 */
export async function deleteUser(uid) {
  const { auth } = await import("@/lib/firebase");
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`/api/users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Failed to delete user");
  }
}

/**
 * Toggle user active status.
 */
export async function toggleUserActive(uid, isActive) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    isActive,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Send password reset email to user.
 */
export async function sendUserPasswordReset(email) {
  const { auth } = await import("@/lib/firebase");
  await sendPasswordResetEmail(auth, email);
}
