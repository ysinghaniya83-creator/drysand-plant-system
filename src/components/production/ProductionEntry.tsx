"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { ProductionEntry, ProductionGradeOutput, Item } from "@/types";
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

interface OutputRow {
    itemId: string;
    gradeName: string;
    quantity: string;
}

interface ProductionForm {
    date: string;
    sandUsed: string;
    coalUsed: string;
    outputs: OutputRow[];
    wastage: string;
    remarks: string;
}

function emptyForm(): ProductionForm {
    return {
        date: new Date().toISOString().split("T")[0],
        sandUsed: "",
        coalUsed: "",
        outputs: [{ itemId: "", gradeName: "", quantity: "" }],
        wastage: "",
        remarks: "",
    };
}

export function ProductionEntryList() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<ProductionEntry[]>([]);
    const [finishedItems, setFinishedItems] = useState<Item[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ProductionEntry | null>(null);
    const [form, setForm] = useState<ProductionForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<ProductionEntry>("productionEntries", "date", setEntries, "desc"), []);
    useEffect(() => {
        return collectionListener<Item>("items", "name", (items) => {
            setFinishedItems(items.filter((i) => i.type === "finished_sand"));
        });
    }, []);

    const totalOutput = form.outputs.reduce((s, o) => s + parseFloat(o.quantity || "0"), 0);

    function addOutputRow() {
        setForm((f) => ({
            ...f,
            outputs: [...f.outputs, { itemId: "", gradeName: "", quantity: "" }],
        }));
    }

    function removeOutputRow(index: number) {
        setForm((f) => ({
            ...f,
            outputs: f.outputs.filter((_, i) => i !== index),
        }));
    }

    function updateOutput(index: number, patch: Partial<OutputRow>) {
        setForm((f) => ({
            ...f,
            outputs: f.outputs.map((o, i) => (i === index ? { ...o, ...patch } : o)),
        }));
    }

    function openAdd() {
        setEditing(null);
        setForm(emptyForm());
        setOpen(true);
    }

    function openEdit(entry: ProductionEntry) {
        setEditing(entry);
        setForm({
            date: entry.date.toDate().toISOString().split("T")[0],
            sandUsed: String(entry.sandUsed),
            coalUsed: String(entry.coalUsed),
            outputs: entry.outputs.map((o) => ({
                itemId: o.itemId,
                gradeName: o.gradeName,
                quantity: String(o.quantity),
            })),
            wastage: String(entry.wastage),
            remarks: entry.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.sandUsed && !form.coalUsed) { toast.error("Enter raw material consumption"); return; }
        const validOutputs = form.outputs.filter((o) => o.itemId && parseFloat(o.quantity || "0") > 0);
        if (validOutputs.length === 0) { toast.error("Add at least one grade output"); return; }

        setSaving(true);
        try {
            const outputs: ProductionGradeOutput[] = validOutputs.map((o) => ({
                itemId: o.itemId,
                gradeName: o.gradeName,
                quantity: Math.round(parseFloat(o.quantity) * 1000) / 1000,
            }));

            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                sandUsed: parseFloat(form.sandUsed || "0"),
                coalUsed: parseFloat(form.coalUsed || "0"),
                outputs,
                wastage: parseFloat(form.wastage || "0"),
                remarks: form.remarks.trim() || null,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("productionEntries", editing.id, data);
                toast.success("Production entry updated");
            } else {
                await addDocument("productionEntries", data);
                toast.success("Production entry added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(entry: ProductionEntry) {
        if (!confirm(`Delete production entry for ${formatDate(entry.date)}?`)) return;
        await deleteDocument("productionEntries", entry.id);
        toast.info("Entry deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Record daily production — raw material consumed and finished sand grades produced.
                </p>
                <Button size="sm" onClick={openAdd}>+ New Production Entry</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Sand (T)</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Coal (T)</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Outputs</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Total Out (T)</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Wastage (T)</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-base text-muted-foreground py-10">
                                    No production entries yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry) => {
                            const totalOut = entry.outputs.reduce((s, o) => s + o.quantity, 0);
                            return (
                                <TableRow key={entry.id}>
                                    <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{entry.sandUsed.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{entry.coalUsed.toFixed(3)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {entry.outputs.map((o) => `${o.gradeName}: ${o.quantity.toFixed(3)}T`).join(", ")}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm font-semibold">{totalOut.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-orange-600">{entry.wastage.toFixed(3)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(entry)}>Edit</Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(entry)}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Production Entry" : "New Production Entry"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Raw Sand Used (T)</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={form.sandUsed}
                                    onChange={(e) => setForm({ ...form, sandUsed: e.target.value })}
                                    placeholder="0.000"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Coal Used (T)</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={form.coalUsed}
                                    onChange={(e) => setForm({ ...form, coalUsed: e.target.value })}
                                    placeholder="0.000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Grade Outputs *</Label>
                                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={addOutputRow}>
                                    + Add Grade
                                </Button>
                            </div>
                            {form.outputs.map((output, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Grade</Label>
                                        <Select
                                            value={output.itemId}
                                            onValueChange={(v) => {
                                                if (!v) return;
                                                const item = finishedItems.find((i) => i.id === v);
                                                updateOutput(idx, {
                                                    itemId: v,
                                                    gradeName: item?.gradeLabel || item?.name || "",
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select grade…" /></SelectTrigger>
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
                                        <Label className="text-xs">Quantity (T)</Label>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            className="h-8 text-xs"
                                            value={output.quantity}
                                            onChange={(e) => updateOutput(idx, { quantity: e.target.value })}
                                            placeholder="0.000"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-destructive mb-0"
                                        onClick={() => removeOutputRow(idx)}
                                        disabled={form.outputs.length === 1}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                            <div className="text-xs text-muted-foreground font-mono">
                                Total output: <span className="font-semibold">{totalOutput.toFixed(3)} T</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Wastage (T)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.wastage}
                                onChange={(e) => setForm({ ...form, wastage: e.target.value })}
                                placeholder="0.000"
                            />
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
