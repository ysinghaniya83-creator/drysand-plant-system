"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Party, PartyType } from "@/types";
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

const EMPTY: Omit<Party, "id" | "createdAt"> = {
    name: "",
    type: "both",
    phone: "",
    address: "",
    gstNumber: "",
    openingBalance: 0,
};

export function PartyMaster() {
    const [parties, setParties] = useState<Party[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Party | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        return collectionListener<Party>("parties", "name", setParties);
    }, []);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY });
        setOpen(true);
    }

    function openEdit(p: Party) {
        setEditing(p);
        setForm({
            name: p.name,
            type: p.type,
            phone: p.phone ?? "",
            address: p.address ?? "",
            gstNumber: p.gstNumber ?? "",
            openingBalance: p.openingBalance,
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) { toast.error("Name is required"); return; }
        setSaving(true);
        try {
            if (editing) {
                await updateDocument("parties", editing.id, form);
                toast.success("Party updated");
            } else {
                await addDocument("parties", form);
                toast.success("Party added");
            }
            setOpen(false);
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(p: Party) {
        if (!confirm(`Delete "${p.name}"?`)) return;
        await deleteDocument("parties", p.id);
        toast.info("Party deleted");
    }

    const filtered = parties.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.phone?.includes(search)
    );

    const typeBadge = (t: PartyType) => {
        const map: Record<PartyType, string> = {
            supplier: "bg-blue-100 text-blue-700",
            customer: "bg-green-100 text-green-700",
            both: "bg-purple-100 text-purple-700",
        };
        return <Badge className={`${map[t]} hover:${map[t]} capitalize text-xs`}>{t}</Badge>;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <Input
                    placeholder="Search parties…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs h-8 text-sm"
                />
                <Button size="sm" onClick={openAdd}>+ Add Party</Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                            <TableHead className="text-white text-xs font-mono uppercase">Name</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Type</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">Phone</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase">GST</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase text-right">Opening Bal.</TableHead>
                            <TableHead className="text-white text-xs font-mono uppercase"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                    No parties found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                <TableCell>{typeBadge(p.type)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.phone || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground font-mono">{p.gstNumber || "—"}</TableCell>
                                <TableCell className="text-sm text-right font-mono">
                                    {p.openingBalance !== 0 ? (
                                        <span className={p.openingBalance > 0 ? "text-red-600" : "text-green-600"}>
                                            ₹{Math.abs(p.openingBalance).toLocaleString()}
                                        </span>
                                    ) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(p)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(p)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Party" : "Add Party"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Party name" />
                        </div>
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as PartyType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="supplier">Supplier</SelectItem>
                                    <SelectItem value="customer">Customer</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                            </div>
                            <div className="space-y-1">
                                <Label>GST Number</Label>
                                <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" className="uppercase" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Address</Label>
                            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
                        </div>
                        <div className="space-y-1">
                            <Label>Opening Balance (₹)</Label>
                            <Input
                                type="number"
                                value={form.openingBalance}
                                onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">Positive = we owe them &nbsp;|&nbsp; Negative = they owe us</p>
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
