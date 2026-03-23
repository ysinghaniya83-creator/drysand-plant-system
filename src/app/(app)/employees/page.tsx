import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmployeeMaster } from "@/components/employees/EmployeeMaster";
import { AttendanceSheet } from "@/components/employees/Attendance";

export default function EmployeesPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-xl font-bold">Employees</h1>
            <Tabs defaultValue="master">
                <TabsList>
                    <TabsTrigger value="master">Employee List</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>
                <TabsContent value="master" className="pt-4"><EmployeeMaster /></TabsContent>
                <TabsContent value="attendance" className="pt-4"><AttendanceSheet /></TabsContent>
            </Tabs>
        </div>
    );
}
