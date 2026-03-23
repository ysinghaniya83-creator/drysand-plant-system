"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { BagSale, Party, Item, BagSize } from "@/types";
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

interface BagSaleForm {
    date: string;
    invoiceNumber: string;
    partyId: string;
    partyName: string;
    itemId: string;
    gradeName: string;
    bagSizeId: string;
    bagSizeLabel: string;
    bagWeightKg: number;
    numberOfBags: string;
    ratePerTon: string;
    transportCost: string;
}

const EMPTY_FORM: BagSaleForm = {
    date: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    partyId: "",
    partyName: "",
    itemId: "",
    gradeName: "",
    bagSizeId: "",
    bagSizeLabel: "",
    bagWeightKg: 0,
    numberOfBags: "",
    ratePerTon: "",
    transportCost: "0",
};

export function BagSaleList() {
    const { user } = useAuth();
    const [sales, setSales] = useState<BagSale[]>([]);
    const [parties, setParties] = useState<Party[]>([]);
    const [finishedItems, setFinishedItems] = useState<Item[]>([]);
    const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BagSale | null>(null);
    const [form, setForm] = useState<BagSaleForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<BagSale>("bagSales", "date", setSales, "desc"), []);
    useEffect(() => collectionListener<Party>("parties", "name", setParties), []);
    useEffect(() => {
        return collectionListener<Item>("items", "name", (all) =>
            setFinishedItems(all.filter((i) => i.type === "finished_sand"))
        );
    }, []);
    useEffect(() => collectionListener<BagSize>("bagSizes", "label", setBagSizes), []);

    const bags = parseInt(form.numberOfBags || "0");
    const totalWeightTons = Math.round((bags * form.bagWeightKg / 1000) * 1000) / 1000;
    const pricePerBag = form.bagWeightKg > 0 ? (parseFloat(form.ratePerTon || "0") * form.bagWeightKg / 1000) : 0;
    const amount = Math.round(pricePerBag * bags * 100) / 100;
    const totalAmount = amount + parseFloat(form.transportCost || "0");

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(sale: BagSale) {
        setEditing(sale);
        const bs = bagSizes.find((b) => b.id === sale.bagSizeId);
        setForm({
            date: sale.date.toDate().toISOString().split("T")[0],
            invoiceNumber: sale.invoiceNumber,
            partyId: sale.partyId,
            partyName: sale.partyName,
            itemId: sale.itemId,
            gradeName: sale.gradeName,
            bagSizeId: sale.bagSizeId,
            bagSizeLabel: sale.bagSizeLabel,
            bagWeightKg: bs?.weightKg ?? 0,
            numberOfBags: String(sale.numberOfBags),
            ratePerTon: String(sale.ratePerTon),
            transportCost: String(sale.transportCost),
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.invoiceNumber.trim()) { toast.error("Invoice number is required"); return; }
        if (!form.partyId) { toast.error("Party is required"); return; }
        if (!form.itemId) { toast.error("Grade is required"); return; }
        if (!form.bagSizeId) { toast.error("Bag size is required"); return; }
        if (!form.numberOfBags || bags <= 0) { toast.error("Number of bags is required"); return; }
        if (!form.ratePerTon) { toast.error("Rate is required"); return; }

        setSaving(true);
        try {
            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                invoiceNumber: form.invoiceNumber.trim(),
                partyId: form.partyId,
                partyName: form.partyName,
                itemId: form.itemId,
                gradeName: form.gradeName,
                bagSizeId: form.bagSizeId,
                bagSizeLabel: form.bagSizeLabel,
                numberOfBags: bags,
                totalWeightTons,
                ratePerTon: parseFloat(form.ratePerTon),
                pricePerBag: Math.round(pricePerBag * 100) / 100,
                amount,
                transportCost: parseFloat(form.transportCost || "0"),
                totalAmount: Math.round(totalAmount * 100) / 100,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("bagSales", editing.id, data);
                toast.success("Sale updated");
            } else {
                await addDocument("bagSales", data);
                toast.success("Bag sale added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(sale: BagSale) {
        if (!confirm(`Delete invoice ${sale.invoiceNumber}?`)) return;
        await deleteDocument("bagSales", sale.id);
        toast.info("Sale deleted");
    }

    const totalRevenue = sales.reduce((s, e) => s + e.totalAmount, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Finished sand sold in bags.</p>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                        Total: ₹{totalRevenue.toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" onClick={openAdd}>+ New Bag Sale</Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Date</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Invoice #</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Party</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Grade</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Bag Size</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Bags</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Rate/T</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Total</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                    No bag sales yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="text-sm font-mono">{formatDate(sale.date)}</TableCell>
                                <TableCell className="font-semibold text-sm font-mono">{sale.invoiceNumber}</TableCell>
                                <TableCell className="text-sm">{sale.partyName}</TableCell>
                                <TableCell className="text-sm">{sale.gradeName}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{sale.bagSizeLabel}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{sale.numberOfBags.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{sale.ratePerTon.toLocaleString("en-IN")}</TableCell>
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
                        <DialogTitle>{editing ? "Edit Bag Sale" : "New Bag Sale"}</DialogTitle>
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
                        <div className="space-y-1">
                            <Label>Grade *</Label>
                            <Select value={form.itemId} onValueChange={(v) => {
                                if (!v) return;
                                const it = finishedItems.find((x) => x.id === v);
                                setForm({ ...form, itemId: v, gradeName: it?.gradeLabel || it?.name || "" });
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select grade…" /></SelectTrigger>
                                <SelectContent>
                                    {finishedItems.map((it) => (
                                        <SelectItem key={it.id} value={it.id}>
                                            {it.name}{it.gradeLabel ? ` (${it.gradeLabel})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Bag Size *</Label>
                            <Select value={form.bagSizeId} onValueChange={(v) => {
                                if (!v) return;
                                const bs = bagSizes.find((b) => b.id === v);
                                setForm({ ...form, bagSizeId: v, bagSizeLabel: bs?.label ?? "", bagWeightKg: bs?.weightKg ?? 0 });
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select bag size…" /></SelectTrigger>
                                <SelectContent>
                                    {bagSizes.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Number of Bags *</Label>
                            <Input type="number" min="1" value={form.numberOfBags} onChange={(e) => setForm({ ...form, numberOfBags: e.target.value })} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                            <Label>Rate per Ton (₹) *</Label>
                            <Input type="number" step="0.01" min="0" value={form.ratePerTon} onChange={(e) => setForm({ ...form, ratePerTon: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <Label>Price per Bag (₹)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm">
                                {pricePerBag > 0 ? `₹${pricePerBag.toFixed(2)}` : "—"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Transport Cost (₹)</Label>
                            <Input type="number" step="0.01" min="0" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="col-span-2 space-y-1">
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
