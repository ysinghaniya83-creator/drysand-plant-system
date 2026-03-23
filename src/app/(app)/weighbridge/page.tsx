import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InwardEntryList } from "@/components/weighbridge/InwardEntry";
import { OutwardEntryList } from "@/components/weighbridge/OutwardEntry";
import { RoyaltyLedger } from "@/components/weighbridge/RoyaltyLedger";

export default function WeighbridgePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Weighbridge</h1>
                <p className="text-sm text-muted-foreground">
                    Record inward and outward vehicle entries. All weights recorded in metric tons.
                </p>
            </div>

            <Tabs defaultValue="inward">
                <TabsList className="grid grid-cols-3 w-full max-w-lg">
                    <TabsTrigger value="inward">Inward Entries</TabsTrigger>
                    <TabsTrigger value="outward">Outward Entries</TabsTrigger>
                    <TabsTrigger value="royalty">Royalty Ledger</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="inward"><InwardEntryList /></TabsContent>
                    <TabsContent value="outward"><OutwardEntryList /></TabsContent>
                    <TabsContent value="royalty"><RoyaltyLedger /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
