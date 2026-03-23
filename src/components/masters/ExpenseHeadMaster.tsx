"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ExpenseHead } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
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

export function ExpenseHeadMaster() {
    const [heads, setHeads] = useState<ExpenseHead[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseHead | null>(null);
    const [name, setName] = useState("");
    const [includeInProfit, setIncludeInProfit] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return collectionListener<ExpenseHead>("expenseHeads", "name", setHeads);
    }, []);

    function openAdd() {
        setEditing(null);
        setName("");
        setIncludeInProfit(true);
        setOpen(true);
    }

    function openEdit(h: ExpenseHead) {
        setEditing(h);
        setName(h.name);
        setIncludeInProfit(h.includeInProfit);
        setOpen(true);
    }

    async function handleSave() {
        if (!name.trim()) { toast.error("Name is required"); return; }
        setSaving(true);
        try {
            const data = { name: name.trim(), includeInProfit };
            if (editing) {
                await updateDocument("expenseHeads", editing.id, data);
                toast.success("Expense head updated");
            } else {
                await addDocument("expenseHeads", data);
                toast.success("Expense head added");
            }
            setOpen(false);
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(h: ExpenseHead) {
        if (!confirm(`Delete "${h.name}"?`)) return;
        await deleteDocument("expenseHeads", h.id);
        toast.info("Expense head deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Heads marked "In Profit" are deducted from revenue in the profit calculation.</p>
                <Button size="sm" onClick={openAdd}>+ Add Head</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Expense Head</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Included in Profit</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {heads.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-base text-muted-foreground py-10">
                                    No expense heads. Add diesel, labour, maintenance, etc.
                                </TableCell>
                            </TableRow>
                        )}
                        {heads.map((h) => (
                            <TableRow key={h.id}>
                                <TableCell className="font-medium text-sm">{h.name}</TableCell>
                                <TableCell>
                                    {h.includeInProfit
                                        ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Yes</Badge>
                                        : <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">No</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(h)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(h)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Expense Head" : "Add Expense Head"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Name *</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diesel, Labour, Maintenance" />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="includeInProfit"
                                type="checkbox"
                                checked={includeInProfit}
                                onChange={(e) => setIncludeInProfit(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="includeInProfit" className="cursor-pointer font-normal">
                                Include in profit calculation
                            </Label>
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
