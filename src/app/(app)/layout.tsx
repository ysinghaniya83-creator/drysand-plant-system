"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, appUser, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (!user) return null;

    // Signed in but Firestore profile couldn't load (rules not set yet, or error)
    if (!appUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-sm space-y-3 p-8">
                    <div className="text-4xl">⚠️</div>
                    <h1 className="text-lg font-bold">Profile not found</h1>
                    <p className="text-sm text-muted-foreground">
                        Could not load your user profile from the database.<br />
                        Make sure Firestore security rules are published, then sign out and sign in again.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => { await signOut(); router.push("/login"); }}
                    >
                        Sign out & retry
                    </Button>
                </div>
            </div>
        );
    }
    if (appUser?.status === "pending") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-sm space-y-4 p-8">
                    <div className="text-5xl">⏳</div>
                    <h1 className="text-xl font-bold">Access Pending</h1>
                    <p className="text-sm text-muted-foreground">
                        Your account (<strong>{appUser.email}</strong>) is waiting for admin approval.
                        The admin has been notified and will assign your access level shortly.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => { await signOut(); router.push("/login"); }}
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        );
    }

    // User signed in but account is disabled
    if (appUser?.status === "disabled") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-sm space-y-4 p-8">
                    <div className="text-5xl">🚫</div>
                    <h1 className="text-xl font-bold">Account Disabled</h1>
                    <p className="text-sm text-muted-foreground">
                        Your account has been disabled. Please contact the admin.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => { await signOut(); router.push("/login"); }}
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <AppSidebar />
            <main className="flex-1 ml-56 p-6 overflow-auto">{children}</main>
        </div>
    );
}
