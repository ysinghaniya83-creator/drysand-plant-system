"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { DailyClosingStock, ClosingStockItem, Item, ProductionEntry, BaggingEntry, LooseSale, OutwardEntry } from "@/types";
import { collectionListener, addDocument, updateDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Aggregate item stock from production outputs - bagging - outward dispatches
function computeSystemStock(
    items: Item[],
    productions: ProductionEntry[],
    baggings: BaggingEntry[],
    outwards: OutwardEntry[],
    looseSales: LooseSale[]
): Record<string, number> {
    const stock: Record<string, number> = {};
    for (const item of items) stock[item.id] = 0;

    // add production outputs
    for (const p of productions) {
        for (const o of p.outputs) {
            stock[o.itemId] = (stock[o.itemId] ?? 0) + o.quantity;
        }
    }
    // deduct bagging (converts loose to bagged)
    for (const b of baggings) {
        stock[b.itemId] = (stock[b.itemId] ?? 0) - b.totalWeightTons;
    }
    // deduct outward dispatches
    for (const o of outwards) {
        stock[o.itemId] = (stock[o.itemId] ?? 0) - o.netWeight;
    }
    // deduct loose sales
    for (const s of looseSales) {
        stock[s.itemId] = (stock[s.itemId] ?? 0) - s.netWeightTons;
    }
    return stock;
}

export function ClosingStockEntry() {
    const { user } = useAuth();
    const [records, setRecords] = useState<DailyClosingStock[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [productions, setProductions] = useState<ProductionEntry[]>([]);
    const [baggings, setBaggings] = useState<BaggingEntry[]>([]);
    const [outwards, setOutwards] = useState<OutwardEntry[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [physicalInputs, setPhysicalInputs] = useState<Record<string, string>>({});
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<DailyClosingStock>("closingStock", "date", setRecords, "desc"), []);
    useEffect(() => collectionListener<Item>("items", "name", setItems), []);
    useEffect(() => collectionListener<ProductionEntry>("productions", "date", setProductions), []);
    useEffect(() => collectionListener<BaggingEntry>("baggings", "date", setBaggings), []);
    useEffect(() => collectionListener<OutwardEntry>("outwardEntries", "date", setOutwards), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);

    const systemStock = computeSystemStock(items, productions, baggings, outwards, looseSales);

    function openNew() {
        setEditingId(null);
        setDate(new Date().toISOString().split("T")[0]);
        const inputs: Record<string, string> = {};
        items.forEach((it) => { inputs[it.id] = ""; });
        setPhysicalInputs(inputs);
        setRemarks("");
        setOpen(true);
    }

    function openEdit(record: DailyClosingStock) {
        setEditingId(record.id);
        setDate(record.date.toDate().toISOString().split("T")[0]);
        const inputs: Record<string, string> = {};
        items.forEach((it) => {
            const found = record.items.find((i) => i.itemId === it.id);
            inputs[it.id] = found ? String(found.physicalStock) : "";
        });
        setPhysicalInputs(inputs);
        setRemarks(record.remarks ?? "");
        setOpen(true);
    }

    async function handleSave() {
        const stockItems: ClosingStockItem[] = items.map((it) => {
            const sys = Math.round((systemStock[it.id] ?? 0) * 1000) / 1000;
            const phy = parseFloat(physicalInputs[it.id] || "0") || 0;
            return {
                itemId: it.id,
                itemName: it.name,
                systemStock: sys,
                physicalStock: phy,
                shortage: Math.round((sys - phy) * 1000) / 1000,
            };
        });
        setSaving(true);
        try {
            const data = {
                date: Timestamp.fromDate(new Date(date)),
                items: stockItems,
                remarks: remarks.trim() || null,
                createdBy: user?.uid || "",
            };
            if (editingId) {
                await updateDocument("closingStock", editingId, data);
                toast.success("Stock record updated");
            } else {
                await addDocument("closingStock", data);
                toast.success("Closing stock saved");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" onClick={openNew}>+ Record Closing Stock</Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Date</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Items Recorded</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Remarks</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No closing stock records yet.</TableCell>
                            </TableRow>
                        )}
                        {records.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="font-mono text-sm">{formatDate(r.date)}</TableCell>
                                <TableCell className="text-sm">
                                    {r.items.map((it) => (
                                        <span key={it.itemId} className="mr-3">
                                            {it.itemName}: <span className="font-mono">{it.physicalStock}T</span>
                                            {it.shortage !== 0 && (
                                                <span className={`ml-1 text-xs ${it.shortage > 0 ? "text-red-600" : "text-green-600"}`}>
                                                    ({it.shortage > 0 ? "-" : "+"}{Math.abs(it.shortage)}T)
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{r.remarks || "—"}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(r)}>Edit</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Closing Stock — Physical Count</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Date</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Item</TableHead>
                                        <TableHead className="text-xs text-right">System (T)</TableHead>
                                        <TableHead className="text-xs text-right">Physical (T)</TableHead>
                                        <TableHead className="text-xs text-right">Shortage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((it) => {
                                        const sys = Math.round((systemStock[it.id] ?? 0) * 1000) / 1000;
                                        const phy = parseFloat(physicalInputs[it.id] || "0") || 0;
                                        const shortage = Math.round((sys - phy) * 1000) / 1000;
                                        return (
                                            <TableRow key={it.id}>
                                                <TableCell className="text-sm">{it.name}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{sys}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        className="h-7 text-right w-24 font-mono text-sm"
                                                        value={physicalInputs[it.id] ?? ""}
                                                        onChange={(e) => setPhysicalInputs({ ...physicalInputs, [it.id]: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell className={`text-right font-mono text-sm ${shortage > 0 ? "text-red-600" : shortage < 0 ? "text-green-600" : ""}`}>
                                                    {shortage}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="space-y-1">
                            <Label>Remarks</Label>
                            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional…" />
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
