import { PaymentList } from "@/components/accounts/Payments";

export default function AccountsPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-xl font-bold">Accounts — Payments</h1>
            <PaymentList />
        </div>
    );
}
