"use client";

import { useEffect, useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import type {
    InwardEntry, PurchaseRegisterEntry, LooseSale, BagSale, ExpenseEntry, Payment,
    BaggingEntry, ProductionEntry, OutwardEntry, AttendanceEntry, SalaryPayment,
    DailyClosingStock, PurchaseBill, Party, Item, Employee,
} from "@/types";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType =
    | "inward" | "purchase" | "purchase_bills"
    | "production" | "bagging"
    | "outward" | "loose_sales" | "bag_sales"
    | "expenses" | "payments"
    | "royalty" | "daily_summary" | "party_sales"
    | "stock_summary" | "closing_stock"
    | "attendance" | "salary"
    | "vehicle";

const REPORT_GROUPS: { label: string; reports: { value: ReportType; label: string }[] }[] = [
    {
        label: "Inward & Purchase",
        reports: [
            { value: "inward", label: "Inward Register" },
            { value: "royalty", label: "Royalty Ledger" },
            { value: "purchase", label: "Purchase Register" },
            { value: "purchase_bills", label: "Purchase Bills" },
        ],
    },
    {
        label: "Production & Stock",
        reports: [
            { value: "production", label: "Production Report" },
            { value: "bagging", label: "Bagging Report" },
            { value: "stock_summary", label: "Stock Summary" },
            { value: "closing_stock", label: "Closing Stock Register" },
        ],
    },
    {
        label: "Sales & Dispatch",
        reports: [
            { value: "outward", label: "Outward Dispatch Register" },
            { value: "loose_sales", label: "Loose Sales Register" },
            { value: "bag_sales", label: "Bag Sales Register" },
            { value: "party_sales", label: "Party-wise Sales Summary" },
        ],
    },
    {
        label: "Finance",
        reports: [
            { value: "expenses", label: "Expense Ledger" },
            { value: "payments", label: "Payment Ledger" },
            { value: "daily_summary", label: "Daily Summary" },
        ],
    },
    {
        label: "Employees",
        reports: [
            { value: "attendance", label: "Attendance Report" },
            { value: "salary", label: "Salary Register" },
        ],
    },
    {
        label: "Vehicles",
        reports: [
            { value: "vehicle", label: "Vehicle Activity Report" },
        ],
    },
];

// flat map for lookup
const ALL_REPORTS = REPORT_GROUPS.flatMap((g) => g.reports);
const REPORT_LABELS: Record<ReportType, string> = Object.fromEntries(ALL_REPORTS.map((r) => [r.value, r.label])) as Record<ReportType, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsIn(ts: Timestamp, from: Date, to: Date) {
    const d = ts.toDate();
    return d >= from && d <= to;
}

function fmtDate(ts: Timestamp) {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(n: number, dp = 3) {
    return n.toLocaleString("en-IN", { maximumFractionDigits: dp });
}

function fmtCurrency(n: number) {
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function toDayKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tsToMonthKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── ReportTable component ────────────────────────────────────────────────────

function ReportTable({ headers, rows, totals }: { headers: string[]; rows: string[][]; totals?: string[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-sand-100">
            <Table>
                <TableHeader>
                    <TableRow className="bg-sand-50 border-b border-sand-100">
                        {headers.map((h, i) => (
                            <TableHead key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</TableHead>
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
                                <TableCell key={j} className="text-sm font-mono whitespace-nowrap">{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {totals && rows.length > 0 && (
                        <TableRow className="bg-sand-50 font-semibold border-t-2">
                            {totals.map((cell, j) => (
                                <TableCell key={j} className="text-sm font-mono font-bold whitespace-nowrap">{cell}</TableCell>
                            ))}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Reports() {
    const [reportType, setReportType] = useState<ReportType>("inward");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

    // ── Data ──────────────────────────────────────────────────────────────────
    const [inwards, setInwards] = useState<InwardEntry[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
    const [productions, setProductions] = useState<ProductionEntry[]>([]);
    const [baggings, setBaggings] = useState<BaggingEntry[]>([]);
    const [outwards, setOutwards] = useState<OutwardEntry[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [closingStocks, setClosingStocks] = useState<DailyClosingStock[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => collectionListener<InwardEntry>("inwardEntries", "date", setInwards), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<PurchaseBill>("purchaseBills", "date", setPurchaseBills), []);
    useEffect(() => collectionListener<ProductionEntry>("productionEntries", "date", setProductions), []);
    useEffect(() => collectionListener<BaggingEntry>("baggings", "date", setBaggings), []);
    useEffect(() => collectionListener<OutwardEntry>("outwardEntries", "date", setOutwards), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);
    useEffect(() => collectionListener<Payment>("payments", "date", setPayments), []);
    useEffect(() => collectionListener<AttendanceEntry>("attendance", "date", setAttendance), []);
    useEffect(() => collectionListener<SalaryPayment>("salaryPayments", "month", setSalaryPayments), []);
    useEffect(() => collectionListener<DailyClosingStock>("closingStock", "date", setClosingStocks, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);
    useEffect(() => collectionListener<Item>("items", "name", setItems), []);
    useEffect(() => collectionListener<Employee>("employees", "name", setEmployees), []);

    const from = useMemo(() => { const d = new Date(fromDate); d.setHours(0, 0, 0, 0); return d; }, [fromDate]);
    const to = useMemo(() => { const d = new Date(toDate); d.setHours(23, 59, 59, 999); return d; }, [toDate]);

    const fi = inwards.filter((r) => tsIn(r.date, from, to));
    const fp = purchases.filter((r) => tsIn(r.date, from, to));
    const fpb = purchaseBills.filter((r) => tsIn(r.date, from, to));
    const fprod = productions.filter((r) => tsIn(r.date, from, to));
    const fb = baggings.filter((r) => tsIn(r.date, from, to));
    const fo = outwards.filter((r) => tsIn(r.date, from, to));
    const fls = looseSales.filter((r) => tsIn(r.date, from, to));
    const fbs = bagSales.filter((r) => tsIn(r.date, from, to));
    const fe = expenses.filter((r) => tsIn(r.date, from, to));
    const fpay = payments.filter((r) => tsIn(r.date, from, to));
    const fatt = attendance.filter((r) => tsIn(r.date, from, to));
    const fcs = closingStocks.filter((r) => tsIn(r.date, from, to));

    // Salary is filtered by month range (YYYY-MM string comparison)
    const fromMonth = fromDate.slice(0, 7);
    const toMonth = toDate.slice(0, 7);
    const fsal = salaryPayments.filter((p) => p.month >= fromMonth && p.month <= toMonth);

    return (
        <div className="space-y-4 print:space-y-2">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-end print:hidden">
                <div className="space-y-1">
                    <Label>Report</Label>
                    <Select value={reportType} onValueChange={(v) => v && setReportType(v as ReportType)}>
                        <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {REPORT_GROUPS.map((g) => (
                                <div key={g.label}>
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{g.label}</div>
                                    {g.reports.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </div>
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
                <Button variant="outline" onClick={() => window.print()}>Print / Export</Button>
            </div>

            {/* Print header */}
            <div className="hidden print:block text-center mb-4">
                <h2 className="text-lg font-bold">Dry Sand Plant — {REPORT_LABELS[reportType]}</h2>
                <p className="text-sm">{new Date(fromDate).toLocaleDateString("en-IN")} to {new Date(toDate).toLocaleDateString("en-IN")}</p>
            </div>

            {/* ── Inward Register ── */}
            {reportType === "inward" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Material", "Royalty Wt (T)", "Gross (T)", "Tare (T)", "Net (T)"]}
                    rows={fi.map((r) => [fmtDate(r.date), r.vehicleNumber, r.partyName, r.materialType, fmtNum(r.royaltyWeight ?? 0), fmtNum(r.grossWeight), fmtNum(r.tareWeight), fmtNum(r.netWeight)])}
                    totals={["", "", "", "", fmtNum(fi.reduce((s, r) => s + (r.royaltyWeight ?? 0), 0)), "", "", fmtNum(fi.reduce((s, r) => s + r.netWeight, 0))]}
                />
            )}

            {/* ── Royalty Ledger ── */}
            {reportType === "royalty" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Material", "Royalty No.", "Royalty Wt (T)", "Weighbridge Wt (T)", "Diff (T)"]}
                    rows={fi.map((r) => [
                        fmtDate(r.date), r.vehicleNumber, r.partyName, r.materialType,
                        r.royaltyNumber || "—", fmtNum(r.royaltyWeight ?? 0), fmtNum(r.netWeight),
                        fmtNum(r.netWeight - (r.royaltyWeight ?? 0)),
                    ])}
                    totals={["", "", "", "", "", fmtNum(fi.reduce((s, r) => s + (r.royaltyWeight ?? 0), 0)), fmtNum(fi.reduce((s, r) => s + r.netWeight, 0)), fmtNum(fi.reduce((s, r) => s + r.netWeight - (r.royaltyWeight ?? 0), 0))]}
                />
            )}

            {/* ── Purchase Register ── */}
            {reportType === "purchase" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Material", "Net Wt (T)", "Rate/T", "Amount", "Bill?"]}
                    rows={fp.map((r) => [fmtDate(r.date), r.vehicleNumber, r.partyName, r.materialType, fmtNum(r.netWeight), fmtCurrency(r.ratePerTon), fmtCurrency(r.amount), r.billMatched ? "✓" : "—"])}
                    totals={["", "", "", "", fmtNum(fp.reduce((s, r) => s + r.netWeight, 0)), "", fmtCurrency(fp.reduce((s, r) => s + r.amount, 0)), ""]}
                />
            )}

            {/* ── Purchase Bills ── */}
            {reportType === "purchase_bills" && (
                <ReportTable
                    headers={["Date", "Bill No.", "Vehicle", "Party", "Material", "Bill Wt (T)", "Bill Rate", "Bill Amt", "Status"]}
                    rows={fpb.map((r) => [
                        fmtDate(r.date), r.billNumber, r.vehicleNumber, r.partyName, r.materialType,
                        fmtNum(r.billWeight), fmtCurrency(r.billRate), fmtCurrency(r.billAmount),
                        r.status,
                    ])}
                    totals={["", "", "", "", "", fmtNum(fpb.reduce((s, r) => s + r.billWeight, 0)), "", fmtCurrency(fpb.reduce((s, r) => s + r.billAmount, 0)), ""]}
                />
            )}

            {/* ── Production Report ── */}
            {reportType === "production" && (
                <ReportTable
                    headers={["Date", "Sand Used (T)", "Coal Used (T)", "Wastage (T)", "Outputs"]}
                    rows={fprod.map((r) => [fmtDate(r.date), fmtNum(r.sandUsed), fmtNum(r.coalUsed), fmtNum(r.wastage), r.outputs.map((o) => `${o.gradeName}: ${fmtNum(o.quantity)}T`).join(", ")])}
                    totals={["", fmtNum(fprod.reduce((s, r) => s + r.sandUsed, 0)), fmtNum(fprod.reduce((s, r) => s + r.coalUsed, 0)), fmtNum(fprod.reduce((s, r) => s + r.wastage, 0)), ""]}
                />
            )}

            {/* ── Bagging Report ── */}
            {reportType === "bagging" && (
                <ReportTable
                    headers={["Date", "Grade", "Bag Size", "No. of Bags", "Total Wt (T)"]}
                    rows={fb.map((r) => [fmtDate(r.date), r.gradeName, r.bagSizeLabel, fmtNum(r.numberOfBags, 0), fmtNum(r.totalWeightTons)])}
                    totals={["", "", "", fmtNum(fb.reduce((s, r) => s + r.numberOfBags, 0), 0), fmtNum(fb.reduce((s, r) => s + r.totalWeightTons, 0))]}
                />
            )}

            {/* ── Outward Dispatch Register ── */}
            {reportType === "outward" && (
                <ReportTable
                    headers={["Date", "Vehicle", "Party", "Dispatch Type", "Item", "Bags", "Gross (T)", "Tare (T)", "Net (T)", "Remarks"]}
                    rows={fo.map((r) => [
                        fmtDate(r.date), r.vehicleNumber, r.partyName,
                        r.dispatchType.replace("_", " "), r.itemName,
                        r.numberOfBags ? fmtNum(r.numberOfBags, 0) : "—",
                        fmtNum(r.grossWeight), fmtNum(r.tareWeight), fmtNum(r.netWeight),
                        r.remarks || "—",
                    ])}
                    totals={["", "", "", "", "", fmtNum(fo.reduce((s, r) => s + (r.numberOfBags ?? 0), 0), 0), "", "", fmtNum(fo.reduce((s, r) => s + r.netWeight, 0)), ""]}
                />
            )}

            {/* ── Loose Sales Register ── */}
            {reportType === "loose_sales" && (
                <ReportTable
                    headers={["Date", "Inv#", "Vehicle", "Party", "Item", "Net Wt (T)", "Rate/T", "Amount", "Transport", "Total"]}
                    rows={fls.map((r) => [fmtDate(r.date), r.invoiceNumber, r.vehicleNumber, r.partyName, r.itemName, fmtNum(r.netWeightTons), fmtCurrency(r.ratePerTon), fmtCurrency(r.amount), fmtCurrency(r.transportCost), fmtCurrency(r.totalAmount)])}
                    totals={["", "", "", "", "", fmtNum(fls.reduce((s, r) => s + r.netWeightTons, 0)), "", fmtCurrency(fls.reduce((s, r) => s + r.amount, 0)), fmtCurrency(fls.reduce((s, r) => s + r.transportCost, 0)), fmtCurrency(fls.reduce((s, r) => s + r.totalAmount, 0))]}
                />
            )}

            {/* ── Bag Sales Register ── */}
            {reportType === "bag_sales" && (
                <ReportTable
                    headers={["Date", "Inv#", "Party", "Grade", "Bag Size", "Bags", "Rate/T", "Amount", "Transport", "Total"]}
                    rows={fbs.map((r) => [fmtDate(r.date), r.invoiceNumber, r.partyName, r.gradeName, r.bagSizeLabel, fmtNum(r.numberOfBags, 0), fmtCurrency(r.ratePerTon), fmtCurrency(r.amount), fmtCurrency(r.transportCost), fmtCurrency(r.totalAmount)])}
                    totals={["", "", "", "", "", fmtNum(fbs.reduce((s, r) => s + r.numberOfBags, 0), 0), "", fmtCurrency(fbs.reduce((s, r) => s + r.amount, 0)), fmtCurrency(fbs.reduce((s, r) => s + r.transportCost, 0)), fmtCurrency(fbs.reduce((s, r) => s + r.totalAmount, 0))]}
                />
            )}

            {/* ── Party-wise Sales Summary ── */}
            {reportType === "party_sales" && (() => {
                const partyMap = new Map<string, { name: string; looseTons: number; bagTons: number; revenue: number; transport: number; invoices: number }>();
                for (const s of fls) {
                    const prev = partyMap.get(s.partyId) ?? { name: s.partyName, looseTons: 0, bagTons: 0, revenue: 0, transport: 0, invoices: 0 };
                    partyMap.set(s.partyId, { ...prev, looseTons: prev.looseTons + s.netWeightTons, revenue: prev.revenue + s.amount, transport: prev.transport + s.transportCost, invoices: prev.invoices + 1 });
                }
                for (const s of fbs) {
                    const prev = partyMap.get(s.partyId) ?? { name: s.partyName, looseTons: 0, bagTons: 0, revenue: 0, transport: 0, invoices: 0 };
                    partyMap.set(s.partyId, { ...prev, bagTons: prev.bagTons + s.totalWeightTons, revenue: prev.revenue + s.amount, transport: prev.transport + s.transportCost, invoices: prev.invoices + 1 });
                }
                const rows = Array.from(partyMap.values()).sort((a, b) => b.revenue - a.revenue);
                return (
                    <ReportTable
                        headers={["Party", "Loose (T)", "Bag (T)", "Total Wt (T)", "Sale Revenue", "Transport", "Invoices"]}
                        rows={rows.map((r) => [r.name, fmtNum(r.looseTons), fmtNum(r.bagTons), fmtNum(r.looseTons + r.bagTons), fmtCurrency(r.revenue), fmtCurrency(r.transport), fmtNum(r.invoices, 0)])}
                        totals={["Total", "", "", fmtNum(rows.reduce((s, r) => s + r.looseTons + r.bagTons, 0)), fmtCurrency(rows.reduce((s, r) => s + r.revenue, 0)), fmtCurrency(rows.reduce((s, r) => s + r.transport, 0)), fmtNum(rows.reduce((s, r) => s + r.invoices, 0), 0)]}
                    />
                );
            })()}

            {/* ── Stock Summary ── */}
            {reportType === "stock_summary" && (() => {
                // Compute current stock using ALL data (not date-filtered)
                const totalSandIn = inwards.filter((e) => e.materialType === "sand").reduce((s, e) => s + e.netWeight, 0);
                const totalCoalIn = inwards.filter((e) => e.materialType === "coal").reduce((s, e) => s + e.netWeight, 0);
                const totalSandUsed = productions.reduce((s, p) => s + p.sandUsed, 0);
                const totalCoalUsed = productions.reduce((s, p) => s + p.coalUsed, 0);

                const stock: Record<string, number> = {};
                for (const it of items) stock[it.id] = 0;
                for (const it of items) {
                    if (it.type === "raw_sand") stock[it.id] = totalSandIn - totalSandUsed;
                    else if (it.type === "coal") stock[it.id] = totalCoalIn - totalCoalUsed;
                }
                for (const p of productions) for (const o of p.outputs) stock[o.itemId] = (stock[o.itemId] ?? 0) + o.quantity;
                for (const b of baggings) stock[b.itemId] = (stock[b.itemId] ?? 0) - b.totalWeightTons;
                for (const o of outwards) stock[o.itemId] = (stock[o.itemId] ?? 0) - o.netWeight;
                for (const s of looseSales) stock[s.itemId] = (stock[s.itemId] ?? 0) - s.netWeightTons;

                return (
                    <ReportTable
                        headers={["Item", "Type", "Unit", "System Stock"]}
                        rows={items.map((it) => [it.name, it.type.replace("_", " "), it.unit, fmtNum(stock[it.id] ?? 0)])}
                    />
                );
            })()}

            {/* ── Closing Stock Register ── */}
            {reportType === "closing_stock" && (
                <ReportTable
                    headers={["Date", "Item", "System Stock (T)", "Physical Stock (T)", "Shortage (T)", "Remarks"]}
                    rows={fcs.flatMap((r) => r.items.map((it) => [fmtDate(r.date), it.itemName, fmtNum(it.systemStock), fmtNum(it.physicalStock), fmtNum(it.shortage), r.remarks || "—"]))}
                />
            )}

            {/* ── Expense Ledger ── */}
            {reportType === "expenses" && (
                <ReportTable
                    headers={["Date", "Expense Head", "Amount", "Description"]}
                    rows={fe.map((r) => [fmtDate(r.date), r.headName, fmtCurrency(r.amount), r.description ?? "—"])}
                    totals={["", "Total", fmtCurrency(fe.reduce((s, r) => s + r.amount, 0)), ""]}
                />
            )}

            {/* ── Payment Ledger ── */}
            {reportType === "payments" && (
                <ReportTable
                    headers={["Date", "Party", "Type", "Mode", "Reference", "Amount"]}
                    rows={fpay.map((r) => [fmtDate(r.date), r.partyName, r.type, r.mode.replace("_", " "), r.reference ?? "—", fmtCurrency(r.amount)])}
                    totals={["", "", "", "", "Total", fmtCurrency(fpay.reduce((s, r) => s + r.amount, 0))]}
                />
            )}

            {/* ── Daily Summary ── */}
            {reportType === "daily_summary" && (() => {
                const daySet = new Set<string>();
                [...fi, ...fls, ...fbs, ...fe, ...fpay, ...fprod].forEach((r) => daySet.add(toDayKey(r.date)));
                const days = Array.from(daySet).sort().reverse();
                const rows = days.map((day) => {
                    const dayInward = fi.filter((r) => toDayKey(r.date) === day).reduce((s, r) => s + r.netWeight, 0);
                    const dayProd = fprod.filter((r) => toDayKey(r.date) === day).reduce((s, r) => s + r.outputs.reduce((x, o) => x + o.quantity, 0), 0);
                    const dayRevenue = fls.filter((r) => toDayKey(r.date) === day).reduce((s, r) => s + r.amount, 0)
                        + fbs.filter((r) => toDayKey(r.date) === day).reduce((s, r) => s + r.amount, 0);
                    const dayExpenses = fe.filter((r) => toDayKey(r.date) === day).reduce((s, r) => s + r.amount, 0);
                    const dayPaymentsIn = fpay.filter((r) => toDayKey(r.date) === day && r.type === "received").reduce((s, r) => s + r.amount, 0);
                    return [day, fmtNum(dayInward) + " T", fmtNum(dayProd) + " T", fmtCurrency(dayRevenue), fmtCurrency(dayExpenses), fmtCurrency(dayPaymentsIn)];
                });
                return (
                    <ReportTable
                        headers={["Date", "Inward (T)", "Production (T)", "Sale Revenue", "Expenses", "Payments In"]}
                        rows={rows}
                    />
                );
            })()}

            {/* ── Attendance Report ── */}
            {reportType === "attendance" && (() => {
                const empMap = new Map<string, { name: string; present: number; absent: number; otHours: number }>();
                for (const a of fatt) {
                    const prev = empMap.get(a.employeeId) ?? { name: a.employeeName, present: 0, absent: 0, otHours: 0 };
                    empMap.set(a.employeeId, {
                        name: a.employeeName,
                        present: prev.present + (a.present ? 1 : 0),
                        absent: prev.absent + (a.present ? 0 : 1),
                        otHours: prev.otHours + (a.overtimeHours ?? 0),
                    });
                }
                const rows = Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                return (
                    <ReportTable
                        headers={["Employee", "Days Present", "Days Absent", "OT Hours", "Attendance %"]}
                        rows={rows.map((r) => {
                            const total = r.present + r.absent;
                            const pct = total > 0 ? ((r.present / total) * 100).toFixed(1) + "%" : "—";
                            return [r.name, fmtNum(r.present, 0), fmtNum(r.absent, 0), fmtNum(r.otHours, 1), pct];
                        })}
                        totals={["Total", fmtNum(rows.reduce((s, r) => s + r.present, 0), 0), fmtNum(rows.reduce((s, r) => s + r.absent, 0), 0), fmtNum(rows.reduce((s, r) => s + r.otHours, 0), 1), ""]}
                    />
                );
            })()}

            {/* ── Salary Register ── */}
            {reportType === "salary" && (
                <ReportTable
                    headers={["Month", "Employee", "Days Worked", "Salary (₹)", "Deductions (₹)", "Net Payable (₹)", "Status"]}
                    rows={fsal.map((r) => [r.month, r.employeeName, fmtNum(r.daysWorked, 0), fmtCurrency(r.salaryAmount), fmtCurrency(r.deductions), fmtCurrency(r.netPayable), r.isPaid ? "Paid" : "Unpaid"])}
                    totals={["", "", "", fmtCurrency(fsal.reduce((s, r) => s + r.salaryAmount, 0)), fmtCurrency(fsal.reduce((s, r) => s + r.deductions, 0)), fmtCurrency(fsal.reduce((s, r) => s + r.netPayable, 0)), ""]}
                />
            )}

            {/* ── Vehicle Activity Report ── */}
            {reportType === "vehicle" && (() => {
                const vMap = new Map<string, { inwardCount: number; inwardTons: number; outwardCount: number; outwardTons: number }>();
                for (const r of fi) {
                    const prev = vMap.get(r.vehicleNumber) ?? { inwardCount: 0, inwardTons: 0, outwardCount: 0, outwardTons: 0 };
                    vMap.set(r.vehicleNumber, { ...prev, inwardCount: prev.inwardCount + 1, inwardTons: prev.inwardTons + r.netWeight });
                }
                for (const r of fo) {
                    const prev = vMap.get(r.vehicleNumber) ?? { inwardCount: 0, inwardTons: 0, outwardCount: 0, outwardTons: 0 };
                    vMap.set(r.vehicleNumber, { ...prev, outwardCount: prev.outwardCount + 1, outwardTons: prev.outwardTons + r.netWeight });
                }
                const rows = Array.from(vMap.entries()).sort((a, b) => (b[1].inwardCount + b[1].outwardCount) - (a[1].inwardCount + a[1].outwardCount));
                return (
                    <ReportTable
                        headers={["Vehicle", "Inward Trips", "Inward (T)", "Outward Trips", "Outward (T)", "Total Trips"]}
                        rows={rows.map(([veh, d]) => [veh, fmtNum(d.inwardCount, 0), fmtNum(d.inwardTons), fmtNum(d.outwardCount, 0), fmtNum(d.outwardTons), fmtNum(d.inwardCount + d.outwardCount, 0)])}
                        totals={["Total", fmtNum(rows.reduce((s, [, d]) => s + d.inwardCount, 0), 0), fmtNum(rows.reduce((s, [, d]) => s + d.inwardTons, 0)), fmtNum(rows.reduce((s, [, d]) => s + d.outwardCount, 0), 0), fmtNum(rows.reduce((s, [, d]) => s + d.outwardTons, 0)), fmtNum(rows.reduce((s, [, d]) => s + d.inwardCount + d.outwardCount, 0), 0)]}
                    />
                );
            })()}
        </div>
    );
}
