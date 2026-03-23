"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { PurchaseRegisterEntry, InwardMaterialType } from "@/types";
import { collectionListener, updateDocument } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const MAT_COLORS: Record<InwardMaterialType, string> = {
    sand: "bg-yellow-100 text-yellow-700",
    coal: "bg-gray-200 text-gray-700",
};

export function PurchaseRegister() {
    const [entries, setEntries] = useState<PurchaseRegisterEntry[]>([]);
    const [editing, setEditing] = useState<PurchaseRegisterEntry | null>(null);
    const [rate, setRate] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setEntries, "desc"), []);

    const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
    const totalWeight = entries.reduce((s, e) => s + e.netWeight, 0);

    function openEdit(entry: PurchaseRegisterEntry) {
        setEditing(entry);
        setRate(String(entry.ratePerTon));
    }

    async function handleRateUpdate() {
        if (!editing) return;
        const r = parseFloat(rate);
        if (!r || r <= 0) { toast.error("Invalid rate"); return; }
        setSaving(true);
        try {
            const newAmount = Math.round(editing.netWeight * r * 100) / 100;
            await updateDocument("purchaseRegister", editing.id, {
                ratePerTon: r,
                amount: newAmount,
            });
            toast.success("Rate updated");
            setEditing(null);
        } catch {
            toast.error("Failed to update");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Auto-generated from Weighbridge inward entries. Edit rate if correction needed.
                </p>
                <div className="text-sm font-mono font-semibold text-muted-foreground">
                    Total: {totalWeight.toFixed(3)} T &nbsp;|&nbsp; ₹{totalAmount.toLocaleString("en-IN")}
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Net Wt (T)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Rate</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Amount</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-base text-muted-foreground py-10">
                                    No purchase entries. Add inward entries in Weighbridge to populate this register.
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
                                <TableCell className="text-right font-mono text-sm">{entry.netWeight.toFixed(3)}</TableCell>
                                <TableCell className="text-right font-mono text-sm">₹{entry.ratePerTon.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">₹{entry.amount.toLocaleString("en-IN")}</TableCell>
                                <TableCell>
                                    {entry.billMatched ? (
                                        <Badge className="bg-green-100 text-green-700 text-xs">Matched</Badge>
                                    ) : (
                                        <Badge className="bg-orange-100 text-orange-700 text-xs">Pending</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(entry)}>
                                        Edit Rate
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Update Rate</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {editing.vehicleNumber} · {editing.netWeight.toFixed(3)} T · {editing.partyName}
                            </p>
                            <div className="space-y-1">
                                <Label>Rate per Ton (₹)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold text-green-700">
                                ₹{(editing.netWeight * parseFloat(rate || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button onClick={handleRateUpdate} disabled={saving}>{saving ? "Saving…" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
