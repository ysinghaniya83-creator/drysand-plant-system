import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmployeeMaster } from "@/components/employees/EmployeeMaster";
import { AttendanceSheet } from "@/components/employees/Attendance";
import { SalaryList } from "@/components/employees/SalaryList";

export default function EmployeesPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-5">
            <Tabs defaultValue="master">
                <TabsList>
                    <TabsTrigger value="master">Employee List</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="salary">Salary</TabsTrigger>
                </TabsList>
                <TabsContent value="master" className="pt-4"><EmployeeMaster /></TabsContent>
                <TabsContent value="attendance" className="pt-4"><AttendanceSheet /></TabsContent>
                <TabsContent value="salary" className="pt-4"><SalaryList /></TabsContent>
            </Tabs>
        </div>
    );
}
