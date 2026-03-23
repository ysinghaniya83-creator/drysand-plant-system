import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyMaster } from "@/components/masters/PartyMaster";
import { ItemMaster } from "@/components/masters/ItemMaster";
import { ExpenseHeadMaster } from "@/components/masters/ExpenseHeadMaster";
import { BagSizeMaster } from "@/components/masters/BagSizeMaster";

export default function MastersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Masters</h1>
                <p className="text-sm text-muted-foreground">
                    Configure parties, materials, expense heads, and bag sizes used across all modules.
                </p>
            </div>

            <Tabs defaultValue="parties">
                <TabsList className="grid grid-cols-4 w-full max-w-xl">
                    <TabsTrigger value="parties">Parties</TabsTrigger>
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="expenses">Expense Heads</TabsTrigger>
                    <TabsTrigger value="bags">Bag Sizes</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="parties"><PartyMaster /></TabsContent>
                    <TabsContent value="items"><ItemMaster /></TabsContent>
                    <TabsContent value="expenses"><ExpenseHeadMaster /></TabsContent>
                    <TabsContent value="bags"><BagSizeMaster /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
