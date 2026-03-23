"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry as InwardEntryType, InwardMaterialType, Party } from "@/types";
import {
    collectionListener,
    addDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
} from "@/lib/firestore";
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

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

const MAT_COLORS: Record<InwardMaterialType, string> = {
    sand: "bg-yellow-100 text-yellow-700",
    coal: "bg-gray-200 text-gray-700",
};

interface InwardForm {
    date: string;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    materialType: InwardMaterialType;
    royaltyNumber: string;
    royaltyWeight: string;
    grossWeight: string;
    tareWeight: string;
    ratePerTon: string;
    remarks: string;
}

const EMPTY_FORM: InwardForm = {
    date: todayISO(),
    vehicleNumber: "",
    partyId: "",
    partyName: "",
    materialType: "sand",
    royaltyNumber: "",
    royaltyWeight: "",
    grossWeight: "",
    tareWeight: "",
    ratePerTon: "",
    remarks: "",
};

export function InwardEntryList() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<InwardEntryType[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<InwardEntryType | null>(null);
    const [form, setForm] = useState<InwardForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<InwardEntryType>("inwardEntries", "date", setEntries, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);

    const net = parseFloat(form.grossWeight || "0") - parseFloat(form.tareWeight || "0");
    const amount = net * parseFloat(form.ratePerTon || "0");

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: todayISO() });
        setOpen(true);
    }

    function openEdit(entry: InwardEntryType) {
        setEditing(entry);
        setForm({
            date: entry.date.toDate().toISOString().split("T")[0],
            vehicleNumber: entry.vehicleNumber,
            partyId: entry.partyId,
            partyName: entry.partyName,
            materialType: entry.materialType,
            royaltyNumber: entry.royaltyNumber ?? "",
            royaltyWeight: String(entry.royaltyWeight),
            grossWeight: String(entry.grossWeight),
            tareWeight: String(entry.tareWeight),
            ratePerTon: String(entry.ratePerTon),
            remarks: entry.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return; }
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.grossWeight || !form.tareWeight) { toast.error("Gross and tare weights are required"); return; }
        if (!form.ratePerTon) { toast.error("Rate per ton is required"); return; }
        if (net <= 0) { toast.error("Net weight must be greater than zero"); return; }

        setSaving(true);
        try {
            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                vehicleNumber: form.vehicleNumber.toUpperCase().trim(),
                partyId: form.partyId,
                partyName: form.partyName,
                materialType: form.materialType,
                royaltyNumber: form.royaltyNumber.trim() || null,
                royaltyWeight: parseFloat(form.royaltyWeight || "0"),
                grossWeight: parseFloat(form.grossWeight),
                tareWeight: parseFloat(form.tareWeight),
                netWeight: Math.round(net * 1000) / 1000,
                ratePerTon: parseFloat(form.ratePerTon),
                amount: Math.round(amount * 100) / 100,
                remarks: form.remarks.trim() || null,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("inwardEntries", editing.id, data);
                const prEntries = await queryDocuments<{ id: string }>(
                    "purchaseRegister",
                    "inwardEntryId",
                    editing.id
                );
                if (prEntries.length > 0) {
                    await updateDocument("purchaseRegister", prEntries[0].id, {
                        date: data.date,
                        vehicleNumber: data.vehicleNumber,
                        partyId: data.partyId,
                        partyName: data.partyName,
                        materialType: data.materialType,
                        netWeight: data.netWeight,
                        ratePerTon: data.ratePerTon,
                        amount: data.amount,
                    });
                }
                toast.success("Entry updated");
            } else {
                const ref = await addDocument("inwardEntries", data);
                await addDocument("purchaseRegister", {
                    date: data.date,
                    inwardEntryId: ref.id,
                    vehicleNumber: data.vehicleNumber,
                    partyId: data.partyId,
                    partyName: data.partyName,
                    materialType: data.materialType,
                    netWeight: data.netWeight,
                    ratePerTon: data.ratePerTon,
                    amount: data.amount,
                    billMatched: false,
                });
                toast.success("Inward entry added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save entry");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(entry: InwardEntryType) {
        if (!confirm(`Delete entry for ${entry.vehicleNumber}? This will also remove the purchase register record.`)) return;
        try {
            await deleteDocument("inwardEntries", entry.id);
            const prEntries = await queryDocuments<{ id: string }>(
                "purchaseRegister",
                "inwardEntryId",
                entry.id
            );
            for (const pr of prEntries) {
                await deleteDocument("purchaseRegister", pr.id);
            }
            toast.info("Entry deleted");
        } catch {
            toast.error("Failed to delete");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Records inward delivery of sand / coal. Auto-creates purchase register entry.
                </p>
                <Button size="sm" onClick={openAdd}>+ New Inward Entry</Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Date</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Vehicle</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Party</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Material</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Royalty #</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Net Wt (T)</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Rate</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Amount</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                    No inward entries yet. Record your first delivery above.
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                <TableCell className="font-semibold text-sm font-mono uppercase">{entry.vehicleNumber}</TableCell>
                                <TableCell className="text-sm">{entry.partyName}</TableCell>
                                <TableCell>
                                    <Badge className={`${MAT_COLORS[entry.materialType]} text-xs capitalize`}>
                                        {entry.materialType}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">{entry.royaltyNumber || "—"}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">{entry.netWeight.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{entry.ratePerTon.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">₹{entry.amount.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(entry)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(entry)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Inward Entry" : "New Inward Entry"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
                            <Label>Royalty Number</Label>
                            <Input
                                value={form.royaltyNumber}
                                onChange={(e) => setForm({ ...form, royaltyNumber: e.target.value })}
                                placeholder="e.g. GJ/2024/00001"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Royalty Weight (T)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.royaltyWeight}
                                onChange={(e) => setForm({ ...form, royaltyWeight: e.target.value })}
                                placeholder="0.000"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Gross Weight (T) *</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.grossWeight}
                                onChange={(e) => setForm({ ...form, grossWeight: e.target.value })}
                                placeholder="0.000"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Tare Weight (T) *</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.tareWeight}
                                onChange={(e) => setForm({ ...form, tareWeight: e.target.value })}
                                placeholder="0.000"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Net Weight (T)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold">
                                {net > 0 ? net.toFixed(3) : "—"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Rate per Ton (₹) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.ratePerTon}
                                onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Amount (₹)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold text-green-700">
                                {amount > 0 ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                            </div>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label>Remarks</Label>
                            <Input
                                value={form.remarks}
                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                placeholder="Optional notes…"
                            />
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
