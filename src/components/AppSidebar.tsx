"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navSections = [
    {
        label: "Operations",
        items: [
            { href: "/dashboard", label: "Dashboard", num: "14" },
            { href: "/weighbridge", label: "Weighbridge", num: "03" },
            { href: "/purchase", label: "Purchase & Bills", num: "04" },
            { href: "/production", label: "Production", num: "05" },
            { href: "/bagging", label: "Bagging", num: "06" },
            { href: "/sales", label: "Sales", num: "07" },
            { href: "/expenses", label: "Expenses", num: "08" },
        ],
    },
    {
        label: "Finance & Stock",
        items: [
            { href: "/accounts", label: "Accounts", num: "09" },
            { href: "/profit", label: "Profit", num: "10" },
            { href: "/closing-stock", label: "Closing Stock", num: "11" },
        ],
    },
    {
        label: "Records",
        items: [
            { href: "/vehicles", label: "Vehicle History", num: "12" },
            { href: "/employees", label: "Employees", num: "13" },
            { href: "/reports", label: "Reports", num: "15" },
        ],
    },
    {
        label: "Settings",
        items: [
            { href: "/masters", label: "Masters", num: "02" },
            { href: "/users", label: "User Roles", num: "16" },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { appUser, signOut } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    // Real-time count of pending users (admin only)
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

    return (
        <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-gray-900 text-white">
            {/* Logo */}
            <div className="px-5 py-6 border-b border-white/10">
                <span className="text-2xl block mb-1">🏭</span>
                <h1 className="font-mono text-xs font-semibold text-orange-400 uppercase tracking-widest leading-tight">
                    Dry Sand Plant<br />Mgmt System
                </h1>
                <p className="font-mono text-[10px] text-white/30 mt-1">Version 4.0</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-0">
                {navSections.map((section) => (
                    <div key={section.label} className="py-1">
                        <p className="font-mono text-[9px] font-semibold text-white/25 uppercase tracking-widest px-5 py-2">
                            {section.label}
                        </p>
                        {section.items.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + "/");
                            const isUsers = item.href === "/users";
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2 text-xs border-l-2 transition-colors",
                                        active
                                            ? "border-orange-500 text-white bg-white/5"
                                            : "border-transparent text-white/50 hover:text-white hover:bg-white/5 hover:border-orange-500"
                                    )}
                                >
                                    <span className="font-mono text-[10px] text-white/20 w-5">{item.num}</span>
                                    <span className="flex-1">{item.label}</span>
                                    {isUsers && appUser?.role === "admin" && pendingCount > 0 && (
                                        <span className="bg-orange-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <Separator className="bg-white/10" />

            {/* User */}
            <div className="px-5 py-4 space-y-2">
                <p className="text-xs text-white/50 truncate">{appUser?.name ?? appUser?.email ?? "User"}</p>
                <p className="font-mono text-[9px] text-orange-400 uppercase">{appUser?.role}</p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white/40 hover:text-white px-0 h-7 text-xs"
                    onClick={handleSignOut}
                >
                    Sign out
                </Button>
            </div>
        </aside>
    );
}
