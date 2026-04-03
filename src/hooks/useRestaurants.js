"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "restaurants"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRestaurants(data);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { restaurants, loading };
}

export async function addRestaurant(restaurant, logoFile) {
  let logoUrl = restaurant.logoImage || "";

  if (logoFile) {
    const storageRef = ref(
      storage,
      `restaurants/${Date.now()}_${logoFile.name}`,
    );
    const snapshot = await uploadBytes(storageRef, logoFile);
    logoUrl = await getDownloadURL(snapshot.ref);
  }

  const docRef = await addDoc(collection(db, "restaurants"), {
    ...restaurant,
    logoImage: logoUrl,
  });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateRestaurant(id, data, logoFile) {
  let logoUrl = data.logoImage;

  if (logoFile) {
    const storageRef = ref(storage, `restaurants/${id}_${logoFile.name}`);
    const snapshot = await uploadBytes(storageRef, logoFile);
    logoUrl = await getDownloadURL(snapshot.ref);
  }

  await updateDoc(doc(db, "restaurants", id), {
    ...data,
    ...(logoUrl !== undefined ? { logoImage: logoUrl } : {}),
  });
}

export async function deleteRestaurant(id) {
  await deleteDoc(doc(db, "restaurants", id));
}

export async function toggleRestaurantStatus(id, isActive) {
  await updateDoc(doc(db, "restaurants", id), { isActive });
}
