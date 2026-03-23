import { ClosingStockEntry } from "@/components/closing-stock/ClosingStockEntry";

export default function ClosingStockPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-xl font-bold">Closing Stock</h1>
            <ClosingStockEntry />
        </div>
    );
}
