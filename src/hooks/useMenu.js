"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImages } from "@/lib/catalog-images";
import { sortCategories, sortProducts } from "@/lib/catalog-order";

// One atomic save renumbers the displayed list to 1..N without editing other fields.
export async function saveCatalogOrder(collectionName, ids, field = "sortOrder") {
  const allowed = collectionName === "categories" ? field === "sortOrder" : collectionName === "menuItems" && ["sortOrder", "featuredRank"].includes(field);
  if (!allowed || ids.length > 500 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !id)) throw new Error("invalid-order");
  const batch = writeBatch(db);
  ids.forEach((id, index) => batch.update(doc(db, collectionName, id), { [field]: index + 1 }));
  await batch.commit();
}

// ─── Menu Items ────────────────────────────────────────────

export function useMenuItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "menuItems"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setItems(sortProducts(data, []));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { items, loading };
}

export async function addMenuItem(item, gallery = []) {
  const images = await uploadImages(gallery, "menuItems");
  const docRef = await addDoc(collection(db, "menuItems"), { ...item, images, image: images[0] || "" });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateMenuItem(id, data, gallery) {
  const images = gallery === undefined ? undefined : await uploadImages(gallery, "menuItems");
  await updateDoc(doc(db, "menuItems", id), {
    ...data,
    ...(images === undefined ? {} : { images, image: images[0] || "" }),
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
      setCategories(sortCategories(data));
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

// ─── Allergies Options ─────────────────────────────────────

export function useAllergiesOptions() {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "allergiesOptions"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAllergies(data);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { allergies, loading };
}

export async function addAllergyOption(alg) {
  if (alg.id) {
    const { setDoc } = await import("firebase/firestore");
    const docRef = doc(db, "allergiesOptions", alg.id);
    await setDoc(docRef, alg);
    return alg.id;
  }
  const docRef = await addDoc(collection(db, "allergiesOptions"), alg);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateAllergyOption(id, data) {
  await updateDoc(doc(db, "allergiesOptions", id), data);
}

export async function deleteAllergyOption(id) {
  await deleteDoc(doc(db, "allergiesOptions", id));
}
