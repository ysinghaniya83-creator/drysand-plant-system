"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry, PurchaseRegisterEntry, LooseSale, BagSale, ExpenseEntry, Payment, BaggingEntry, ProductionEntry } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type ReportType = "inward" | "purchase" | "production" | "bagging" | "loose_sales" | "bag_sales" | "expenses" | "payments";

const REPORT_LABELS: Record<ReportType, string> = {
    inward: "Inward Register",
    purchase: "Purchase Register",
    production: "Production Report",
    bagging: "Bagging Report",
    loose_sales: "Loose Sales Register",
    bag_sales: "Bag Sales Register",
    expenses: "Expense Ledger",
    payments: "Payment Ledger",
};

function tsIn(ts: Timestamp, from: Date, to: Date) {
    const d = ts.toDate();
    return d >= from && d <= to;
}

function fmtDate(ts: Timestamp) {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(n: number) {
    return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function fmtCurrency(n: number) {
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function printTable(reportType: string, from: string, to: string) {
    window.print();
}

export function Reports() {
    const [reportType, setReportType] = useState<ReportType>("inward");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

    const [inwards, setInwards] = useState<InwardEntry[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [productions, setProductions] = useState<ProductionEntry[]>([]);
    const [baggings, setBaggings] = useState<BaggingEntry[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => collectionListener<InwardEntry>("inwardEntries", "date", setInwards), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<ProductionEntry>("productions", "date", setProductions), []);
    useEffect(() => collectionListener<BaggingEntry>("baggings", "date", setBaggings), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);
    useEffect(() => collectionListener<Payment>("payments", "date", setPayments), []);

    const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
    const to = new Date(toDate); to.setHours(23, 59, 59, 999);

    const filteredInwards = inwards.filter((r) => tsIn(r.date, from, to));
    const filteredPurchases = purchases.filter((r) => tsIn(r.date, from, to));
    const filteredProductions = productions.filter((r) => tsIn(r.date, from, to));
    const filteredBaggings = baggings.filter((r) => tsIn(r.date, from, to));
    const filteredLooseSales = looseSales.filter((r) => tsIn(r.date, from, to));
    const filteredBagSales = bagSales.filter((r) => tsIn(r.date, from, to));
    const filteredExpenses = expenses.filter((r) => tsIn(r.date, from, to));
    const filteredPayments = payments.filter((r) => tsIn(r.date, from, to));

    return (
        <div className="space-y-4 print:space-y-2">
            {/* Controls (hidden on print) */}
            <div className="flex flex-wrap gap-3 items-end print:hidden">
                <div className="space-y-1">
                    <Label>Report</Label>
                    <Select value={reportType} onValueChange={(v) => v && setReportType(v as ReportType)}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(REPORT_LABELS) as ReportType[]).map((k) => (
                                <SelectItem key={k} value={k}>{REPORT_LABELS[k]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label>From</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                    <Label>To</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
                <Button variant="outline" onClick={() => printTable(reportType, fromDate, toDate)}>Print / Export</Button>
            </div>

            {/* Report title for print */}
            <div className="hidden print:block text-center mb-4">
                <h2 className="text-lg font-bold">Dry Sand Plant — {REPORT_LABELS[reportType]}</h2>
                <p className="text-sm">{new Date(fromDate).toLocaleDateString("en-IN")} to {new Date(toDate).toLocaleDateString("en-IN")}</p>
            </div>

            {/* Inward Register */}
            {reportType === "inward" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Material", "Royalty Wt (T)", "Gross (T)", "Tare (T)", "Net (T)"]}
                    rows={filteredInwards.map((r) => [
                        fmtDate(r.date), r.vehicleNumber, r.partyName,
                        r.materialType, fmtNum(r.royaltyWeight ?? 0),
                        fmtNum(r.grossWeight), fmtNum(r.tareWeight), fmtNum(r.netWeight),
                    ])}
                    totals={["", "", "", "", fmtNum(filteredInwards.reduce((s, r) => s + (r.royaltyWeight ?? 0), 0)), "", "", fmtNum(filteredInwards.reduce((s, r) => s + r.netWeight, 0))]}
                />
            )}

            {/* Purchase Register */}
            {reportType === "purchase" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Material", "Net Wt (T)", "Rate/T", "Amount", "Bill?"]}
                    rows={filteredPurchases.map((r) => [
                        fmtDate(r.date), r.vehicleNumber, r.partyName,
                        r.materialType, fmtNum(r.netWeight),
                        fmtCurrency(r.ratePerTon), fmtCurrency(r.amount),
                        r.billMatched ? "✓" : "—",
                    ])}
                    totals={["", "", "", "", fmtNum(filteredPurchases.reduce((s, r) => s + r.netWeight, 0)), "", fmtCurrency(filteredPurchases.reduce((s, r) => s + r.amount, 0)), ""]}
                />
            )}

            {/* Production */}
            {reportType === "production" && (
                <ReportTable
                    headers={["Date", "Sand Used (T)", "Coal Used (T)", "Wastage (T)", "Outputs"]}
                    rows={filteredProductions.map((r) => [
                        fmtDate(r.date), fmtNum(r.sandUsed), fmtNum(r.coalUsed), fmtNum(r.wastage),
                        r.outputs.map((o) => `${o.gradeName}: ${fmtNum(o.quantity)}T`).join(", "),
                    ])}
                    totals={["", fmtNum(filteredProductions.reduce((s, r) => s + r.sandUsed, 0)), fmtNum(filteredProductions.reduce((s, r) => s + r.coalUsed, 0)), fmtNum(filteredProductions.reduce((s, r) => s + r.wastage, 0)), ""]}
                />
            )}

            {/* Bagging */}
            {reportType === "bagging" && (
                <ReportTable
                    headers={["Date", "Grade", "Bag Size", "No. of Bags", "Total Wt (T)"]}
                    rows={filteredBaggings.map((r) => [
                        fmtDate(r.date), r.gradeName, r.bagSizeLabel,
                        fmtNum(r.numberOfBags), fmtNum(r.totalWeightTons),
                    ])}
                    totals={["", "", "", fmtNum(filteredBaggings.reduce((s, r) => s + r.numberOfBags, 0)), fmtNum(filteredBaggings.reduce((s, r) => s + r.totalWeightTons, 0))]}
                />
            )}

            {/* Loose Sales */}
            {reportType === "loose_sales" && (
                <ReportTable
                    headers={["Date", "Inv#", "Vehicle", "Party", "Item", "Net Wt (T)", "Rate/T", "Amount", "Transport", "Total"]}
                    rows={filteredLooseSales.map((r) => [
                        fmtDate(r.date), r.invoiceNumber, r.vehicleNumber, r.partyName, r.itemName,
                        fmtNum(r.netWeightTons), fmtCurrency(r.ratePerTon), fmtCurrency(r.amount),
                        fmtCurrency(r.transportCost), fmtCurrency(r.totalAmount),
                    ])}
                    totals={["", "", "", "", "", fmtNum(filteredLooseSales.reduce((s, r) => s + r.netWeightTons, 0)), "", fmtCurrency(filteredLooseSales.reduce((s, r) => s + r.amount, 0)), fmtCurrency(filteredLooseSales.reduce((s, r) => s + r.transportCost, 0)), fmtCurrency(filteredLooseSales.reduce((s, r) => s + r.totalAmount, 0))]}
                />
            )}

            {/* Bag Sales */}
            {reportType === "bag_sales" && (
                <ReportTable
                    headers={["Date", "Inv#", "Party", "Grade", "Bag Size", "Bags", "Rate/T", "Amount", "Transport", "Total"]}
                    rows={filteredBagSales.map((r) => [
                        fmtDate(r.date), r.invoiceNumber, r.partyName, r.gradeName, r.bagSizeLabel,
                        fmtNum(r.numberOfBags), fmtCurrency(r.ratePerTon), fmtCurrency(r.amount),
                        fmtCurrency(r.transportCost), fmtCurrency(r.totalAmount),
                    ])}
                    totals={["", "", "", "", "", fmtNum(filteredBagSales.reduce((s, r) => s + r.numberOfBags, 0)), "", fmtCurrency(filteredBagSales.reduce((s, r) => s + r.amount, 0)), fmtCurrency(filteredBagSales.reduce((s, r) => s + r.transportCost, 0)), fmtCurrency(filteredBagSales.reduce((s, r) => s + r.totalAmount, 0))]}
                />
            )}

            {/* Expenses */}
            {reportType === "expenses" && (
                <ReportTable
                    headers={["Date", "Expense Head", "Amount", "Description"]}
                    rows={filteredExpenses.map((r) => [fmtDate(r.date), r.headName, fmtCurrency(r.amount), r.description ?? "—"])}
                    totals={["", "Total", fmtCurrency(filteredExpenses.reduce((s, r) => s + r.amount, 0)), ""]}
                />
            )}

            {/* Payments */}
            {reportType === "payments" && (
                <ReportTable
                    headers={["Date", "Party", "Type", "Mode", "Reference", "Amount"]}
                    rows={filteredPayments.map((r) => [fmtDate(r.date), r.partyName, r.type, r.mode.replace("_", " "), r.reference ?? "—", fmtCurrency(r.amount)])}
                    totals={["", "", "", "", "Total", fmtCurrency(filteredPayments.reduce((s, r) => s + r.amount, 0))]}
                />
            )}
        </div>
    );
}

function ReportTable({ headers, rows, totals }: { headers: string[]; rows: string[][]; totals?: string[] }) {
    return (
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-900 hover:bg-gray-900">
                        {headers.map((h) => (
                            <TableHead key={h} className="text-white text-xs font-mono uppercase">{h}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={headers.length} className="text-center py-8 text-sm text-muted-foreground">
                                No records in this date range.
                            </TableCell>
                        </TableRow>
                    )}
                    {rows.map((row, i) => (
                        <TableRow key={i}>
                            {row.map((cell, j) => (
                                <TableCell key={j} className="text-sm font-mono">{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {totals && rows.length > 0 && (
                        <TableRow className="bg-gray-50 font-semibold border-t-2">
                            {totals.map((cell, j) => (
                                <TableCell key={j} className="text-sm font-mono font-bold">{cell}</TableCell>
                            ))}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
