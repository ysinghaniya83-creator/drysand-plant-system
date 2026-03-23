"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { Payment, PaymentMode, PaymentType, Party } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
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

const MODE_LABELS: Record<PaymentMode, string> = {
    cash: "Cash",
    cheque: "Cheque",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    other: "Other",
};

interface PaymentForm {
    date: string;
    partyId: string;
    partyName: string;
    type: PaymentType;
    amount: string;
    mode: PaymentMode;
    reference: string;
    remarks: string;
}

const EMPTY_FORM: PaymentForm = {
    date: new Date().toISOString().split("T")[0],
    partyId: "",
    partyName: "",
    type: "paid",
    amount: "",
    mode: "cash",
    reference: "",
    remarks: "",
};

export function PaymentList() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Payment | null>(null);
    const [form, setForm] = useState<PaymentForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<Payment>("payments", "date", setPayments, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);

    const totalPaid = payments.filter((p) => p.type === "paid").reduce((s, p) => s + p.amount, 0);
    const totalReceived = payments.filter((p) => p.type === "received").reduce((s, p) => s + p.amount, 0);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(payment: Payment) {
        setEditing(payment);
        setForm({
            date: payment.date.toDate().toISOString().split("T")[0],
            partyId: payment.partyId,
            partyName: payment.partyName,
            type: payment.type,
            amount: String(payment.amount),
            mode: payment.mode,
            reference: payment.reference ?? "",
            remarks: payment.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Amount is required"); return; }

        setSaving(true);
        try {
            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                partyId: form.partyId,
                partyName: form.partyName,
                type: form.type,
                amount: Math.round(parseFloat(form.amount) * 100) / 100,
                mode: form.mode,
                reference: form.reference.trim() || null,
                remarks: form.remarks.trim() || null,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("payments", editing.id, data);
                toast.success("Payment updated");
            } else {
                await addDocument("payments", data);
                toast.success(`Payment ${form.type === "paid" ? "paid" : "received"} recorded`);
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(payment: Payment) {
        if (!confirm(`Delete this payment of ₹${payment.amount.toLocaleString("en-IN")}?`)) return;
        await deleteDocument("payments", payment.id);
        toast.info("Payment deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-6 text-xs font-mono">
                    <span className="text-red-600 font-semibold">Paid: ₹{totalPaid.toLocaleString("en-IN")}</span>
                    <span className="text-green-600 font-semibold">Received: ₹{totalReceived.toLocaleString("en-IN")}</span>
                </div>
                <Button size="sm" onClick={openAdd}>+ Record Payment</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Party</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Type</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Mode</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Reference</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-base text-muted-foreground py-10">
                                    No payments recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {payments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell className="text-sm font-mono">{formatDate(payment.date)}</TableCell>
                                <TableCell className="text-sm">{payment.partyName}</TableCell>
                                <TableCell>
                                    <Badge className={`${payment.type === "paid" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"} text-xs capitalize`}>
                                        {payment.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{MODE_LABELS[payment.mode]}</TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">{payment.reference || "—"}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">₹{payment.amount.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(payment)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(payment)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Payment" : "Record Payment"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Party *</Label>
                            <Select value={form.partyId} onValueChange={(v) => {
                                if (!v) return;
                                const p = parties.find((x) => x.id === v);
                                setForm({ ...form, partyId: v, partyName: p?.name ?? "" });
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select party…" /></SelectTrigger>
                                <SelectContent>
                                    {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Type *</Label>
                                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as PaymentType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paid">Paid (to party)</SelectItem>
                                        <SelectItem value="received">Received (from party)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Mode *</Label>
                                <Select value={form.mode} onValueChange={(v) => v && setForm({ ...form, mode: v as PaymentMode })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(MODE_LABELS) as PaymentMode[]).map((m) => (
                                            <SelectItem key={m} value={m}>{MODE_LABELS[m]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Amount (₹) *</Label>
                            <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <Label>Reference (Cheque / UTR)</Label>
                            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Cheque no / UTR…" />
                        </div>
                        <div className="space-y-1">
                            <Label>Remarks</Label>
                            <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes…" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
