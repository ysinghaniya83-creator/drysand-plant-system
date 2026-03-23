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

function tsToMonthKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

interface MonthRow {
    key: string;
    label: string;
    looseSales: number;
    bagSales: number;
    totalRevenue: number;
    purchases: number;
    expenses: number;
    netProfit: number;
}

export function ProfitSummary() {
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);

    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);

    const rows: MonthRow[] = [];
    const monthSet = new Set<string>();

    looseSales.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    bagSales.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    purchases.forEach((x) => monthSet.add(tsToMonthKey(x.date)));
    expenses.forEach((x) => monthSet.add(tsToMonthKey(x.date)));

    const sortedMonths = Array.from(monthSet).sort().reverse();

    for (const key of sortedMonths) {
        const ls = looseSales.filter((x) => tsToMonthKey(x.date) === key).reduce((s, x) => s + x.totalAmount, 0);
        const bs = bagSales.filter((x) => tsToMonthKey(x.date) === key).reduce((s, x) => s + x.totalAmount, 0);
        const pur = purchases.filter((x) => tsToMonthKey(x.date) === key).reduce((s, x) => s + x.amount, 0);
        const exp = expenses.filter((x) => tsToMonthKey(x.date) === key).reduce((s, x) => s + x.amount, 0);
        const totalRevenue = ls + bs;
        rows.push({ key, label: monthLabel(key), looseSales: ls, bagSales: bs, totalRevenue, purchases: pur, expenses: exp, netProfit: totalRevenue - pur - exp });
    }

    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
    const netProfit = rows.reduce((s, r) => s + r.netProfit, 0);

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Revenue", value: totalRevenue, color: "text-green-600" },
                    { label: "Total Purchases", value: totalPurchases, color: "text-orange-600" },
                    { label: "Total Expenses", value: totalExpenses, color: "text-red-600" },
                    { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "text-emerald-700" : "text-red-700" },
                ].map((c) => (
                    <div key={c.label} className="border rounded-lg p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className={`text-xl font-bold font-mono ${c.color}`}>₹{c.value.toLocaleString("en-IN")}</p>
                    </div>
                ))}
            </div>

            {/* Monthly breakdown */}
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            {["Month", "Loose Sales", "Bag Sales", "Revenue", "Purchases", "Expenses", "Net Profit"].map((h) => (
                                <TableHead key={h} className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right first:text-left">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No data yet.</TableCell>
                            </TableRow>
                        )}
                        {rows.map((r) => (
                            <TableRow key={r.key}>
                                <TableCell className="text-sm font-medium">{r.label}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{r.looseSales.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{r.bagSales.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold text-green-600">₹{r.totalRevenue.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-orange-600">₹{r.purchases.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-red-600">₹{r.expenses.toLocaleString("en-IN")}</TableCell>
                                <TableCell className={`text-right font-mono text-sm font-bold ${r.netProfit >= 0 ? "text-emerald-600" : "text-red-700"}`}>₹{r.netProfit.toLocaleString("en-IN")}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <p className="text-xs text-muted-foreground">All expense entries are included in the profit calculation.</p>
        </div>
    );
}
