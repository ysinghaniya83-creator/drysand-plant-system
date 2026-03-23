import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseRegister } from "@/components/purchase/PurchaseRegister";
import { PurchaseBills } from "@/components/purchase/PurchaseBills";

export default function PurchasePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Purchase & Bills</h1>
                <p className="text-sm text-muted-foreground">
                    Purchase register is auto-populated from Weighbridge. Record supplier bills and match them.
                </p>
            </div>

            <Tabs defaultValue="register">
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                    <TabsTrigger value="register">Purchase Register</TabsTrigger>
                    <TabsTrigger value="bills">Supplier Bills</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="register"><PurchaseRegister /></TabsContent>
                    <TabsContent value="bills"><PurchaseBills /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
