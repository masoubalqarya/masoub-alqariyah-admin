"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile({ uid: userDoc.id, ...userDoc.data() });
          } else {
            // User exists in Auth but not in Firestore — treat as admin (legacy)
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.email,
              role: "admin",
              isActive: true,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Fetch profile immediately after login
    const userDoc = await getDoc(doc(db, "users", credential.user.uid));
    if (userDoc.exists()) {
      const profile = { uid: userDoc.id, ...userDoc.data() };
      // Block "user" role from signing in
      if (profile.role === "user") {
        await signOut(auth);
        throw new Error("ACCESS_DENIED");
      }
      if (!profile.isActive) {
        await signOut(auth);
        throw new Error("ACCOUNT_DISABLED");
      }
      setUserProfile(profile);
    } else {
      // Legacy user without profile — treat as admin
      setUserProfile({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.email,
        role: "admin",
        isActive: true,
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
