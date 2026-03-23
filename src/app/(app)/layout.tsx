"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Factory } from "lucide-react";

// Map routes to readable page titles
const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/weighbridge": "Weighbridge",
    "/purchase": "Purchase & Bills",
    "/production": "Production",
    "/bagging": "Bagging",
    "/sales": "Sales",
    "/expenses": "Expenses",
    "/accounts": "Accounts",
    "/profit": "Profit",
    "/closing-stock": "Closing Stock",
    "/vehicles": "Vehicle History",
    "/employees": "Employees",
    "/reports": "Reports",
    "/masters": "Masters",
    "/users": "User Roles",
};

function PageTitle() {
    const pathname = usePathname();
    const match = Object.keys(PAGE_TITLES).find(
        (k) => pathname === k || pathname.startsWith(k + "/")
    );
    return <>{match ? PAGE_TITLES[match] : "Dry Sand Plant"}</>;
}

function StatusScreen({ emoji, title, body, onSignOut }: { emoji: string; title: string; body: string; onSignOut: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center max-w-sm space-y-4 p-10 bg-card rounded-2xl shadow-sm border">
                <div className="text-5xl">{emoji}</div>
                <h1 className="text-lg font-semibold">{title}</h1>
                <p className="text-sm text-muted-foreground">{body}</p>
                <Button variant="outline" size="sm" onClick={onSignOut}>Sign out &amp; retry</Button>
            </div>
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, appUser, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    async function handleSignOut() { await signOut(); router.push("/login"); }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                        <Factory size={20} className="text-white" />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    if (!appUser) {
        return <StatusScreen emoji="⚠️" title="Profile not found" body="Could not load your user profile. Make sure Firestore rules are published, then sign out and try again." onSignOut={handleSignOut} />;
    }
    if (appUser.status === "pending") {
        return <StatusScreen emoji="⏳" title="Access Pending" body={`Your account (${appUser.email}) is waiting for admin approval. You'll be notified once access is granted.`} onSignOut={handleSignOut} />;
    }
    if (appUser.status === "disabled") {
        return <StatusScreen emoji="🚫" title="Account Disabled" body="Your account has been disabled. Please contact the administrator." onSignOut={handleSignOut} />;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <AppSidebar />
            {/* Main content area */}
            <div className="flex-1 flex flex-col ml-60 min-h-screen">
                {/* Top header */}
                <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-6 shrink-0 shadow-sm">
                    <h2 className="text-[15px] font-semibold text-foreground">
                        <PageTitle />
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="hidden sm:block">
                            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <span className="font-medium text-foreground">{appUser.name ?? appUser.email}</span>
                    </div>
                </header>
                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
