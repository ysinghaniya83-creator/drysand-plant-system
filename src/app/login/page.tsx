"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Factory } from "lucide-react";

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
            <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0f172a] p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
                </div>

                {/* Logo */}
                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
                        <Factory size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-semibold text-[15px] leading-tight">Dry Sand Plant</p>
                        <p className="text-white/40 text-[11px]">Management System v4.0</p>
                    </div>
                </div>

                {/* Center content */}
                <div className="relative space-y-6">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Complete plant<br />operations in one place.
                        </h1>
                        <p className="text-white/50 text-[15px] leading-relaxed max-w-sm">
                            Weighbridge, production, sales, accounts, and reports — all live, all connected.
                        </p>
                    </div>

                    {/* Feature chips */}
                    <div className="flex flex-wrap gap-2">
                        {["Weighbridge", "Production", "Sales", "Accounts", "Reports", "Employees"].map((f) => (
                            <span key={f} className="inline-flex items-center rounded-full bg-white/8 px-3 py-1 text-[12px] text-white/60 font-medium border border-white/10">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom note */}
                <p className="relative text-white/25 text-[11px]">Access is restricted to authorised users only.</p>
            </div>

            {/* Right panel — sign in */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 bg-background">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-3 mb-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                        <Factory size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-[15px] leading-tight">Dry Sand Plant</p>
                        <p className="text-muted-foreground text-[11px]">Management System v4.0</p>
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-8">
                    <div className="space-y-1.5">
                        <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                        <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="group relative w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-medium text-foreground shadow-sm transition-all duration-150 hover:bg-accent hover:border-indigo-300 hover:shadow-md disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            {!loading && (
                                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                            )}
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-indigo-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {loading ? "Signing in…" : "Continue with Google"}
                        </button>

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                                <svg className="h-4 w-4 shrink-0 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        New users require admin approval before accessing the system.
                    </p>
                </div>
            </div>
        </div>
    );
}
