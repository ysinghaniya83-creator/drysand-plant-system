"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Scale,
    ShoppingCart,
    Factory,
    Package,
    TrendingUp,
    Receipt,
    Wallet,
    BarChart2,
    Archive,
    Truck,
    Users,
    FileText,
    Settings,
    UserCog,
    LogOut,
    type LucideIcon,
} from "lucide-react";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    isUsers?: boolean;
}

interface NavSection {
    label: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        label: "Operations",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/weighbridge", label: "Weighbridge", icon: Scale },
            { href: "/purchase", label: "Purchase & Bills", icon: ShoppingCart },
            { href: "/production", label: "Production", icon: Factory },
            { href: "/bagging", label: "Bagging", icon: Package },
            { href: "/sales", label: "Sales", icon: TrendingUp },
            { href: "/expenses", label: "Expenses", icon: Receipt },
        ],
    },
    {
        label: "Finance & Stock",
        items: [
            { href: "/accounts", label: "Accounts", icon: Wallet },
            { href: "/profit", label: "Profit", icon: BarChart2 },
            { href: "/closing-stock", label: "Closing Stock", icon: Archive },
        ],
    },
    {
        label: "Records",
        items: [
            { href: "/vehicles", label: "Vehicle History", icon: Truck },
            { href: "/employees", label: "Employees", icon: Users },
            { href: "/reports", label: "Reports", icon: FileText },
        ],
    },
    {
        label: "Settings",
        items: [
            { href: "/masters", label: "Masters", icon: Settings },
            { href: "/users", label: "User Roles", icon: UserCog, isUsers: true },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { appUser, signOut } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (appUser?.role !== "admin") return;
        const q = query(collection(db, "users"), where("status", "==", "pending"));
        const unsub = onSnapshot(q, (snap) => setPendingCount(snap.size));
        return unsub;
    }, [appUser?.role]);

    async function handleSignOut() {
        await signOut();
        router.push("/login");
    }

    const initials = (appUser?.name ?? appUser?.email ?? "U")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0f172a] text-white select-none">
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-white/8">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shrink-0 shadow-lg shadow-indigo-900/40">
                    <Factory size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-tight truncate">Dry Sand Plant</p>
                    <p className="text-[10px] text-white/35 font-medium tracking-wide">Management v4.0</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
                {navSections.map((section) => (
                    <div key={section.label}>
                        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1">
                            {section.label}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                                            active
                                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/30"
                                                : "text-white/50 hover:bg-white/6 hover:text-white/90"
                                        )}
                                    >
                                        <Icon
                                            size={15}
                                            className={cn(
                                                "shrink-0 transition-colors",
                                                active ? "text-white" : "text-white/35 group-hover:text-white/70"
                                            )}
                                        />
                                        <span className="flex-1 leading-none">{item.label}</span>
                                        {item.isUsers && appUser?.role === "admin" && pendingCount > 0 && (
                                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white leading-none">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-white/8 px-3 py-3">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-bold">
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-white/80 truncate leading-tight">
                            {appUser?.name ?? appUser?.email ?? "User"}
                        </p>
                        <p className="text-[10px] text-indigo-400 capitalize font-medium">{appUser?.role}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        title="Sign out"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/25 hover:bg-white/8 hover:text-white/70 transition-colors"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
