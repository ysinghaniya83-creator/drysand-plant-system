"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { ExpenseEntry, ExpenseHead } from "@/types";
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

interface ExpenseForm {
    date: string;
    headId: string;
    headName: string;
    amount: string;
    description: string;
}

const EMPTY_FORM: ExpenseForm = {
    date: new Date().toISOString().split("T")[0],
    headId: "",
    headName: "",
    amount: "",
    description: "",
};

export function ExpenseEntryList() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<ExpenseEntry[]>([]);
    const [heads, setHeads] = useState<ExpenseHead[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseEntry | null>(null);
    const [form, setForm] = useState<ExpenseForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<ExpenseEntry>("expenseEntries", "date", setEntries, "desc"), []);
    useEffect(() => collectionListener<ExpenseHead>("expenseHeads", "name", setHeads), []);

    const totalExpenses = entries.reduce((s, e) => s + e.amount, 0);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(entry: ExpenseEntry) {
        setEditing(entry);
        setForm({
            date: entry.date.toDate().toISOString().split("T")[0],
            headId: entry.headId,
            headName: entry.headName,
            amount: String(entry.amount),
            description: entry.description ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.headId) { toast.error("Expense head is required"); return; }
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Amount is required"); return; }

        setSaving(true);
        try {
            const data = {
                date: Timestamp.fromDate(new Date(form.date)),
                headId: form.headId,
                headName: form.headName,
                amount: Math.round(parseFloat(form.amount) * 100) / 100,
                description: form.description.trim() || null,
                createdBy: user?.uid || "",
            };

            if (editing) {
                await updateDocument("expenseEntries", editing.id, data);
                toast.success("Expense updated");
            } else {
                await addDocument("expenseEntries", data);
                toast.success("Expense recorded");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(entry: ExpenseEntry) {
        if (!confirm(`Delete this expense of ₹${entry.amount.toLocaleString("en-IN")}?`)) return;
        await deleteDocument("expenseEntries", entry.id);
        toast.info("Expense deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Record all operational expenses.</p>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                        Total: ₹{totalExpenses.toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" onClick={openAdd}>+ Add Expense</Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Date</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Head</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Description</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Amount</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                                    No expenses recorded yet.
                                </TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                <TableCell className="text-sm font-semibold">{entry.headName}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{entry.description || "—"}</TableCell>
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
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Date *</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Expense Head *</Label>
                            <Select value={form.headId} onValueChange={(v) => {
                                if (!v) return;
                                const h = heads.find((x) => x.id === v);
                                setForm({ ...form, headId: v, headName: h?.name ?? "" });
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select head…" /></SelectTrigger>
                                <SelectContent>
                                    {heads.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Amount (₹) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes…" />
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
