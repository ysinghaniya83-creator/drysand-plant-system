"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { PurchaseBill, PurchaseRegisterEntry, InwardMaterialType, Party } from "@/types";
import {
    collectionListener,
    addDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function formatDate(ts: Timestamp) {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLORS = {
    unmatched: "bg-orange-100 text-orange-700",
    matched: "bg-green-100 text-green-700",
    disputed: "bg-red-100 text-red-700",
};

interface BillForm {
    date: string;
    billNumber: string;
    partyId: string;
    partyName: string;
    vehicleNumber: string;
    materialType: InwardMaterialType;
    billWeight: string;
    billRate: string;
}

const EMPTY_FORM: BillForm = {
    date: new Date().toISOString().split("T")[0],
    billNumber: "",
    partyId: "",
    partyName: "",
    vehicleNumber: "",
    materialType: "sand",
    billWeight: "",
    billRate: "",
};

export function PurchaseBills() {
    const [bills, setBills] = useState<PurchaseBill[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<PurchaseBill | null>(null);
    const [form, setForm] = useState<BillForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<PurchaseBill>("purchaseBills", "date", setBills, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);

    const billAmount = parseFloat(form.billWeight || "0") * parseFloat(form.billRate || "0");

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(bill: PurchaseBill) {
        setEditing(bill);
        setForm({
            date: bill.date.toDate().toISOString().split("T")[0],
            billNumber: bill.billNumber,
            partyId: bill.partyId,
            partyName: bill.partyName,
            vehicleNumber: bill.vehicleNumber,
            materialType: bill.materialType,
            billWeight: String(bill.billWeight),
            billRate: String(bill.billRate),
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.billNumber.trim()) { toast.error("Bill number is required"); return; }
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return; }
        if (!form.billWeight || !form.billRate) { toast.error("Weight and rate are required"); return; }

        setSaving(true);
        try {
            const bw = parseFloat(form.billWeight);
            const br = parseFloat(form.billRate);
            const ba = Math.round(bw * br * 100) / 100;

            // Try to auto-match with purchase register
            let matchedPurchaseId: string | undefined;
            let weightDifference: number | undefined;
            let amountDifference: number | undefined;
            let status: PurchaseBill["status"] = "unmatched";

            const matches = await queryDocuments<PurchaseRegisterEntry>(
                "purchaseRegister",
                "vehicleNumber",
                form.vehicleNumber.toUpperCase().trim()
            );
            const exactMatch = matches.find(
                (m) => m.partyId === form.partyId && m.materialType === form.materialType && !m.billMatched
            );

            if (exactMatch) {
                matchedPurchaseId = exactMatch.id;
                weightDifference = Math.round((bw - exactMatch.netWeight) * 1000) / 1000;
                amountDifference = Math.round((ba - exactMatch.amount) * 100) / 100;
                status = Math.abs(weightDifference) < 0.01 ? "matched" : "disputed";
            }

            const data: Record<string, unknown> = {
                date: Timestamp.fromDate(new Date(form.date)),
                billNumber: form.billNumber.trim(),
                partyId: form.partyId,
                partyName: form.partyName,
                vehicleNumber: form.vehicleNumber.toUpperCase().trim(),
                materialType: form.materialType,
                billWeight: bw,
                billRate: br,
                billAmount: ba,
                status,
            };

            if (matchedPurchaseId) {
                data.matchedPurchaseId = matchedPurchaseId;
                data.weightDifference = weightDifference;
                data.amountDifference = amountDifference;
            }

            if (editing) {
                await updateDocument("purchaseBills", editing.id, data);
                toast.success("Bill updated");
            } else {
                const ref = await addDocument("purchaseBills", data);
                if (matchedPurchaseId) {
                    await updateDocument("purchaseRegister", matchedPurchaseId, {
                        billMatched: true,
                        billId: ref.id,
                    });
                    toast.success(status === "matched" ? "Bill added & matched" : "Bill added (disputed — weight mismatch)");
                } else {
                    toast.success("Bill added (no match found)");
                }
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save bill");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(bill: PurchaseBill) {
        if (!confirm(`Delete bill ${bill.billNumber}?`)) return;
        try {
            // Un-match the purchase register entry if matched
            if (bill.matchedPurchaseId) {
                await updateDocument("purchaseRegister", bill.matchedPurchaseId, {
                    billMatched: false,
                    billId: null,
                });
            }
            await deleteDocument("purchaseBills", bill.id);
            toast.info("Bill deleted");
        } catch {
            toast.error("Failed to delete");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Record supplier bills. Auto-matches by vehicle number + party + material.
                </p>
                <Button size="sm" onClick={openAdd}>+ Add Bill</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Bill #</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Party</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Vehicle</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Bill Wt (T)</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Rate</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Bill Amt</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Wt Diff</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center text-base text-muted-foreground py-10">
                                    No purchase bills yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {bills.map((bill) => (
                            <TableRow key={bill.id}>
                                <TableCell className="text-sm font-mono">{formatDate(bill.date)}</TableCell>
                                <TableCell className="font-semibold text-sm font-mono">{bill.billNumber}</TableCell>
                                <TableCell className="text-sm">{bill.partyName}</TableCell>
                                <TableCell className="text-sm font-mono uppercase">{bill.vehicleNumber}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{bill.billWeight.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{bill.billRate.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">₹{bill.billAmount.toLocaleString("en-IN")}</TableCell>
                                <TableCell>
                                    <Badge className={`${STATUS_COLORS[bill.status]} text-xs capitalize`}>
                                        {bill.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    {bill.weightDifference != null ? (
                                        <span className={Math.abs(bill.weightDifference) < 0.01 ? "text-green-600" : "text-orange-600"}>
                                            {bill.weightDifference >= 0 ? "+" : ""}{bill.weightDifference.toFixed(3)}
                                        </span>
                                    ) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(bill)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(bill)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Purchase Bill" : "Add Purchase Bill"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Bill Number *</Label>
                            <Input
                                value={form.billNumber}
                                onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                                placeholder="e.g. INV-2024-001"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Party *</Label>
                            <Select
                                value={form.partyId}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    const p = parties.find((x) => x.id === v);
                                    setForm({ ...form, partyId: v, partyName: p?.name ?? "" });
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select party…" /></SelectTrigger>
                                <SelectContent>
                                    {parties.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Vehicle Number *</Label>
                            <Input
                                value={form.vehicleNumber}
                                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                                placeholder="GJ01AB1234"
                                className="uppercase"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Material *</Label>
                            <Select
                                value={form.materialType}
                                onValueChange={(v) => v && setForm({ ...form, materialType: v as InwardMaterialType })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sand">Sand</SelectItem>
                                    <SelectItem value="coal">Coal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Bill Weight (T) *</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.billWeight}
                                onChange={(e) => setForm({ ...form, billWeight: e.target.value })}
                                placeholder="0.000"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Rate per Ton (₹) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.billRate}
                                onChange={(e) => setForm({ ...form, billRate: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Bill Amount (₹)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold text-green-700">
                                {billAmount > 0 ? `₹${billAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Auto-match: system will search for an unmatched purchase register entry with same vehicle + party + material.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
