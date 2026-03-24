"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { InwardEntry, LooseSale, BagSale, ProductionEntry, PurchaseRegisterEntry, ExpenseEntry, BaggingEntry, DailyClosingStock, Employee } from "@/types";
import { collectionListener } from "@/lib/firestore";
import { ArrowDownToLine, TrendingUp, Factory, Package, Banknote, ShoppingCart, Receipt, BarChart2, TrendingDown, Layers, Flame, AlertTriangle, CheckCircle } from "lucide-react";

function isToday(ts: Timestamp) {
    const d = ts.toDate();
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function isThisMonth(ts: Timestamp) {
    const d = ts.toDate();
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    accentClass,
    negative,
    delay = 0,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    accentClass: string;
    negative?: boolean;
    delay?: number;
}) {
    return (
        <div
            className="card p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
                    <Icon size={17} className="text-white" />
                </div>
            </div>
            <div>
                <p className={`text-[1.45rem] font-bold tabular-nums leading-tight font-mono tracking-tight ${negative ? "text-red-600" : "text-gray-900"}`}>
                    {value}
                </p>
                {sub && (
                    <p className="text-[12px] text-gray-400 font-medium mt-1">{sub}</p>
                )}
            </div>
        </div>
    );
}

function SectionHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</span>
            <div className="flex-1 h-px bg-sand-200" />
        </div>
    );
}

