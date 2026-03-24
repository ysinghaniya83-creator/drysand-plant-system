"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Factory, Scale, TrendingUp, BarChart2, Package } from "lucide-react";

const features = [
    { icon: Scale, label: "Weighbridge" },
    { icon: Factory, label: "Production" },
    { icon: TrendingUp, label: "Sales" },
    { icon: BarChart2, label: "Reports" },
    { icon: Package, label: "Inventory" },
];

export default function LoginPage() {
    const { signInWithGoogle, user } = useAuth();
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) router.push("/dashboard");
    }, [user, router]);

    async function handleGoogleSignIn() {
        setError("");
        setLoading(true);
        try {
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "";
            if (!msg.includes("popup-closed")) {
                setError("Sign-in failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-[#1a0900] p-12 relative overflow-hidden animate-slide-in-left">
                {/* Background gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-brand-600/15 blur-3xl" />
                    <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-brand-400/8 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-brand-800/20 blur-3xl" />
                </div>

                {/* Logo */}
                <div className="relative flex items-center gap-3 animate-slide-up delay-150">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
                        <Factory size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-[15px] leading-tight">Dry Sand Plant</p>
                        <p className="text-white/35 text-[11px] font-medium">Management System</p>
                    </div>
                </div>

                {/* Center content */}
                <div className="relative space-y-8">
                    <div className="space-y-4 animate-slide-up delay-225">
                        <div className="inline-flex items-center gap-2 bg-brand-600/15 border border-brand-600/20 rounded-full px-3 py-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                            <span className="text-brand-300 text-[11px] font-semibold uppercase tracking-wider">Live Operations</span>
                        </div>
                        <h1 className="text-[2.1rem] font-bold text-white leading-[1.2] tracking-tight">
                            Complete plant<br />operations,<br />in one place.
                        </h1>
                        <p className="text-white/45 text-[14px] leading-relaxed max-w-xs">
                            Weighbridge, production, sales, accounts and reports — all live and connected.
                        </p>
                    </div>

                    {/* Feature icons */}
                    <div className="flex flex-wrap gap-2.5 animate-slide-up delay-375">
                        {features.map(({ icon: Icon, label }, i) => (
                            <div
                                key={label}
                                className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 animate-slide-up"
                                style={{ animationDelay: `${375 + i * 60}ms` }}
                            >
                                <Icon size={13} className="text-white/50" />
                                <span className="text-[12px] text-white/55 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom note */}
                <p className="relative text-white/20 text-[11px] font-medium">
                    Access is restricted to authorised users only.
                </p>
            </div>

            {/* Right panel — sign in */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 bg-sand-50 animate-slide-in-right">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-3 mb-10">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30">
                        <Factory size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-[15px] leading-tight text-gray-900">Dry Sand Plant</p>
                        <p className="text-muted-foreground text-[11px]">Management System</p>
                    </div>
                </div>

                {/* Sign-in card */}
                <div className="w-full max-w-[360px] animate-scale-in delay-150">
                    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm shadow-black/5 p-8 space-y-7">
                        {/* Header */}
                        <div className="space-y-1.5">
                            <h2 className="text-[1.4rem] font-bold text-gray-900 tracking-tight">Welcome back</h2>
                            <p className="text-[13.5px] text-muted-foreground leading-snug">
                                Sign in to continue to your dashboard
                            </p>
                        </div>

                        {/* Google button */}
                        <div className="space-y-3">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="group w-full flex items-center justify-center gap-3 rounded-xl border border-sand-200 bg-white px-4 py-3 text-[14px] font-semibold text-gray-800 shadow-sm transition-all duration-150 hover:border-brand-400 hover:bg-sand-50 hover:shadow disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                            >
                                {!loading && (
                                    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                    </svg>
                                )}
                                {loading && (
                                    <svg className="animate-spin h-4 w-4 text-brand-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                )}
                                {loading ? "Signing in…" : "Continue with Google"}
                            </button>

                            {error && (
                                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3">
                                    <svg className="h-4 w-4 shrink-0 text-red-500 mt-px" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-[13px] text-red-700 font-medium">{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer note */}
                        <p className="text-center text-[12px] text-muted-foreground leading-relaxed">
                            New users require admin approval<br />before accessing the system.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
