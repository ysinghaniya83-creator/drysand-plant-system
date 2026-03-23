"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { LooseSale, BagSale, PurchaseRegisterEntry, ExpenseEntry } from "@/types";
import { collectionListener } from "@/lib/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tsToMonthKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function tsToDayKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function dayLabel(key: string) {
    const [y, m, d] = key.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function inr(n: number) {
    return "₹" + n.toLocaleString("en-IN");
}

// ─── Row types ───────────────────────────────────────────────────────────────

interface ProfitRow {
    key: string;
    label: string;
    looseSalesAmt: number;   // sale amount only (excl. transport)
    bagSalesAmt: number;
    totalSalesAmt: number;   // loose + bag, no transport
    transport: number;       // total transport cost charged
    totalRevenue: number;    // totalSalesAmt (revenue is sale amount; transport is pass-through)
    purchases: number;
    expenses: number;
    netProfit: number;       // totalRevenue - transport - purchases - expenses
}

// Net profit = sale amount − transport cost − purchases − expenses
// (transport charged to customer equals cost borne by us; it's a pass-through)
function buildRow(key: string, label: string, ls: LooseSale[], bs: BagSale[], pur: PurchaseRegisterEntry[], exp: ExpenseEntry[]): ProfitRow {
    const looseSalesAmt = ls.reduce((s, x) => s + x.amount, 0);
    const bagSalesAmt = bs.reduce((s, x) => s + x.amount, 0);
    const totalSalesAmt = looseSalesAmt + bagSalesAmt;
    const transport = ls.reduce((s, x) => s + (x.transportCost ?? 0), 0)
        + bs.reduce((s, x) => s + (x.transportCost ?? 0), 0);
    const purchases = pur.reduce((s, x) => s + x.amount, 0);
    const expenses = exp.reduce((s, x) => s + x.amount, 0);
    return {
        key, label,
        looseSalesAmt, bagSalesAmt, totalSalesAmt, transport,
        totalRevenue: totalSalesAmt,
        purchases, expenses,
        netProfit: totalSalesAmt - transport - purchases - expenses,
    };
}

// ─── Shared table ─────────────────────────────────────────────────────────────

