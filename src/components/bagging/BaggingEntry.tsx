"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { BaggingEntry, Item, BagSize } from "@/types";
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

interface BaggingForm {
    date: string;
    itemId: string;
    gradeName: string;
    bagSizeId: string;
    bagSizeLabel: string;
    bagWeightKg: number;
    numberOfBags: string;
    remarks: string;
}

const EMPTY_FORM: BaggingForm = {
    date: new Date().toISOString().split("T")[0],
    itemId: "",
    gradeName: "",
    bagSizeId: "",
    bagSizeLabel: "",
    bagWeightKg: 0,
    numberOfBags: "",
    remarks: "",
};

export function BaggingEntryList() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<BaggingEntry[]>([]);
    const [finishedItems, setFinishedItems] = useState<Item[]>([]);
    const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BaggingEntry | null>(null);
    const [form, setForm] = useState<BaggingForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<BaggingEntry>("baggingEntries", "date", setEntries, "desc"), []);
    useEffect(() => {
        return collectionListener<Item>("items", "name", (items) => {
            setFinishedItems(items.filter((i) => i.type === "finished_sand"));
        });
    }, []);
    useEffect(() => collectionListener<BagSize>("bagSizes", "label", setBagSizes), []);

    const totalWeightTons = (parseInt(form.numberOfBags || "0") * form.bagWeightKg) / 1000;

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(entry: BaggingEntry) {
        setEditing(entry);
        const bs = bagSizes.find((b) => b.id === entry.bagSizeId);
        setForm({
            date: entry.date.toDate().toISOString().split("T")[0],
            itemId: entry.itemId,
            gradeName: entry.gradeName,
            bagSizeId: entry.bagSizeId,
            bagSizeLabel: entry.bagSizeLabel,
            bagWeightKg: bs?.weightKg ?? 0,
            numberOfBags: String(entry.numberOfBags),
            remarks: entry.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.itemId) { toast.error("Select a grade"); return; }
        if (!form.bagSizeId) { toast.error("Select a bag size"); return; }
        if (!form.numberOfBags || parseInt(form.numberOfBags) <= 0) { toast.error("Enter number of bags"); return; }

        setSaving(true);
        try {
            const numberOfBags = parseInt(form.numberOfBags);
            const totalWt = Math.round((numberOfBags * form.bagWeightKg / 1000) * 1000) / 1000;

            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                itemId: form.itemId,
                gradeName: form.gradeName,
                bagSizeId: form.bagSizeId,
                bagSizeLabel: form.bagSizeLabel,
                numberOfBags,
                totalWeightTons: totalWt,
                remarks: form.remarks.trim() || null,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("baggingEntries", editing.id, data);
                toast.success("Entry updated");
            } else {
                await addDocument("baggingEntries", data);
                toast.success("Bagging entry added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(entry: BaggingEntry) {
        if (!confirm(`Delete bagging entry for ${formatDate(entry.date)}?`)) return;
        await deleteDocument("baggingEntries", entry.id);
        toast.info("Entry deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Record daily bagging operations — finished sand packed into bags.
                </p>
                <Button size="sm" onClick={openAdd}>+ New Bagging Entry</Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bag Size</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Bags</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total Wt (T)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-base text-muted-foreground py-10">
                                    No bagging entries yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                <TableCell className="text-sm font-semibold">{entry.gradeName}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{entry.bagSizeLabel}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{entry.numberOfBags.toLocaleString("en-IN")}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">{entry.totalWeightTons.toFixed(3)}</TableCell>
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
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Bagging Entry" : "New Bagging Entry"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Finished Sand Grade *</Label>
                            <Select
                                value={form.itemId}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    const it = finishedItems.find((i) => i.id === v);
                                    setForm({ ...form, itemId: v, gradeName: it?.gradeLabel || it?.name || "" });
                                }}
                            >
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
                            <Select
                                value={form.bagSizeId}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    const bs = bagSizes.find((b) => b.id === v);
                                    setForm({
                                        ...form,
                                        bagSizeId: v,
                                        bagSizeLabel: bs?.label ?? "",
                                        bagWeightKg: bs?.weightKg ?? 0,
                                    });
                                }}
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
                            <Label>Number of Bags *</Label>
                            <Input
                                type="number"
                                min="1"
                                value={form.numberOfBags}
                                onChange={(e) => setForm({ ...form, numberOfBags: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Total Weight (T)</Label>
                            <div className="h-8 flex items-center px-3 border rounded-md bg-muted font-mono text-sm font-semibold">
                                {totalWeightTons > 0 ? `${totalWeightTons.toFixed(3)} T` : "—"}
                            </div>
                        </div>
                        <div className="space-y-1">
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
