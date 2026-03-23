"use client";

import { useEffect, useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import type { Party, LooseSale, BagSale, PurchaseRegisterEntry, Payment } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

function fmtDate(ts: Timestamp) {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAmt(n: number) {
    return "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Balance convention: positive = we owe them (Cr), negative = they owe us (Dr)
function balanceBadge(balance: number) {
    if (Math.abs(balance) < 0.01) {
        return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-xs font-mono">Settled</Badge>;
    }
    if (balance > 0) {
        return (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs font-mono">
                {fmtAmt(balance)} Cr
            </Badge>
        );
    }
    return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs font-mono">
            {fmtAmt(balance)} Dr
        </Badge>
    );
}

type TxKind = "opening" | "sale" | "purchase" | "payment_paid" | "payment_received";

interface LedgerRow {
    id: string;
    sortKey: number; // timestamp ms, 0 for opening
    date: Timestamp | null;
    particulars: string;
    kind: TxKind;
    dr: number;
    cr: number;
    balance: number;
}

function buildLedger(
    party: Party,
    looseSales: LooseSale[],
    bagSales: BagSale[],
    purchases: PurchaseRegisterEntry[],
    payments: Payment[],
): LedgerRow[] {
    // Opening row
    const rows: Omit<LedgerRow, "balance">[] = [
        {
            id: "opening",
            sortKey: 0,
            date: null,
            particulars: "Opening Balance",
            kind: "opening",
            dr: party.openingBalance < 0 ? Math.abs(party.openingBalance) : 0,
            cr: party.openingBalance > 0 ? party.openingBalance : 0,
        },
    ];

    for (const s of looseSales.filter((x) => x.partyId === party.id)) {
        rows.push({
            id: s.id,
            sortKey: s.date.toMillis(),
            date: s.date,
            particulars: `Loose Sale — ${s.itemName} ${s.invoiceNumber ? `(${s.invoiceNumber})` : ""}`.trim(),
            kind: "sale",
            dr: s.totalAmount,
            cr: 0,
        });
    }

    for (const s of bagSales.filter((x) => x.partyId === party.id)) {
        rows.push({
            id: s.id,
            sortKey: s.date.toMillis(),
            date: s.date,
            particulars: `Bag Sale — ${s.gradeName} ${s.bagSizeLabel} ${s.invoiceNumber ? `(${s.invoiceNumber})` : ""}`.trim(),
            kind: "sale",
            dr: s.totalAmount,
            cr: 0,
        });
    }

    for (const p of purchases.filter((x) => x.partyId === party.id)) {
        rows.push({
            id: p.id,
            sortKey: p.date.toMillis(),
            date: p.date,
            particulars: `Purchase — ${p.materialType === "sand" ? "Sand" : "Coal"} ${p.vehicleNumber}`,
            kind: "purchase",
            dr: 0,
            cr: p.amount,
        });
    }

    for (const pmt of payments.filter((x) => x.partyId === party.id)) {
        if (pmt.type === "paid") {
            rows.push({
                id: pmt.id,
                sortKey: pmt.date.toMillis(),
                date: pmt.date,
                particulars: `Payment Paid${pmt.reference ? ` (${pmt.reference})` : ""}${pmt.remarks ? ` — ${pmt.remarks}` : ""}`,
                kind: "payment_paid",
                dr: pmt.amount,
                cr: 0,
            });
        } else {
            rows.push({
                id: pmt.id,
                sortKey: pmt.date.toMillis(),
                date: pmt.date,
                particulars: `Payment Received${pmt.reference ? ` (${pmt.reference})` : ""}${pmt.remarks ? ` — ${pmt.remarks}` : ""}`,
                kind: "payment_received",
                dr: 0,
                cr: pmt.amount,
            });
        }
    }

    // Sort: opening first, then by date ascending
    rows.sort((a, b) => a.sortKey - b.sortKey);

    // Compute running balance
    // balance = openingBalance + purchases + payment_received - sales - payment_paid
    // Dr entries (sale, payment_paid) decrease balance
    // Cr entries (purchase, payment_received) increase balance
    let running = 0;
    const withBalance: LedgerRow[] = rows.map((row) => {
        if (row.kind === "opening") {
            running = party.openingBalance;
        } else if (row.dr > 0) {
            running -= row.dr;
        } else {
            running += row.cr;
        }
        return { ...row, balance: running };
    });

    return withBalance;
}

function computePartyBalance(
    party: Party,
    looseSales: LooseSale[],
    bagSales: BagSale[],
    purchases: PurchaseRegisterEntry[],
    payments: Payment[],
): number {
    let bal = party.openingBalance;
    bal -= looseSales.filter((x) => x.partyId === party.id).reduce((s, x) => s + x.totalAmount, 0);
    bal -= bagSales.filter((x) => x.partyId === party.id).reduce((s, x) => s + x.totalAmount, 0);
    bal += purchases.filter((x) => x.partyId === party.id).reduce((s, x) => s + x.amount, 0);
    bal -= payments.filter((x) => x.partyId === party.id && x.type === "paid").reduce((s, x) => s + x.amount, 0);
    bal += payments.filter((x) => x.partyId === party.id && x.type === "received").reduce((s, x) => s + x.amount, 0);
    return bal;
}

const KIND_STYLES: Record<TxKind, string> = {
    opening: "text-muted-foreground italic",
    sale: "text-blue-700",
    purchase: "text-amber-700",
    payment_paid: "text-red-600",
    payment_received: "text-green-700",
};

// ─── Party List View ──────────────────────────────────────────────────────────

interface PartyListProps {
    parties: Party[];
    looseSales: LooseSale[];
    bagSales: BagSale[];
    purchases: PurchaseRegisterEntry[];
    payments: Payment[];
    onSelect: (p: Party) => void;
}

function PartyListView({ parties, looseSales, bagSales, purchases, payments, onSelect }: PartyListProps) {
    const [search, setSearch] = useState("");

    const filtered = parties.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    );

    const totalReceivable = useMemo(() => {
        return parties.reduce((sum, p) => {
            const b = computePartyBalance(p, looseSales, bagSales, purchases, payments);
            return b < 0 ? sum + Math.abs(b) : sum;
        }, 0);
    }, [parties, looseSales, bagSales, purchases, payments]);

    const totalPayable = useMemo(() => {
        return parties.reduce((sum, p) => {
            const b = computePartyBalance(p, looseSales, bagSales, purchases, payments);
            return b > 0 ? sum + b : sum;
        }, 0);
    }, [parties, looseSales, bagSales, purchases, payments]);

    return (
        <div className="space-y-4">
            {/* Summary chips */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Receivable (Dr)</span>
                    <span className="text-sm font-bold text-blue-700 font-mono">{fmtAmt(totalReceivable)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl">
                    <span className="text-xs text-orange-600 font-medium uppercase tracking-wide">Total Payable (Cr)</span>
                    <span className="text-sm font-bold text-orange-700 font-mono">{fmtAmt(totalPayable)}</span>
                </div>
            </div>

            <Input
                placeholder="Search parties…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs h-8 text-sm"
            />

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total Sales</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total Purchases</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Balance</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-base text-muted-foreground py-10">
                                    No parties found.
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((p) => {
                            const balance = computePartyBalance(p, looseSales, bagSales, purchases, payments);
                            const sales = looseSales.filter((x) => x.partyId === p.id).reduce((s, x) => s + x.totalAmount, 0)
                                + bagSales.filter((x) => x.partyId === p.id).reduce((s, x) => s + x.totalAmount, 0);
                            const purch = purchases.filter((x) => x.partyId === p.id).reduce((s, x) => s + x.amount, 0);
                            const typeMap: Record<string, string> = {
                                supplier: "bg-blue-100 text-blue-700",
                                customer: "bg-green-100 text-green-700",
                                both: "bg-purple-100 text-purple-700",
                            };
                            return (
                                <TableRow key={p.id} className="cursor-pointer hover:bg-sand-50/60" onClick={() => onSelect(p)}>
                                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                    <TableCell>
                                        <Badge className={`${typeMap[p.type]} hover:${typeMap[p.type]} capitalize text-xs`}>{p.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm text-blue-700">
                                        {sales > 0 ? fmtAmt(sales) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm text-amber-700">
                                        {purch > 0 ? fmtAmt(purch) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">{balanceBadge(balance)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>
                                            View Ledger →
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ─── Single Party Ledger View ─────────────────────────────────────────────────

interface LedgerViewProps {
    party: Party;
    looseSales: LooseSale[];
    bagSales: BagSale[];
    purchases: PurchaseRegisterEntry[];
    payments: Payment[];
    onBack: () => void;
}

function LedgerView({ party, looseSales, bagSales, purchases, payments, onBack }: LedgerViewProps) {
    const rows = useMemo(
        () => buildLedger(party, looseSales, bagSales, purchases, payments),
        [party, looseSales, bagSales, purchases, payments]
    );

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : party.openingBalance;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={onBack} className="h-8 gap-1.5">
                    <ArrowLeft size={14} /> Back
                </Button>
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{party.name}</h3>
                    {party.phone && <span className="text-xs text-muted-foreground">{party.phone}</span>}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Closing Balance:</span>
                    {balanceBadge(closingBalance)}
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Particulars</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-32">Dr (₹)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-32">Cr (₹)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right w-36">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-base text-muted-foreground py-10">
                                    No transactions found for this party.
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                    {row.date ? fmtDate(row.date) : "—"}
                                </TableCell>
                                <TableCell className={`text-sm ${KIND_STYLES[row.kind]}`}>
                                    {row.particulars}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-red-600">
                                    {row.dr > 0 ? fmtAmt(row.dr) : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-green-600">
                                    {row.cr > 0 ? fmtAmt(row.cr) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    {balanceBadge(row.balance)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-end">
                <div className="text-xs text-muted-foreground space-y-0.5 text-right">
                    <p><span className="text-red-600 font-medium">Dr (red)</span> = Sales to party / Payment paid to party</p>
                    <p><span className="text-green-600 font-medium">Cr (green)</span> = Purchases from party / Payment received from party</p>
                    <p><span className="text-blue-600 font-medium">Dr balance</span> = party owes us &nbsp;|&nbsp; <span className="text-orange-600 font-medium">Cr balance</span> = we owe party</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function PartyLedger() {
    const [parties, setParties] = useState<Party[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);

    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<Payment>("payments", "date", setPayments), []);

    if (selectedParty) {
        // Re-find party from state in case it updated
        const liveParty = parties.find((p) => p.id === selectedParty.id) ?? selectedParty;
        return (
            <LedgerView
                party={liveParty}
                looseSales={looseSales}
                bagSales={bagSales}
                purchases={purchases}
                payments={payments}
                onBack={() => setSelectedParty(null)}
            />
        );
    }

    return (
        <PartyListView
            parties={parties}
            looseSales={looseSales}
            bagSales={bagSales}
            purchases={purchases}
            payments={payments}
            onSelect={setSelectedParty}
        />
    );
}
