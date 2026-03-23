"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { LooseSale, Party, Item } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
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

interface LooseSaleForm {
    date: string;
    invoiceNumber: string;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    itemId: string;
    itemName: string;
    netWeightTons: string;
    ratePerTon: string;
    transportCost: string;
}

const EMPTY_FORM: LooseSaleForm = {
    date: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    vehicleNumber: "",
    partyId: "",
    partyName: "",
    itemId: "",
    itemName: "",
    netWeightTons: "",
    ratePerTon: "",
    transportCost: "0",
};

export function LooseSaleList() {
    const { user } = useAuth();
    const [sales, setSales] = useState<LooseSale[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<LooseSale | null>(null);
    const [form, setForm] = useState<LooseSaleForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setSales, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);
    useEffect(() => {
        return collectionListener<Item>("items", "name", (all) =>
            setItems(all.filter((i) => i.type === "finished_sand" || i.type === "raw_sand"))
        );
    }, []);

    const amount = parseFloat(form.netWeightTons || "0") * parseFloat(form.ratePerTon || "0");
    const totalAmount = amount + parseFloat(form.transportCost || "0");

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(sale: LooseSale) {
        setEditing(sale);
        setForm({
            date: sale.date.toDate().toISOString().split("T")[0],
            invoiceNumber: sale.invoiceNumber,
            vehicleNumber: sale.vehicleNumber,
            partyId: sale.partyId,
            partyName: sale.partyName,
            itemId: sale.itemId,
            itemName: sale.itemName,
            netWeightTons: String(sale.netWeightTons),
            ratePerTon: String(sale.ratePerTon),
            transportCost: String(sale.transportCost),
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.invoiceNumber.trim()) { toast.error("Invoice number is required"); return; }
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.itemId) { toast.error("Item is required"); return; }
        if (!form.netWeightTons || !form.ratePerTon) { toast.error("Weight and rate are required"); return; }

        setSaving(true);
        try {
            const nw = parseFloat(form.netWeightTons);
            const rate = parseFloat(form.ratePerTon);
            const transport = parseFloat(form.transportCost || "0");
            const amt = Math.round(nw * rate * 100) / 100;
            const total = Math.round((amt + transport) * 100) / 100;

            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                outwardEntryId: "",
                vehicleNumber: form.vehicleNumber.toUpperCase().trim(),
                invoiceNumber: form.invoiceNumber.trim(),
                partyId: form.partyId,
                partyName: form.partyName,
                itemId: form.itemId,
                itemName: form.itemName,
                netWeightTons: nw,
                ratePerTon: rate,
                amount: amt,
                transportCost: transport,
                totalAmount: total,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("looseSales", editing.id, data);
                toast.success("Sale updated");
            } else {
                await addDocument("looseSales", data);
                toast.success("Loose sale added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(sale: LooseSale) {
        if (!confirm(`Delete invoice ${sale.invoiceNumber}?`)) return;
        await deleteDocument("looseSales", sale.id);
        toast.info("Sale deleted");
    }

    const totalRevenue = sales.reduce((s, e) => s + e.totalAmount, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Loose sand sold by weight on weighbridge.</p>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                        Total: ₹{totalRevenue.toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" onClick={openAdd}>+ New Loose Sale</Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Date</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Invoice #</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Party</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Item</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Wt (T)</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Rate</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Amount</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Transport</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Total</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                                    No loose sales yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="text-sm font-mono">{formatDate(sale.date)}</TableCell>
                                <TableCell className="font-semibold text-sm font-mono">{sale.invoiceNumber}</TableCell>
                                <TableCell className="text-sm">{sale.partyName}</TableCell>
                                <TableCell className="text-sm">{sale.itemName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{sale.netWeightTons.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{sale.ratePerTon.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{sale.amount.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-muted-foreground">₹{sale.transportCost.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">₹{sale.totalAmount.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(sale)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(sale)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Loose Sale" : "New Loose Sale"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Invoice Number *</Label>
                            <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-001" />
                        </div>
                        <div className="space-y-1">
                            <Label>Vehicle Number</Label>
                            <Input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="GJ01AB1234" className="uppercase" />
                        </div>
                        <div className="col-span-2 space-y-1">
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
                        <div className="col-span-2 space-y-1">
                            <Label>Item *</Label>
                            <Select value={form.itemId} onValueChange={(v) => {
                                if (!v) return;
                                const it = items.find((x) => x.id === v);
                                setForm({ ...form, itemId: v, itemName: it?.name ?? "" });
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                                <SelectContent>
                                    {items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Net Weight (T) *</Label>
                            <Input type="number" step="0.001" min="0" value={form.netWeightTons} onChange={(e) => setForm({ ...form, netWeightTons: e.target.value })} placeholder="0.000" />
                        </div>
                        <div className="space-y-1">
                            <Label>Rate per Ton (₹) *</Label>
                            <Input type="number" step="0.01" min="0" value={form.ratePerTon} onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <Label>Transport Cost (₹)</Label>
                            <Input type="number" step="0.01" min="0" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <Label>Total Amount (₹)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold text-green-700">
                                {totalAmount > 0 ? `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                            </div>
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
