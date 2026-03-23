"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry, LooseSale, BagSale, ProductionEntry, PurchaseRegisterEntry, ExpenseEntry, BaggingEntry } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { ArrowDownToLine, TrendingUp, Factory, Package, Banknote, ShoppingCart, Receipt, BarChart2 } from "lucide-react";

function isToday(ts: Timestamp) {
    const d = ts.toDate();
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function isThisMonth(ts: Timestamp) {
    const d = ts.toDate();
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-card rounded-xl border p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon size={22} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[13px] font-semibold text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold text-foreground leading-tight tabular-nums">{value}</p>
                {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
            </div>
        </div>
    );
}

export function DashboardOverview() {
    const [inwards, setInwards] = useState<InwardEntry[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [productions, setProductions] = useState<ProductionEntry[]>([]);
    const [baggings, setBaggings] = useState<BaggingEntry[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);

    useEffect(() => collectionListener<InwardEntry>("inwardEntries", "date", setInwards), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<ProductionEntry>("productions", "date", setProductions), []);
    useEffect(() => collectionListener<BaggingEntry>("baggings", "date", setBaggings), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);

    const todayInward = inwards.filter((r) => isToday(r.date));
    const todayInwardTons = todayInward.reduce((s, r) => s + r.netWeight, 0);

    const todayProduction = productions.filter((r) => isToday(r.date));
    const todayProdTons = todayProduction.reduce((s, r) => s + r.outputs.reduce((x, o) => x + o.quantity, 0), 0);

    const todayLooseSales = looseSales.filter((r) => isToday(r.date));
    const todayBagSales = bagSales.filter((r) => isToday(r.date));
    const todaySaleAmount = todayLooseSales.reduce((s, r) => s + r.totalAmount, 0) + todayBagSales.reduce((s, r) => s + r.totalAmount, 0);

    const todayBagging = baggings.filter((r) => isToday(r.date));
    const todayBags = todayBagging.reduce((s, r) => s + r.numberOfBags, 0);

    const monthPurchase = purchases.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthRevenue = looseSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.totalAmount, 0)
        + bagSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.totalAmount, 0);
    const monthExpenses = expenses.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthProfit = monthRevenue - monthPurchase - monthExpenses;

    const recentInward = [...inwards].sort((a, b) => b.date.seconds - a.date.seconds).slice(0, 6);

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-[15px] text-muted-foreground mt-1">{today}</p>
            </div>

            {/* Today */}
            <div>
                <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Today</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Inward" value={`${todayInwardTons.toFixed(2)} T`} sub={`${todayInward.length} vehicles`} icon={ArrowDownToLine} color="bg-blue-500" />
                    <StatCard label="Production" value={`${todayProdTons.toFixed(2)} T`} sub={`${todayProduction.length} batches`} icon={Factory} color="bg-violet-500" />
                    <StatCard label="Sales" value={`₹${todaySaleAmount.toLocaleString("en-IN")}`} sub={`${todayLooseSales.length + todayBagSales.length} invoices`} icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard label="Bagging" value={`${todayBags.toLocaleString("en-IN")} bags`} sub={`${todayBagging.length} batches`} icon={Package} color="bg-orange-500" />
                </div>
            </div>

            {/* This month */}
            <div>
                <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">This Month</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Revenue" value={`₹${monthRevenue.toLocaleString("en-IN")}`} icon={Banknote} color="bg-emerald-600" />
                    <StatCard label="Purchases" value={`₹${monthPurchase.toLocaleString("en-IN")}`} icon={ShoppingCart} color="bg-amber-500" />
                    <StatCard label="Expenses" value={`₹${monthExpenses.toLocaleString("en-IN")}`} icon={Receipt} color="bg-red-500" />
                    <StatCard label="Net Profit" value={`₹${monthProfit.toLocaleString("en-IN")}`} icon={BarChart2} color={monthProfit >= 0 ? "bg-indigo-600" : "bg-red-600"} />
                </div>
            </div>

            {/* Recent inward */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-[15px] font-bold text-foreground">Recent Inward Entries</h2>
                </div>
                {recentInward.length === 0 ? (
                    <div className="text-center py-12 text-[15px] text-muted-foreground">No inward entries yet.</div>
                ) : (
                    <div className="divide-y">
                        {recentInward.map((r) => (
                            <div key={r.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                                    <ArrowDownToLine size={17} className="text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[15px] font-bold tabular-nums">{r.vehicleNumber}</span>
                                    <span className="mx-2 text-muted-foreground/40">·</span>
                                    <span className="text-[14px] text-muted-foreground">{r.partyName}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[12px] bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 capitalize font-semibold">{r.materialType}</span>
                                    <span className="text-[15px] font-bold text-blue-600 tabular-nums">{r.netWeight.toFixed(2)} T</span>
                                    <span className="text-[13px] text-muted-foreground">{r.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

