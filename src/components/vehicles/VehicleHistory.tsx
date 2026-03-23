"use client";

import { useState } from "react";
import type { InwardEntry, OutwardEntry } from "@/types";
import { queryDocuments } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function fmtDate(ts: Timestamp) {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function VehicleHistory() {
    const [search, setSearch] = useState("");
    const [input, setInput] = useState("");
    const [inwards, setInwards] = useState<InwardEntry[]>([]);
    const [outwards, setOutwards] = useState<OutwardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    async function handleSearch() {
        const q = input.trim().toUpperCase();
        if (!q) return;
        setLoading(true);
        setSearch(q);
        try {
            const [inRaw, outRaw] = await Promise.all([
                queryDocuments<InwardEntry>("inwardEntries", "vehicleNumber", q),
                queryDocuments<OutwardEntry>("outwardEntries", "vehicleNumber", q),
            ]);
            setInwards(inRaw.sort((a, b) => b.date.seconds - a.date.seconds));
            setOutwards(outRaw.sort((a, b) => b.date.seconds - a.date.seconds));
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 max-w-sm">
                <Input
                    placeholder="Vehicle number…"
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="font-mono uppercase"
                />
                <Button onClick={handleSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
            </div>

            {searched && (
                <>
                    <p className="text-sm text-muted-foreground">
                        Results for <span className="font-mono font-semibold">{search}</span>:
                        {" "}{inwards.length} inward, {outwards.length} outward
                    </p>
                    <Tabs defaultValue="inward">
                        <TabsList>
                            <TabsTrigger value="inward">Inward ({inwards.length})</TabsTrigger>
                            <TabsTrigger value="outward">Outward ({outwards.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="inward">
                            <div className="border rounded-md overflow-hidden mt-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-sand-50 border-b border-sand-100">
                                            {["Date", "Party", "Material", "Gross (T)", "Tare (T)", "Net (T)", "Royalty (T)"].map((h) => (
                                                <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inwards.length === 0 && (
                                            <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">No inward entries.</TableCell></TableRow>
                                        )}
                                        {inwards.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="font-mono text-sm">{fmtDate(e.date)}</TableCell>
                                                <TableCell className="text-sm">{e.partyName}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-xs capitalize">{e.materialType}</Badge></TableCell>
                                                <TableCell className="font-mono text-sm">{e.grossWeight}</TableCell>
                                                <TableCell className="font-mono text-sm">{e.tareWeight}</TableCell>
                                                <TableCell className="font-mono text-sm font-semibold">{e.netWeight}</TableCell>
                                                <TableCell className="font-mono text-sm">{e.royaltyWeight ?? "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                        <TabsContent value="outward">
                            <div className="border rounded-md overflow-hidden mt-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-sand-50 border-b border-sand-100">
                                            {["Date", "Party", "Item", "Type", "Gross (T)", "Tare (T)", "Net (T)"].map((h) => (
                                                <TableHead key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outwards.length === 0 && (
                                            <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">No outward entries.</TableCell></TableRow>
                                        )}
                                        {outwards.map((e) => (
                                            <TableRow key={e.id}>
                                                <TableCell className="font-mono text-sm">{fmtDate(e.date)}</TableCell>
                                                <TableCell className="text-sm">{e.partyName}</TableCell>
                                                <TableCell className="text-sm">{e.itemName}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-xs capitalize">{e.dispatchType.replace("_", " ")}</Badge></TableCell>
                                                <TableCell className="font-mono text-sm">{e.grossWeight}</TableCell>
                                                <TableCell className="font-mono text-sm">{e.tareWeight}</TableCell>
                                                <TableCell className="font-mono text-sm font-semibold">{e.netWeight}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
