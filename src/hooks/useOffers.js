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

export async function addOffer(offer, imageFile) {
  let imageUrl = offer.image || "";

  if (imageFile) {
    const storageRef = ref(storage, `offers/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  const docRef = await addDoc(collection(db, "offers"), {
    ...offer,
    image: imageUrl,
  });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateOffer(id, data, imageFile) {
  let imageUrl = data.image;

  if (imageFile) {
    const storageRef = ref(storage, `offers/${id}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  await updateDoc(doc(db, "offers", id), {
    ...data,
    ...(imageUrl !== undefined ? { image: imageUrl } : {}),
  });
}

export async function deleteOffer(id) {
  await deleteDoc(doc(db, "offers", id));
}

export async function toggleOfferActive(id, isActive) {
  await updateDoc(doc(db, "offers", id), { isActive });
}
