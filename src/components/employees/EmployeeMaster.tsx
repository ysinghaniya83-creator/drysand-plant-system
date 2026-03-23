"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { Employee, EmployeeType } from "@/types";
import { collectionListener, addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

const TYPE_LABELS: Record<EmployeeType, string> = {
    permanent: "Permanent",
    daily_wage: "Daily Wage",
    contract: "Contract",
};

interface EmployeeForm {
    name: string;
    phone: string;
    address: string;
    type: EmployeeType;
    designation: string;
    joiningDate: string;
    salaryOrWage: string;
    aadhaarNumber: string;
    panNumber: string;
    bankAccount: string;
    bankIfsc: string;
    isActive: boolean;
}

const EMPTY_FORM: EmployeeForm = {
    name: "",
    phone: "",
    address: "",
    type: "permanent",
    designation: "",
    joiningDate: new Date().toISOString().split("T")[0],
    salaryOrWage: "",
    aadhaarNumber: "",
    panNumber: "",
    bankAccount: "",
    bankIfsc: "",
    isActive: true,
};

export function EmployeeMaster() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<EmployeeForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => collectionListener<Employee>("employees", "name", setEmployees), []);

    const filtered = showInactive ? employees : employees.filter((e) => e.isActive);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, joiningDate: new Date().toISOString().split("T")[0] });
        setOpen(true);
    }

    function openEdit(emp: Employee) {
        setEditing(emp);
        setForm({
            name: emp.name,
            phone: emp.phone ?? "",
            address: emp.address ?? "",
            type: emp.type,
            designation: emp.designation ?? "",
            joiningDate: emp.joiningDate.toDate().toISOString().split("T")[0],
            salaryOrWage: String(emp.salaryOrWage),
            aadhaarNumber: emp.aadhaarNumber ?? "",
            panNumber: emp.panNumber ?? "",
            bankAccount: emp.bankAccount ?? "",
            bankIfsc: emp.bankIfsc ?? "",
            isActive: emp.isActive,
        });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) { toast.error("Name is required"); return; }
        if (!form.salaryOrWage || parseFloat(form.salaryOrWage) < 0) { toast.error("Salary/Wage is required"); return; }
        setSaving(true);
        try {
            const data = {
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                address: form.address.trim() || null,
                type: form.type,
                designation: form.designation.trim() || null,
                joiningDate: Timestamp.fromDate(new Date(form.joiningDate)),
                salaryOrWage: parseFloat(form.salaryOrWage),
                aadhaarNumber: form.aadhaarNumber.trim() || null,
                panNumber: form.panNumber.trim() || null,
                bankAccount: form.bankAccount.trim() || null,
                bankIfsc: form.bankIfsc.trim() || null,
                documentUrls: editing?.documentUrls ?? [],
                isActive: form.isActive,
                createdBy: user?.uid || "",
            };
            if (editing) {
                await updateDocument("employees", editing.id, data);
                toast.success("Employee updated");
            } else {
                await addDocument("employees", data);
                toast.success("Employee added");
            }
            setOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(emp: Employee) {
        if (!confirm(`Delete employee "${emp.name}"? This cannot be undone.`)) return;
        await deleteDocument("employees", emp.id);
        toast.info("Employee deleted");
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={showInactive} onCheckedChange={(v: boolean) => setShowInactive(v)} id="inactive-toggle" />
                    <label htmlFor="inactive-toggle">Show inactive</label>
                </div>
                <Button size="sm" onClick={openAdd}>+ Add Employee</Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-100 border-b-2 border-gray-200">
                            {["Name", "Designation", "Type", "Joining Date", "Salary/Wage", "Status", ""].map((h) => (
                                <TableHead key={h} className="text-gray-600 text-sm font-semibold uppercase tracking-wider">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No employees found.</TableCell>
                            </TableRow>
                        )}
                        {filtered.map((emp) => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <div className="text-sm font-medium">{emp.name}</div>
                                    {emp.phone && <div className="text-xs text-muted-foreground">{emp.phone}</div>}
                                </TableCell>
                                <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[emp.type]}</Badge></TableCell>
                                <TableCell className="font-mono text-sm">{emp.joiningDate.toDate().toLocaleDateString("en-IN")}</TableCell>
                                <TableCell className="font-mono text-sm">₹{emp.salaryOrWage.toLocaleString("en-IN")}</TableCell>
                                <TableCell>
                                    <Badge className={`${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"} text-xs`}>
                                        {emp.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(emp)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(emp)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                                <Label>Name *</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                            </div>
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Mobile number" />
                            </div>
                            <div className="space-y-1">
                                <Label>Designation</Label>
                                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Post / Role" />
                            </div>
                            <div className="space-y-1">
                                <Label>Employee Type *</Label>
                                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v as EmployeeType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(TYPE_LABELS) as EmployeeType[]).map((t) => (
                                            <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Joining Date</Label>
                                <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Salary / Daily Wage (₹) *</Label>
                                <Input type="number" min="0" step="0.01" value={form.salaryOrWage} onChange={(e) => setForm({ ...form, salaryOrWage: e.target.value })} placeholder="0" />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label>Address</Label>
                                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Residential address" />
                            </div>
                            <div className="space-y-1">
                                <Label>Aadhaar Number</Label>
                                <Input value={form.aadhaarNumber} maxLength={12} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, "") })} placeholder="12-digit aadhaar" />
                            </div>
                            <div className="space-y-1">
                                <Label>PAN Number</Label>
                                <Input value={form.panNumber} maxLength={10} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                            </div>
                            <div className="space-y-1">
                                <Label>Bank Account</Label>
                                <Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="Account number" />
                            </div>
                            <div className="space-y-1">
                                <Label>Bank IFSC</Label>
                                <Input value={form.bankIfsc} maxLength={11} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })} placeholder="SBIN0012345" />
                            </div>
                            <div className="flex items-center gap-2 col-span-2 pt-1">
                                <Switch checked={form.isActive} onCheckedChange={(v: boolean) => setForm({ ...form, isActive: v })} id="active-toggle" />
                                <label htmlFor="active-toggle" className="text-sm">Active</label>
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