export function DashboardOverview() {
    const [inwards, setInwards] = useState<InwardEntry[]>([]);
    const [looseSales, setLooseSales] = useState<LooseSale[]>([]);
    const [bagSales, setBagSales] = useState<BagSale[]>([]);
    const [productions, setProductions] = useState<ProductionEntry[]>([]);
    const [baggings, setBaggings] = useState<BaggingEntry[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRegisterEntry[]>([]);
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [closingStocks, setClosingStocks] = useState<DailyClosingStock[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    useEffect(() => collectionListener<InwardEntry>("inwardEntries", "date", setInwards), []);
    useEffect(() => collectionListener<LooseSale>("looseSales", "date", setLooseSales), []);
    useEffect(() => collectionListener<BagSale>("bagSales", "date", setBagSales), []);
    useEffect(() => collectionListener<ProductionEntry>("productionEntries", "date", setProductions), []);
    useEffect(() => collectionListener<BaggingEntry>("baggings", "date", setBaggings), []);
    useEffect(() => collectionListener<PurchaseRegisterEntry>("purchaseRegister", "date", setPurchases), []);
    useEffect(() => collectionListener<ExpenseEntry>("expenses", "date", setExpenses), []);
    useEffect(() => collectionListener<DailyClosingStock>("closingStock", "date", setClosingStocks, "desc"), []);
    useEffect(() => collectionListener<Employee>("employees", "name", setEmployees), []);

    const todayInward = inwards.filter((r) => isToday(r.date));
    const todayInwardTons = todayInward.reduce((s, r) => s + r.netWeight, 0);

    const todayProduction = productions.filter((r) => isToday(r.date));
    const todayProdTons = todayProduction.reduce((s, r) => s + r.outputs.reduce((x, o) => x + o.quantity, 0), 0);

    const todayLooseSales = looseSales.filter((r) => isToday(r.date));
    const todayBagSales = bagSales.filter((r) => isToday(r.date));
    const todaySaleAmount = todayLooseSales.reduce((s, r) => s + r.totalAmount, 0) + todayBagSales.reduce((s, r) => s + r.totalAmount, 0);

    const todayBagging = baggings.filter((r) => isToday(r.date));
    const todayBags = todayBagging.reduce((s, r) => s + r.numberOfBags, 0);

    const monthPurchase = purchases.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    // Revenue = sale amount only (excl. transport — transport is a pass-through cost)
    const monthRevenue = looseSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0)
        + bagSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthTransport = looseSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + (r.transportCost ?? 0), 0)
        + bagSales.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + (r.transportCost ?? 0), 0);
    const monthExpenses = expenses.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + r.amount, 0);
    const monthProfit = monthRevenue - monthTransport - monthPurchase - monthExpenses;

    const totalSandIn = inwards.filter((e) => e.materialType === "sand").reduce((s, e) => s + e.netWeight, 0);
    const totalCoalIn = inwards.filter((e) => e.materialType === "coal").reduce((s, e) => s + e.netWeight, 0);
    const totalSandUsed = productions.reduce((s, p) => s + p.sandUsed, 0);
    const totalCoalUsed = productions.reduce((s, p) => s + p.coalUsed, 0);
    const rawSandStock = totalSandIn - totalSandUsed;
    const coalStock = totalCoalIn - totalCoalUsed;

    // Alerts: stock shortages from latest closing stock record
    const latestClosing = closingStocks[0] ?? null;
    const stockShortageAlerts = latestClosing
        ? latestClosing.items.filter((it) => it.shortage > 0.05)
        : [];

    // Alerts: licence expiry (expired + expiring within 30 days)
    const now = Date.now();
    const licenceAlerts = employees
        .filter((e) => e.isActive && e.licenceExpiry)
        .map((e) => ({
            name: e.name,
            expiry: e.licenceExpiry!.toDate(),
            daysLeft: Math.ceil((e.licenceExpiry!.toDate().getTime() - now) / 86400000),
        }))
        .filter((a) => a.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

    // Alerts: low raw material
    const LOW_SAND = 50;
    const LOW_COAL = 5;
    const rawAlerts: { label: string; value: string; level: "warn" | "critical" }[] = [];
    if (rawSandStock < LOW_SAND) rawAlerts.push({ label: "Raw Sand stock low", value: `${rawSandStock.toFixed(2)} T remaining`, level: rawSandStock < 20 ? "critical" : "warn" });
    if (coalStock < LOW_COAL) rawAlerts.push({ label: "Coal stock low", value: `${coalStock.toFixed(2)} T remaining`, level: coalStock < 2 ? "critical" : "warn" });

    const totalAlerts = stockShortageAlerts.length + licenceAlerts.length + rawAlerts.length;

    const recentInward = [...inwards].sort((a, b) => b.date.seconds - a.date.seconds).slice(0, 8);

    const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="space-y-7 max-w-6xl">
            {/* Page header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-[1.4rem] font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-[13px] text-gray-400 font-medium mt-0.5">{today}</p>
                </div>
            </div>

            {/* Alerts */}
            {totalAlerts > 0 ? (
                <div className="animate-slide-up">
                    <SectionHeader label={`Alerts (${totalAlerts})`} />
                    <div className="space-y-2">
                        {rawAlerts.map((a, i) => (
                            <div key={a.label} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm animate-slide-up ${a.level === "critical" ? "bg-red-50 border-red-200 text-red-800" : "bg-orange-50 border-orange-200 text-orange-800"}`} style={{ animationDelay: `${i * 60}ms` }}>
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">{a.label}</span>
                                    <span className="ml-2 font-mono">{a.value}</span>
                                </div>
                            </div>
                        ))}
                        {stockShortageAlerts.map((it) => (
                            <div key={it.itemId} className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-800 text-sm">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">Stock shortage — {it.itemName}</span>
                                    <span className="ml-2 font-mono">{it.shortage.toFixed(3)} T system−physical</span>
                                    {latestClosing && <span className="ml-2 text-xs text-yellow-600">(as of {latestClosing.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})</span>}
                                </div>
                            </div>
                        ))}
                        {licenceAlerts.map((a) => (
                            <div key={a.name} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${a.daysLeft < 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-orange-50 border-orange-200 text-orange-800"}`}>
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">
                                        {a.daysLeft < 0 ? "Licence expired" : "Licence expiring soon"}
                                        {" — "}{a.name}
                                    </span>
                                    <span className="ml-2 text-xs">
                                        {a.daysLeft < 0
                                            ? `Expired ${Math.abs(a.daysLeft)} day${Math.abs(a.daysLeft) !== 1 ? "s" : ""} ago`
                                            : `Expires in ${a.daysLeft} day${a.daysLeft !== 1 ? "s" : ""}`}
                                        {" "}({a.expiry.toLocaleDateString("en-IN")})
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-100 bg-green-50 text-green-700 text-sm animate-slide-up">
                    <CheckCircle size={16} className="shrink-0" />
                    <span className="font-medium">All clear — no active alerts</span>
                </div>
            )}

            {/* Today's stats */}
            <div>
                <SectionHeader label="Today" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <StatCard label="Inward" value={`${todayInwardTons.toFixed(2)} T`} sub={`${todayInward.length} vehicle${todayInward.length !== 1 ? "s" : ""}`} icon={ArrowDownToLine} accentClass="bg-emerald-500" delay={0} />
                    <StatCard label="Production" value={`${todayProdTons.toFixed(2)} T`} sub={`${todayProduction.length} batch${todayProduction.length !== 1 ? "es" : ""}`} icon={Factory} accentClass="bg-blue-500" delay={75} />
                    <StatCard label="Sales" value={`₹${todaySaleAmount.toLocaleString("en-IN")}`} sub={`${todayLooseSales.length + todayBagSales.length} invoice${(todayLooseSales.length + todayBagSales.length) !== 1 ? "s" : ""}`} icon={TrendingUp} accentClass="bg-brand-600" delay={150} />
                    <StatCard label="Bagging" value={`${todayBags.toLocaleString("en-IN")}`} sub={`bags · ${todayBagging.length} batch${todayBagging.length !== 1 ? "es" : ""}`} icon={Package} accentClass="bg-violet-500" delay={225} />
                </div>
            </div>

            {/* Raw material stock */}
            <div>
                <SectionHeader label="Raw Material Stock" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <StatCard label="Raw Sand" value={`${rawSandStock.toFixed(2)} T`} sub={`${totalSandIn.toFixed(2)} T in — ${totalSandUsed.toFixed(2)} T used`} icon={Layers} accentClass={rawSandStock < 50 ? "bg-red-500" : "bg-amber-500"} negative={rawSandStock < 0} delay={0} />
                    <StatCard label="Coal" value={`${coalStock.toFixed(2)} T`} sub={`${totalCoalIn.toFixed(2)} T in — ${totalCoalUsed.toFixed(2)} T used`} icon={Flame} accentClass={coalStock < 5 ? "bg-red-500" : "bg-gray-600"} negative={coalStock < 0} delay={75} />
                </div>
            </div>

            {/* Monthly stats */}
            <div>
                <SectionHeader label="This Month" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <StatCard label="Revenue" value={`₹${monthRevenue.toLocaleString("en-IN")}`} icon={Banknote} accentClass="bg-emerald-600" delay={0} />
                    <StatCard label="Purchases" value={`₹${monthPurchase.toLocaleString("en-IN")}`} icon={ShoppingCart} accentClass="bg-orange-500" delay={75} />
                    <StatCard label="Expenses" value={`₹${monthExpenses.toLocaleString("en-IN")}`} icon={Receipt} accentClass="bg-red-400" delay={150} />
                    <StatCard label="Net Profit" value={`₹${monthProfit.toLocaleString("en-IN")}`} icon={monthProfit >= 0 ? BarChart2 : TrendingDown} accentClass={monthProfit >= 0 ? "bg-brand-600" : "bg-red-500"} negative={monthProfit < 0} delay={225} />
                </div>
            </div>

            {/* Recent inward entries */}
            <div className="animate-slide-up delay-300">
                <SectionHeader label="Recent Inward Entries" />
                <div className="card overflow-hidden">
                    {recentInward.length === 0 ? (
                        <div className="empty-state py-12">
                            <ArrowDownToLine size={28} className="text-gray-300 mb-3" />
                            <p className="text-gray-400 text-[13px]">No inward entries yet.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th>Vehicle</th>
                                    <th>Party</th>
                                    <th>Material</th>
                                    <th className="text-right">Net Weight</th>
                                    <th className="text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInward.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <span className="font-bold text-gray-900 tabular-nums tracking-wide text-[13px]">
                                                {r.vehicleNumber}
                                            </span>
                                        </td>
                                        <td className="text-gray-600 text-[13px]">{r.partyName}</td>
                                        <td>
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
                                                {r.materialType}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <span className="text-[13px] font-bold text-blue-600 tabular-nums">
                                                {r.netWeight.toFixed(2)} T
                                            </span>
                                        </td>
                                        <td className="text-right text-[12px] text-gray-400 tabular-nums">
                                            {r.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
