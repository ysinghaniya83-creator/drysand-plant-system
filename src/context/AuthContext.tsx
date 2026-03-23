"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    User,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";

const ADMIN_EMAIL = "ysinghaniya83@gmail.com";

interface AuthContextType {
    user: User | null;
    appUser: AppUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    appUser: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    refreshAppUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsub: (() => void) | null = null;

        const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
            // Tear down previous profile listener if user changed
            profileUnsub?.();
            profileUnsub = null;

            setUser(firebaseUser);

            if (firebaseUser) {
                const userRef = doc(db, "users", firebaseUser.uid);

                // Create profile on first sign-in
                try {
                    const snap = await getDoc(userRef);
                    if (!snap.exists()) {
                        const isAdmin = firebaseUser.email === ADMIN_EMAIL;
                        const profile: Omit<AppUser, "approvedAt" | "approvedBy"> = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email!,
                            name: firebaseUser.displayName || firebaseUser.email!,
                            photoURL: firebaseUser.photoURL ?? undefined,
                            role: isAdmin ? "admin" : "viewer",
                            status: isAdmin ? "active" : "pending",
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            createdAt: serverTimestamp() as any,
                        };
                        await setDoc(userRef, profile);
                    }
                } catch (err) {
                    console.error("Profile init failed:", err);
                    setAppUser(null);
                    setLoading(false);
                    return;
                }

                // Real-time listener keeps profile in sync + uses IndexedDB cache on next load
                profileUnsub = onSnapshot(
                    userRef,
                    (snap) => {
                        setAppUser(snap.exists() ? (snap.data() as AppUser) : null);
                        setLoading(false);
                    },
                    (err) => {
                        console.error("Profile listener error:", err);
                        setAppUser(null);
                        setLoading(false);
                    }
                );
            } else {
                setAppUser(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsub();
            profileUnsub?.();
        };
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
        // onAuthStateChanged handles the rest
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const refreshAppUser = async () => {
        if (!user) return;
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setAppUser(snap.data() as AppUser);
    };

    return (
        <AuthContext.Provider value={{ user, appUser, loading, signInWithGoogle, signOut, refreshAppUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
