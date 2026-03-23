import { ProfitSummary } from "@/components/profit/ProfitSummary";

export default function ProfitPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Profit Summary</h1>
            <ProfitSummary />
        </div>
    );
}
