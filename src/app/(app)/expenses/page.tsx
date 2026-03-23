import { ExpenseEntryList } from "@/components/expenses/ExpenseEntry";

export default function ExpensesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                <p className="text-sm text-muted-foreground">
                    Track all operational expenses — electricity, maintenance, salaries, royalty, etc.
                </p>
            </div>
            <ExpenseEntryList />
        </div>
    );
}
