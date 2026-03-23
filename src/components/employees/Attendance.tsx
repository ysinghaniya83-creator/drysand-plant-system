"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { AttendanceEntry, Employee } from "@/types";
import { collectionListener, queryDocuments, addDocument, updateDocument } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function AttendanceSheet() {
    const { user } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<Record<string, { present: boolean; ot: string; remarks: string; entryId?: string }>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => collectionListener<Employee>("employees", "name", setEmployees), []);

    async function loadAttendance() {
        if (employees.length === 0) return;
        setLoading(true);
        try {
            const dateTs = Timestamp.fromDate(new Date(date));
            const startOfDay = new Date(date);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            startOfDay.setHours(0, 0, 0, 0);

            const existing = await queryDocuments<AttendanceEntry>("attendance", "date", dateTs);

            const rec: Record<string, { present: boolean; ot: string; remarks: string; entryId?: string }> = {};
            for (const emp of employees.filter((e) => e.isActive)) {
                const found = existing.find((a) => a.employeeId === emp.id);
                rec[emp.id] = found
                    ? { present: found.present, ot: String(found.overtimeHours ?? ""), remarks: found.remarks ?? "", entryId: found.id }
                    : { present: true, ot: "", remarks: "" };
            }
            setAttendance(rec);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadAttendance(); }, [date, employees.length]);

    async function handleSave() {
        setSaving(true);
        try {
            const activeEmps = employees.filter((e) => e.isActive);
            await Promise.all(activeEmps.map((emp) => {
                const rec = attendance[emp.id];
                if (!rec) return;
                const data = {
                    date: Timestamp.fromDate(new Date(date)),
                    employeeId: emp.id,
                    employeeName: emp.name,
                    present: rec.present,
                    overtimeHours: rec.ot ? parseFloat(rec.ot) : 0,
                    remarks: rec.remarks.trim() || null,
                    createdBy: user?.uid || "",
                };
                if (rec.entryId) {
                    return updateDocument("attendance", rec.entryId, data);
                } else {
                    return addDocument("attendance", data);
                }
            }));
            toast.success("Attendance saved");
            await loadAttendance();
        } catch (e) {
            console.error(e);
            toast.error("Failed to save attendance");
        } finally {
            setSaving(false);
        }
    }

    const activeEmps = employees.filter((e) => e.isActive);
    const presentCount = Object.values(attendance).filter((r) => r.present).length;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
                </div>
                <div className="pt-5 text-sm text-muted-foreground">
                    {presentCount} / {activeEmps.length} present
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
                <>
                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-900 hover:bg-gray-900">
                                    {["Employee", "Type", "Present", "OT Hours", "Remarks"].map((h) => (
                                        <TableHead key={h} className="text-white text-xs font-mono uppercase">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeEmps.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No active employees.</TableCell></TableRow>
                                )}
                                {activeEmps.map((emp) => {
                                    const rec = attendance[emp.id] ?? { present: true, ot: "", remarks: "" };
                                    return (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <div className="text-sm font-medium">{emp.name}</div>
                                                {emp.designation && <div className="text-xs text-muted-foreground">{emp.designation}</div>}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{emp.type.replace("_", " ")}</TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={rec.present}
                                                    onCheckedChange={(v: boolean) => setAttendance({ ...attendance, [emp.id]: { ...rec, present: v } })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    className="h-7 w-20 font-mono text-sm"
                                                    value={rec.ot}
                                                    onChange={(e) => setAttendance({ ...attendance, [emp.id]: { ...rec, ot: e.target.value } })}
                                                    placeholder="0"
                                                    disabled={!rec.present}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-7 text-sm max-w-48"
                                                    value={rec.remarks}
                                                    onChange={(e) => setAttendance({ ...attendance, [emp.id]: { ...rec, remarks: e.target.value } })}
                                                    placeholder="Optional"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <Button onClick={handleSave} disabled={saving || activeEmps.length === 0}>{saving ? "Saving…" : "Save Attendance"}</Button>
                </>
            )}
        </div>
    );
}
