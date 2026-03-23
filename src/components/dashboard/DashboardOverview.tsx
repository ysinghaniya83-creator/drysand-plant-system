"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry, LooseSale, BagSale, ProductionEntry, PurchaseRegisterEntry, ExpenseEntry, BaggingEntry } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface Tile {
    label: string;
    value: string;
    sub?: string;
    color?: string;
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

    // Today's figures
    const todayInward = inwards.filter((r) => isToday(r.date));
    const todayInwardTons = todayInward.reduce((s, r) => s + r.netWeight, 0);
    const todayInwardVehicles = todayInward.length;

    const todayProduction = productions.filter((r) => isToday(r.date));
    const todayProdTons = todayProduction.reduce((s, r) => s + r.outputs.reduce((x, o) => x + o.quantity, 0), 0);

    const todayLooseSales = looseSales.filter((r) => isToday(r.date));
    const todayBagSales = bagSales.filter((r) => isToday(r.date));
    const todaySaleAmount = todayLooseSales.reduce((s, r) => s + r.totalAmount, 0) + todayBagSales.reduce((s, r) => s + r.totalAmount, 0);

    const todayBagging = baggings.filter((r) => isToday(r.date));
    const todayBags = todayBagging.reduce((s, r) => s + r.numberOfBags, 0);

    // Month figures
    const monthPurchase = purchases.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthRevenue = looseSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.totalAmount, 0)
        + bagSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.totalAmount, 0);
    const monthExpenses = expenses.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthProfit = monthRevenue - monthPurchase - monthExpenses;

    const tiles: Tile[] = [
        { label: "Today's Inward", value: `${todayInwardTons.toFixed(2)} T`, sub: `${todayInwardVehicles} vehicle${todayInwardVehicles !== 1 ? "s" : ""}`, color: "text-blue-600" },
        { label: "Today's Production", value: `${todayProdTons.toFixed(2)} T`, sub: `${todayProduction.length} batch${todayProduction.length !== 1 ? "es" : ""}`, color: "text-purple-600" },
        { label: "Today's Sales", value: `₹${todaySaleAmount.toLocaleString("en-IN")}`, sub: `${todayLooseSales.length + todayBagSales.length} invoice${(todayLooseSales.length + todayBagSales.length) !== 1 ? "s" : ""}`, color: "text-green-600" },
        { label: "Today's Bagging", value: `${todayBags.toLocaleString("en-IN")} bags`, sub: `${todayBagging.length} batch${todayBagging.length !== 1 ? "es" : ""}`, color: "text-orange-600" },
        { label: "Month Revenue", value: `₹${monthRevenue.toLocaleString("en-IN")}`, color: "text-emerald-700" },
        { label: "Month Purchases", value: `₹${monthPurchase.toLocaleString("en-IN")}`, color: "text-orange-700" },
        { label: "Month Expenses", value: `₹${monthExpenses.toLocaleString("en-IN")}`, color: "text-red-600" },
        { label: "Month Net Profit", value: `₹${monthProfit.toLocaleString("en-IN")}`, color: monthProfit >= 0 ? "text-emerald-700 font-bold" : "text-red-700 font-bold" },
    ];

    // Recent inward (last 5)
    const recentInward = [...inwards].sort((a, b) => b.date.seconds - a.date.seconds).slice(0, 5);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Live plant overview — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {tiles.map((tile) => (
                    <Card key={tile.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{tile.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-xl font-semibold font-mono ${tile.color ?? ""}`}>{tile.value}</p>
                            {tile.sub && <p className="text-xs text-muted-foreground mt-0.5">{tile.sub}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Recent Inward Entries</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentInward.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No inward entries yet.</p>
                    ) : (
                        <div className="divide-y">
                            {recentInward.map((r) => (
                                <div key={r.id} className="flex items-center justify-between py-2">
                                    <div>
                                        <span className="text-sm font-medium font-mono">{r.vehicleNumber}</span>
                                        <span className="mx-2 text-muted-foreground">—</span>
                                        <span className="text-sm">{r.partyName}</span>
                                        <span className="ml-2 text-xs text-muted-foreground capitalize">{r.materialType}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-mono font-semibold text-blue-600">{r.netWeight.toFixed(2)} T</span>
                                        <span className="ml-2 text-xs text-muted-foreground">{r.date.toDate().toLocaleDateString("en-IN")}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
