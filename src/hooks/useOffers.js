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
import { db } from "@/lib/firebase";
import { uploadImages } from "@/lib/catalog-images";

export function useOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "offers"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setOffers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { offers, loading };
}

export async function addOffer(offer, gallery = []) {
  const images = await uploadImages(gallery, "offers");
  const docRef = await addDoc(collection(db, "offers"), { ...offer, images, image: images[0] || "" });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateOffer(id, data, gallery) {
  const images = gallery === undefined ? undefined : await uploadImages(gallery, "offers");
  await updateDoc(doc(db, "offers", id), {
    ...data,
    ...(images === undefined ? {} : { images, image: images[0] || "" }),
  });
}

export async function deleteOffer(id) {
  await deleteDoc(doc(db, "offers", id));
}

export async function toggleOfferActive(id, isActive) {
  await updateDoc(doc(db, "offers", id), { isActive });
}
