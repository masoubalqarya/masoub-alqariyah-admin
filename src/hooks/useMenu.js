"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

// ─── Menu Items ────────────────────────────────────────────

export function useMenuItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "menuItems"), orderBy("category"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { items, loading };
}

export async function addMenuItem(item, imageFile) {
  let imageUrl = item.image || "";

  if (imageFile) {
    const storageRef = ref(
      storage,
      `menuItems/${Date.now()}_${imageFile.name}`,
    );
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  const docRef = await addDoc(collection(db, "menuItems"), {
    ...item,
    image: imageUrl,
  });

  // Update the doc with its own ID for consistency
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateMenuItem(id, data, imageFile) {
  let imageUrl = data.image;

  if (imageFile) {
    const storageRef = ref(storage, `menuItems/${id}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  const docRef = doc(db, "menuItems", id);
  await updateDoc(docRef, {
    ...data,
    ...(imageUrl !== undefined ? { image: imageUrl } : {}),
  });
}

export async function deleteMenuItem(id) {
  await deleteDoc(doc(db, "menuItems", id));
}

// ─── Categories ────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCategories(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { categories, loading };
}

export async function addCategory(cat) {
  if (cat.id) {
    // Use custom ID
    const { setDoc } = await import("firebase/firestore");
    const docRef = doc(db, "categories", cat.id);
    await setDoc(docRef, cat);
    return cat.id;
  }
  const docRef = await addDoc(collection(db, "categories"), cat);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateCategory(id, data) {
  await updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, "categories", id));
}

// ─── Size Options ──────────────────────────────────────────

export function useSizeOptions() {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "sizeOptions"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSizes(data);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { sizes, loading };
}

export async function updateSizeOption(id, data) {
  await updateDoc(doc(db, "sizeOptions", id), data);
}

// ─── Extras Options ────────────────────────────────────────

export function useExtrasOptions() {
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "extrasOptions"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setExtras(data);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { extras, loading };
}

export async function addExtrasOption(ext) {
  const docRef = await addDoc(collection(db, "extrasOptions"), ext);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateExtrasOption(id, data) {
  await updateDoc(doc(db, "extrasOptions", id), data);
}

export async function deleteExtrasOption(id) {
  await deleteDoc(doc(db, "extrasOptions", id));
}
