import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LooseSaleList } from "@/components/sales/LooseSale";
import { BagSaleList } from "@/components/sales/BagSale";

export default function SalesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                <p className="text-sm text-muted-foreground">
                    Record loose sand and bagged sand sales with invoicing.
                </p>
            </div>

            <Tabs defaultValue="loose">
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                    <TabsTrigger value="loose">Loose Sales</TabsTrigger>
                    <TabsTrigger value="bags">Bag Sales</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="loose"><LooseSaleList /></TabsContent>
                    <TabsContent value="bags"><BagSaleList /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
