import { VehicleHistory } from "@/components/vehicles/VehicleHistory";

export default function VehiclesPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-xl font-bold">Vehicle History</h1>
            <VehicleHistory />
        </div>
    );
}
