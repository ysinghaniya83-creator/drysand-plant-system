"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { BagSize } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
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

export function BagSizeMaster() {
    const [bags, setBags] = useState<BagSize[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BagSize | null>(null);
    const [label, setLabel] = useState("");
    const [weightKg, setWeightKg] = useState<number | "">("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return collectionListener<BagSize>("bagSizes", "weightKg", setBags);
    }, []);

    function openAdd() {
        setEditing(null);
        setLabel("");
        setWeightKg("");
        setOpen(true);
    }

    function openEdit(b: BagSize) {
        setEditing(b);
        setLabel(b.label);
        setWeightKg(b.weightKg);
        setOpen(true);
    }

    async function handleSave() {
        if (!label.trim()) { toast.error("Label is required"); return; }
        if (!weightKg || weightKg <= 0) { toast.error("Weight must be greater than 0"); return; }
        setSaving(true);
        try {
            const data = { label: label.trim(), weightKg: Number(weightKg) };
            if (editing) {
                await updateDocument("bagSizes", editing.id, data);
                toast.success("Bag size updated");
            } else {
                await addDocument("bagSizes", data);
                toast.success("Bag size added");
            }
            setOpen(false);
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(b: BagSize) {
        if (!confirm(`Delete "${b.label}"?`)) return;
        await deleteDocument("bagSizes", b.id);
        toast.info("Bag size deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Define the bag sizes used in bagging and bag sales.</p>
                <Button size="sm" onClick={openAdd}>+ Add Bag Size</Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Weight (kg)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Weight (ton)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bags.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-base text-muted-foreground py-10">
                                    No bag sizes. Add 25 kg, 50 kg, etc.
                                </TableCell>
                            </TableRow>
                        )}
                        {bags.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell className="font-medium text-sm">{b.label}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{b.weightKg} kg</TableCell>
                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                    {(b.weightKg / 1000).toFixed(3)} ton
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(b)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(b)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Bag Size" : "Add Bag Size"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Label *</Label>
                            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 25 kg, 50 kg" />
                        </div>
                        <div className="space-y-1">
                            <Label>Weight (kg) *</Label>
                            <Input
                                type="number"
                                min={0.1}
                                step={0.1}
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                placeholder="25"
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
