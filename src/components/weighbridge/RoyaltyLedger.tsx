"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";
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

export function RoyaltyLedger() {
    const [entries, setEntries] = useState<InwardEntry[]>([]);

    useEffect(() => collectionListener<InwardEntry>("inwardEntries", "date", setEntries, "desc"), []);

    const royaltyEntries = entries.filter((e) => e.royaltyNumber);

    const totalDiff = royaltyEntries.reduce((sum, e) => {
        return sum + (e.netWeight - e.royaltyWeight);
    }, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Compares weighbridge weight vs. royalty slip weight for each inward entry.
                </p>
                {royaltyEntries.length > 0 && (
                    <div className="text-sm font-mono font-semibold">
                        Net Difference:{" "}
                        <span className={totalDiff >= 0 ? "text-green-600" : "text-red-600"}>
                            {totalDiff >= 0 ? "+" : ""}{totalDiff.toFixed(3)} T
                        </span>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-sand-100">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-sand-50 border-b border-sand-100">
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Royalty #</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Royalty Wt (T)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Bridge Wt (T)</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Difference (T)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {royaltyEntries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-base text-muted-foreground py-10">
                                    No royalty entries found. Add royalty number when recording inward entries.
                                </TableCell>
                            </TableRow>
                        )}
                        {royaltyEntries.map((entry) => {
                            const diff = entry.netWeight - entry.royaltyWeight;
                            return (
                                <TableRow key={entry.id}>
                                    <TableCell className="text-sm font-mono">{formatDate(entry.date)}</TableCell>
                                    <TableCell className="font-semibold text-sm font-mono uppercase">{entry.vehicleNumber}</TableCell>
                                    <TableCell>
                                        <Badge className={`${entry.materialType === "sand" ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-700"} text-xs capitalize`}>
                                            {entry.materialType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">{entry.royaltyNumber}</TableCell>
                                    <TableCell className="text-right font-mono text-sm">{entry.royaltyWeight.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm font-semibold">{entry.netWeight.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono text-sm font-semibold">
                                        <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                                            {diff >= 0 ? "+" : ""}{diff.toFixed(3)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
