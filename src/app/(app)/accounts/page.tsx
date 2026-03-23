"use client";

import { useState } from "react";
import { PaymentList } from "@/components/accounts/Payments";
import { PartyLedger } from "@/components/accounts/PartyLedger";

const TABS = [
    { id: "ledger", label: "Party Ledger" },
    { id: "payments", label: "Payments" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function AccountsPage() {
    const [tab, setTab] = useState<Tab>("ledger");

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-sand-100">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                            tab === t.id
                                ? "border-brand-600 text-brand-700 bg-white"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "ledger" && <PartyLedger />}
            {tab === "payments" && <PaymentList />}
        </div>
    );
}
