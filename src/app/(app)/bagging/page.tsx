import { BaggingEntryList } from "@/components/bagging/BaggingEntry";

export default function BaggingPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Bagging</h1>
                <p className="text-sm text-muted-foreground">
                    Record finished sand packed into bags each day.
                </p>
            </div>
            <BaggingEntryList />
        </div>
    );
}
