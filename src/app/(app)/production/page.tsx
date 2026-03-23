import { ProductionEntryList } from "@/components/production/ProductionEntry";

export default function ProductionPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Production</h1>
                <p className="text-sm text-muted-foreground">
                    Log daily production: raw sand and coal consumed, finished sand grades produced.
                </p>
            </div>
            <ProductionEntryList />
        </div>
    );
}