function ProfitTable({ rows }: { rows: ProfitRow[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-sand-100">
            <Table>
                <TableHeader>
                    <TableRow className="bg-sand-50 border-b border-sand-100">
                        {["Period", "Loose Sales", "Bag Sales", "Sale Revenue", "Transport", "Purchases", "Expenses", "Net Profit"].map((h) => (
                            <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right first:text-left whitespace-nowrap">{h}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No data yet.</TableCell>
                        </TableRow>
                    )}
                    {rows.map((r) => (
                        <TableRow key={r.key}>
                            <TableCell className="text-sm font-medium whitespace-nowrap">{r.label}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{inr(r.looseSalesAmt)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{inr(r.bagSalesAmt)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold text-green-600">{inr(r.totalSalesAmt)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">{r.transport > 0 ? inr(r.transport) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-orange-600">{inr(r.purchases)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">{inr(r.expenses)}</TableCell>
                            <TableCell className={`text-right font-mono text-sm font-bold ${r.netProfit >= 0 ? "text-emerald-600" : "text-red-700"}`}>{inr(r.netProfit)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Grade breakdown ─────────────────────────────────────────────────────────

interface GradeRow {
    grade: string;
    looseTons: number;
    bagTons: number;
    revenue: number;
    transport: number;
    invoices: number;
}

function GradeTable({ looseSales, bagSales }: { looseSales: LooseSale[]; bagSales: BagSale[] }) {
    const gradeMap = new Map<string, GradeRow>();

    for (const s of looseSales) {
        const key = s.itemName || "Unknown";
        const prev = gradeMap.get(key) ?? { grade: key, looseTons: 0, bagTons: 0, revenue: 0, transport: 0, invoices: 0 };
        gradeMap.set(key, { ...prev, looseTons: prev.looseTons + s.netWeightTons, revenue: prev.revenue + s.amount, transport: prev.transport + (s.transportCost ?? 0), invoices: prev.invoices + 1 });
    }

    for (const s of bagSales) {
        const key = s.gradeName || "Unknown";
        const prev = gradeMap.get(key) ?? { grade: key, looseTons: 0, bagTons: 0, revenue: 0, transport: 0, invoices: 0 };
        gradeMap.set(key, { ...prev, bagTons: prev.bagTons + s.totalWeightTons, revenue: prev.revenue + s.amount, transport: prev.transport + (s.transportCost ?? 0), invoices: prev.invoices + 1 });
    }

    const rows = Array.from(gradeMap.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    return (
        <div className="overflow-x-auto rounded-2xl border border-sand-100">
            <Table>
                <TableHeader>
                    <TableRow className="bg-sand-50 border-b border-sand-100">
                        {["Grade / Item", "Loose (T)", "Bag (T)", "Sale Revenue", "Transport", "Invoices", "% of Revenue"].map((h) => (
                            <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right first:text-left whitespace-nowrap">{h}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No sales data yet.</TableCell>
                        </TableRow>
                    )}
                    {rows.map((r) => (
                        <TableRow key={r.grade}>
                            <TableCell className="text-sm font-medium">{r.grade}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{r.looseTons > 0 ? r.looseTons.toFixed(3) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{r.bagTons > 0 ? r.bagTons.toFixed(3) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold text-green-600">{inr(r.revenue)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">{r.transport > 0 ? inr(r.transport) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{r.invoices}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-gray-500">
                                {totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) + "%" : "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ rows }: { rows: ProfitRow[] }) {
    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalTransport = rows.reduce((s, r) => s + r.transport, 0);
    const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
    const netProfit = rows.reduce((s, r) => s + r.netProfit, 0);

    const cards = [
        { label: "Sale Revenue", value: totalRevenue, color: "text-green-600" },
        { label: "Transport Cost", value: totalTransport, color: "text-blue-600" },
        { label: "Purchases", value: totalPurchases, color: "text-orange-600" },
        { label: "Expenses", value: totalExpenses, color: "text-red-600" },
        { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "text-emerald-700" : "text-red-700" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cards.map((c) => (
                <div key={c.label} className="border border-sand-100 rounded-xl p-4 space-y-1 bg-white">
                    <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                    <p className={`text-lg font-bold font-mono ${c.color}`}>{inr(c.value)}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: "monthly", label: "Monthly" },
    { id: "daily", label: "Daily" },
    { id: "grade", label: "By Grade" },
] as const;
type Tab = (typeof TABS)[number]["id"];

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfitSummary() {
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [tab, setTab] = useState<Tab>("monthly");

    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);

    // Monthly rows
    const monthSet = new Set<string>();
    looseSales.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    bagSales.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    purchases.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    expenses.forEach((x) => monthSet.add(tsToMonthKey(x.date)));

    const monthRows: ProfitRow[] = Array.from(monthSet).sort().reverse().map((key) =>
        buildRow(
            key, monthLabel(key),
            looseSales.filter((x) => tsToMonthKey(x.date) === key),
            bagSales.filter((x) => tsToMonthKey(x.date) === key),
            purchases.filter((x) => tsToMonthKey(x.date) === key),
            expenses.filter((x) => tsToMonthKey(x.date) === key),
        )
    );

    // Daily rows
    const daySet = new Set<string>();
    looseSales.forEach((x) => daySet.add(tsToDayKey(x.date)));
    bagSales.forEach((x) => daySet.add(tsToDayKey(x.date)));
    purchases.forEach((x) => daySet.add(tsToDayKey(x.date)));
    expenses.forEach((x) => daySet.add(tsToDayKey(x.date)));

    const dayRows: ProfitRow[] = Array.from(daySet).sort().reverse().map((key) =>
        buildRow(
            key, dayLabel(key),
            looseSales.filter((x) => tsToDayKey(x.date) === key),
            bagSales.filter((x) => tsToDayKey(x.date) === key),
            purchases.filter((x) => tsToDayKey(x.date) === key),
            expenses.filter((x) => tsToDayKey(x.date) === key),
        )
    );

    const activeRows = tab === "monthly" ? monthRows : tab === "daily" ? dayRows : monthRows;

    return (
        <div className="space-y-5">
            <SummaryCards rows={tab === "grade" ? monthRows : activeRows} />

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-sand-100">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                            tab === t.id
                                ? "border-brand-600 text-brand-700 bg-white"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "monthly" && <ProfitTable rows={monthRows} />}
            {tab === "daily" && <ProfitTable rows={dayRows} />}
            {tab === "grade" && <GradeTable looseSales={looseSales} bagSales={bagSales} />}

            <p className="text-xs text-muted-foreground">
                Net Profit = Sale Revenue − Transport Cost − Purchases − Expenses. Transport cost is billed to customers but deducted as a pass-through cost.
            </p>
        </div>
    );
}
