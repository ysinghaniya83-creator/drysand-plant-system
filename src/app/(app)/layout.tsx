"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Factory } from "lucide-react";
import { canAccessRoute } from "@/lib/permissions";

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

function UserAvatar({ name, email }: { name?: string | null; email?: string | null }) {
    const initials = (name ?? email ?? "U")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-[12px] font-bold shadow-sm">
            {initials}
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, appUser, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    async function handleSignOut() { await signOut(); router.push("/login"); }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30">
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

    // Route-level access control — redirect to dashboard if role cannot access this page
    if (!canAccessRoute(appUser.role, pathname)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center max-w-sm space-y-4 p-10 bg-card rounded-2xl shadow-sm border">
                    <div className="text-4xl">🔒</div>
                    <h1 className="text-lg font-semibold">Access Restricted</h1>
                    <p className="text-sm text-muted-foreground">
                        Your role <span className="font-semibold capitalize">({appUser.role})</span> does not have permission to view this page.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    return (
        <div className="flex min-h-screen bg-background">
            <AppSidebar />
            {/* Main content area */}
            <div className="flex-1 flex flex-col ml-60 min-h-screen">
                {/* Top header */}
                <header className="sticky top-0 z-40 flex h-13 items-center justify-between border-b border-sand-100 bg-white/95 backdrop-blur-sm px-6 shrink-0 gap-4">
                    {/* Page title */}
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-[15px] font-bold text-foreground tracking-tight truncate">
                            <PageTitle />
                        </h2>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Date */}
                        <span className="hidden sm:block text-[12.5px] text-muted-foreground font-medium bg-sand-50 px-3 py-1 rounded-full border border-sand-100">
                            {dateStr}
                        </span>

                        {/* Divider */}
                        <div className="h-4 w-px bg-sand-200 hidden sm:block" />

                        {/* User info */}
                        <div className="flex items-center gap-2">
                            <UserAvatar name={appUser.name} email={appUser.email} />
                            <div className="hidden md:flex flex-col leading-none">
                                <span className="text-[13px] font-semibold text-foreground">
                                    {appUser.name ?? appUser.email}
                                </span>
                                <span className="text-[11px] text-brand-600 capitalize font-medium">{appUser.role}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
