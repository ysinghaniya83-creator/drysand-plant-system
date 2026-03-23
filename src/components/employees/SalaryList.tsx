"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { Employee, AttendanceEntry, SalaryPayment } from "@/types";
import { collectionListener, addDocument, updateDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function tsToMonthKey(ts: Timestamp) {
    const d = ts.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeSalary(emp: Employee, daysWorked: number): number {
    if (emp.type === "daily_wage") return emp.salaryOrWage * daysWorked;
    // permanent / contract — monthly fixed salary
    return emp.salaryOrWage;
}

// ─── Dialog form ──────────────────────────────────────────────────────────────

interface SalaryDialogProps {
    employee: Employee;
    daysWorked: number;
    salaryAmount: number;
    existing: SalaryPayment | null;
    onClose: () => void;
}

function SalaryDialog({ employee, daysWorked, salaryAmount, existing, onClose }: SalaryDialogProps) {
    const { user } = useAuth();
    const [deductions, setDeductions] = useState(String(existing?.deductions ?? 0));
    const [isPaid, setIsPaid] = useState(existing?.isPaid ?? false);
    const [saving, setSaving] = useState(false);

    const netPayable = Math.max(0, salaryAmount - (parseFloat(deductions) || 0));

    async function handleSave() {
        setSaving(true);
        try {
            const data: Record<string, unknown> = {
                employeeId: employee.id,
                employeeName: employee.name,
                month: tsToMonthKey(Timestamp.now()),
                daysWorked,
                salaryAmount: Math.round(salaryAmount * 100) / 100,
                deductions: parseFloat(deductions) || 0,
                netPayable: Math.round(netPayable * 100) / 100,
                isPaid,
                paidDate: isPaid ? (existing?.paidDate ?? Timestamp.now()) : null,
                createdBy: user?.uid || "",
            };
            if (existing) {
                await updateDocument("salaryPayments", existing.id, data);
                toast.success("Salary record updated");
            } else {
                await addDocument("salaryPayments", data);
                toast.success("Salary record saved");
            }
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{existing ? "Edit Salary" : "Record Salary"} — {employee.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-3 bg-sand-50 rounded-xl">
                        <span className="text-muted-foreground">Employee type</span>
                        <span className="capitalize font-medium">{employee.type.replace("_", " ")}</span>
                        <span className="text-muted-foreground">Days worked</span>
                        <span className="font-mono font-medium">{daysWorked}</span>
                        <span className="text-muted-foreground">Base salary</span>
                        <span className="font-mono font-medium">₹{salaryAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="space-y-1">
                        <Label>Deductions (₹)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={deductions}
                            onChange={(e) => setDeductions(e.target.value)}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">Advance recovery, absences, fines, etc.</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <span className="text-emerald-700 font-semibold">Net Payable</span>
                        <span className="font-mono font-bold text-emerald-700 text-lg">₹{netPayable.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <input
                            id="isPaid"
                            type="checkbox"
                            checked={isPaid}
                            onChange={(e) => setIsPaid(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="isPaid" className="cursor-pointer font-normal">Mark as Paid</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SalaryList() {
    const [month, setMonth] = useState(currentMonthKey());
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
    const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
    const [dialogEmp, setDialogEmp] = useState<Employee | null>(null);

    useEffect(() => collectionListener<Employee>("employees", "name", setEmployees), []);
    useEffect(() => collectionListener<AttendanceEntry>("attendance", "date", setAttendance), []);
    useEffect(() => collectionListener<SalaryPayment>("salaryPayments", "month", setSalaryPayments), []);

    const activeEmployees = employees.filter((e) => e.isActive);

    const monthAttendance = useMemo(
        () => attendance.filter((a) => tsToMonthKey(a.date) === month),
        [attendance, month]
    );

    const monthPayments = useMemo(
        () => salaryPayments.filter((p) => p.month === month),
        [salaryPayments, month]
    );

    const rows = useMemo(() => activeEmployees.map((emp) => {
        const empAttendance = monthAttendance.filter((a) => a.employeeId === emp.id && a.present);
        const daysWorked = empAttendance.length;
        const salaryAmount = computeSalary(emp, daysWorked);
        const payment = monthPayments.find((p) => p.employeeId === emp.id) ?? null;
        return { emp, daysWorked, salaryAmount, payment };
    }), [activeEmployees, monthAttendance, monthPayments]);

    const totalPayable = rows.reduce((s, r) => s + (r.payment?.netPayable ?? r.salaryAmount), 0);
    const totalPaid = rows.filter((r) => r.payment?.isPaid).reduce((s, r) => s + (r.payment!.netPayable), 0);
    const pendingCount = rows.filter((r) => !r.payment?.isPaid).length;

    const dialogRow = dialogEmp ? rows.find((r) => r.emp.id === dialogEmp.id) : null;

    return (
        <div className="space-y-4">
            {/* Month picker + summary */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Month</Label>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-40 h-8 text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                        Total payable: ₹{totalPayable.toLocaleString("en-IN")}
                    </span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full">
                        Paid: ₹{totalPaid.toLocaleString("en-IN")}
                    </span>
                    {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {monthLabel(month)} — Daily wage salary = wage × days present. Permanent/contract = fixed monthly salary.
                Attendance for this month must be recorded first.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            {["Employee", "Type", "Days Present", "Base Salary (₹)", "Deductions (₹)", "Net Payable (₹)", "Status", ""].map((h) => (
                                <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right first:text-left">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                                    No active employees found.
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map(({ emp, daysWorked, salaryAmount, payment }) => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <div className="text-sm font-medium">{emp.name}</div>
                                    {emp.designation && <div className="text-xs text-muted-foreground">{emp.designation}</div>}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground capitalize">{emp.type.replace("_", " ")}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{daysWorked}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    ₹{(payment?.salaryAmount ?? salaryAmount).toLocaleString("en-IN")}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-red-600">
                                    {payment ? `₹${payment.deductions.toLocaleString("en-IN")}` : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold text-emerald-700">
                                    ₹{(payment?.netPayable ?? salaryAmount).toLocaleString("en-IN")}
                                </TableCell>
                                <TableCell className="text-right">
                                    {payment?.isPaid ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Paid</Badge>
                                    ) : (
                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">Unpaid</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDialogEmp(emp)}>
                                        {payment ? "Edit" : "Record"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {dialogEmp && dialogRow && (
                <SalaryDialog
                    employee={dialogRow.emp}
                    daysWorked={dialogRow.daysWorked}
                    salaryAmount={dialogRow.payment?.salaryAmount ?? dialogRow.salaryAmount}
                    existing={dialogRow.payment}
                    onClose={() => setDialogEmp(null)}
                />
            )}
        </div>
    );
}
