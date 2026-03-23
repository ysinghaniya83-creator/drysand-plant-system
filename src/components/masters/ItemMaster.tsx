"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Item, ItemType } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
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

const ITEM_TYPES: { value: ItemType; label: string }[] = [
    { value: "raw_sand", label: "Raw Sand" },
    { value: "coal", label: "Coal" },
    { value: "finished_sand", label: "Finished Sand (Grade)" },
    { value: "bag", label: "Packaging Bag" },
    { value: "other", label: "Other" },
];

const TYPE_COLORS: Record<ItemType, string> = {
    raw_sand: "bg-yellow-100 text-yellow-700",
    coal: "bg-gray-200 text-gray-700",
    finished_sand: "bg-green-100 text-green-700",
    bag: "bg-blue-100 text-blue-700",
    other: "bg-orange-100 text-orange-700",
};

const EMPTY = {
    name: "",
    type: "finished_sand" as ItemType,
    unit: "ton",
    gradeLabel: "",
};

export function ItemMaster() {
    const [items, setItems] = useState<Item[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return collectionListener<Item>("items", "name", setItems);
    }, []);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY });
        setOpen(true);
    }

    function openEdit(item: Item) {
        setEditing(item);
        setForm({
            name: item.name,
            type: item.type,
            unit: item.unit || "ton",
            gradeLabel: item.gradeLabel ?? "",
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) { toast.error("Name is required"); return; }
        setSaving(true);
        try {
            const data = {
                ...form,
                gradeLabel: form.gradeLabel?.trim() || null,
                ...(editing ? {} : { currentStock: 0 }),
            };
            if (editing) {
                await updateDocument("items", editing.id, data);
                toast.success("Item updated");
            } else {
                await addDocument("items", data);
                toast.success("Item added");
            }
            setOpen(false);
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(item: Item) {
        if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
        await deleteDocument("items", item.id);
        toast.info("Item deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Each finished sand grade (600µm, 1200µm, etc.) is a separate item with its own stock ledger.</p>
                <Button size="sm" onClick={openAdd}>+ Add Item</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Name</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Type</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Grade</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider">Unit</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider text-right">Current Stock</TableHead>
                            <TableHead className="text-gray-600 text-sm font-semibold uppercase tracking-wider"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-base text-muted-foreground py-10">
                                    No items found. Add raw materials and sand grades to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium text-sm">{item.name}</TableCell>
                                <TableCell>
                                    <Badge className={`${TYPE_COLORS[item.type]} hover:${TYPE_COLORS[item.type]} text-xs`}>
                                        {ITEM_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">{item.gradeLabel || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">
                                    {item.currentStock?.toLocaleString() ?? 0} {item.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(item)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(item)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Finished Sand 600µm" />
                        </div>
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as ItemType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ITEM_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {form.type === "finished_sand" && (
                            <div className="space-y-1">
                                <Label>Grade Label</Label>
                                <Input value={form.gradeLabel} onChange={(e) => setForm({ ...form, gradeLabel: e.target.value })} placeholder="e.g. 600µm, 1200µm" />
                            </div>
                        )}
                        <div className="space-y-1">
                            <Label>Unit</Label>
                            <Select value={form.unit} onValueChange={(v) => v && setForm({ ...form, unit: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ton">Ton</SelectItem>
                                    <SelectItem value="kg">Kg</SelectItem>
                                    <SelectItem value="bag">Bag</SelectItem>
                                    <SelectItem value="piece">Piece</SelectItem>
                                </SelectContent>
                            </Select>
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
