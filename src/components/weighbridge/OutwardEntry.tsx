"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { OutwardEntry as OutwardEntryType, DispatchType, Party, Item, BagSize } from "@/types";
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

const DISPATCH_LABELS: Record<DispatchType, string> = {
    loose_sale: "Loose Sale",
    bag_sale: "Bag Sale",
    other: "Other",
};

const DISPATCH_COLORS: Record<DispatchType, string> = {
    loose_sale: "bg-blue-100 text-blue-700",
    bag_sale: "bg-green-100 text-green-700",
    other: "bg-gray-100 text-gray-700",
};

interface OutwardForm {
    date: string;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    dispatchType: DispatchType;
    itemId: string;
    itemName: string;
    bagSizeId: string;
    numberOfBags: string;
    grossWeight: string;
    tareWeight: string;
    remarks: string;
}

const EMPTY_FORM: OutwardForm = {
    date: new Date().toISOString().split("T")[0],
    vehicleNumber: "",
    partyId: "",
    partyName: "",
    dispatchType: "loose_sale",
    itemId: "",
    itemName: "",
    bagSizeId: "",
    numberOfBags: "",
    grossWeight: "",
    tareWeight: "",
    remarks: "",
};

export function OutwardEntryList() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<OutwardEntryType[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<OutwardEntryType | null>(null);
    const [form, setForm] = useState<OutwardForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<OutwardEntryType>("outwardEntries", "date", setEntries, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);
    useEffect(() => collectionListener<Item>("items", "name", setItems), []);
    useEffect(() => collectionListener<BagSize>("bagSizes", "label", setBagSizes), []);

    const net = parseFloat(form.grossWeight || "0") - parseFloat(form.tareWeight || "0");

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(entry: OutwardEntryType) {
        setEditing(entry);
        setForm({
            date: entry.date.toDate().toISOString().split("T")[0],
            vehicleNumber: entry.vehicleNumber,
            partyId: entry.partyId,
            partyName: entry.partyName,
            dispatchType: entry.dispatchType,
            itemId: entry.itemId,
            itemName: entry.itemName,
            bagSizeId: entry.bagSizeId ?? "",
            numberOfBags: entry.numberOfBags != null ? String(entry.numberOfBags) : "",
            grossWeight: String(entry.grossWeight),
            tareWeight: String(entry.tareWeight),
            remarks: entry.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return; }
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.itemId) { toast.error("Item is required"); return; }
        if (!form.grossWeight || !form.tareWeight) { toast.error("Gross and tare weights are required"); return; }
        if (net <= 0) { toast.error("Net weight must be greater than zero"); return; }

        setSaving(true);
        try {
            const data: Record<string, unknown> = {
                date: Timestamp.fromDate(new Date(form.date)),
                vehicleNumber: form.vehicleNumber.toUpperCase().trim(),
                partyId: form.partyId,
                partyName: form.partyName,
                dispatchType: form.dispatchType,
                itemId: form.itemId,
                itemName: form.itemName,
                grossWeight: parseFloat(form.grossWeight),
                tareWeight: parseFloat(form.tareWeight),
                netWeight: Math.round(net * 1000) / 1000,
                remarks: form.remarks.trim() || null,
                createdBy: user?.uid || "",
            };

            if (form.dispatchType === "bag_sale" && form.bagSizeId) {
                data.bagSizeId = form.bagSizeId;
                if (form.numberOfBags) {
                    data.numberOfBags = parseInt(form.numberOfBags);
                }
            }

            if (editing) {
                await updateDocument("outwardEntries", editing.id, data);
                toast.success("Entry updated");
            } else {
                await addDocument("outwardEntries", data);
                toast.success("Outward entry added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save entry");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(entry: OutwardEntryType) {
        if (!confirm(`Delete outward entry for ${entry.vehicleNumber}?`)) return;
        await deleteDocument("outwardEntries", entry.id);
        toast.info("Entry deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Records dispatch of materials. Linked to sales entries for billing.
                </p>
                <Button size="sm" onClick={openAdd}>+ New Outward Entry</Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Net Wt (T)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-base text-muted-foreground py-10">
                                    No outward entries yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                <TableCell className="font-semibold text-sm font-mono uppercase">{entry.vehicleNumber}</TableCell>
                                <TableCell className="text-sm">{entry.partyName}</TableCell>
                                <TableCell>
                                    <Badge className={`${DISPATCH_COLORS[entry.dispatchType]} text-xs`}>
                                        {DISPATCH_LABELS[entry.dispatchType]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{entry.itemName}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">{entry.netWeight.toFixed(3)}</TableCell>
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
                        <DialogTitle>{editing ? "Edit Outward Entry" : "New Outward Entry"}</DialogTitle>
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
                            <Label>Dispatch Type *</Label>
                            <Select
                                value={form.dispatchType}
                                onValueChange={(v) => v && setForm({ ...form, dispatchType: v as DispatchType, bagSizeId: "", numberOfBags: "" })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="loose_sale">Loose Sale</SelectItem>
                                    <SelectItem value="bag_sale">Bag Sale</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Item *</Label>
                            <Select
                                value={form.itemId}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    const it = items.find((x) => x.id === v);
                                    setForm({ ...form, itemId: v, itemName: it?.name ?? "" });
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                                <SelectContent>
                                    {items.map((it) => (
                                        <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {form.dispatchType === "bag_sale" && (
                            <>
                                <div className="space-y-1">
                                    <Label>Bag Size</Label>
                                    <Select
                                        value={form.bagSizeId}
                                        onValueChange={(v) => v && setForm({ ...form, bagSizeId: v })}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select bag size…" /></SelectTrigger>
                                        <SelectContent>
                                            {bagSizes.map((b) => (
                                                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Number of Bags</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={form.numberOfBags}
                                        onChange={(e) => setForm({ ...form, numberOfBags: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}

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
                        <div className="col-span-2 space-y-1">
                            <Label>Net Weight (T)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold">
                                {net > 0 ? net.toFixed(3) : "—"}
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
