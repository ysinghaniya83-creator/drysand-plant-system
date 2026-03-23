// ─── SHARED ─────────────────────────────────────────────────────────────────
export type Timestamp = import("firebase/firestore").Timestamp;

// ─── USER / AUTH ─────────────────────────────────────────────────────────────
export type UserRole = "admin" | "operator" | "accountant" | "viewer";
export type UserStatus = "active" | "pending" | "disabled";

export interface AppUser {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    role: UserRole;
    status: UserStatus;
    createdAt: Timestamp;
    approvedAt?: Timestamp;
    approvedBy?: string;
}

// ─── MASTERS ─────────────────────────────────────────────────────────────────
export type PartyType = "supplier" | "customer" | "both";

export interface Party {
    id: string;
    name: string;
    type: PartyType;
    phone?: string;
    address?: string;
    gstNumber?: string;
    openingBalance: number; // positive = we owe them, negative = they owe us
    createdAt: Timestamp;
}

export type ItemType = "raw_sand" | "coal" | "finished_sand" | "bag" | "other";

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    unit: string; // "ton", "kg", "bag", etc. — always required
    gradeLabel?: string; // e.g. "600µm", "1200µm"
    currentStock: number;
    createdAt: Timestamp;
}

export interface ExpenseHead {
    id: string;
    name: string;
    includeInProfit: boolean;
    createdAt: Timestamp;
}

export interface BagSize {
    id: string;
    label: string; // e.g. "25 kg", "50 kg"
    weightKg: number;
    createdAt: Timestamp;
}

// ─── WEIGHBRIDGE ─────────────────────────────────────────────────────────────
export type InwardMaterialType = "sand" | "coal";

export interface InwardEntry {
    id: string;
    date: Timestamp;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    materialType: InwardMaterialType;
    royaltyNumber?: string;
    royaltyWeight: number; // tons — from royalty slip
    grossWeight: number;   // tons
    tareWeight: number;    // tons
    netWeight: number;     // auto = gross - tare
    ratePerTon: number;
    amount: number;        // auto = netWeight * ratePerTon
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

export interface RoyaltyLedgerEntry {
    id: string;
    date: Timestamp;
    inwardEntryId: string;
    vehicleNumber: string;
    royaltyNumber: string;
    royaltyWeight: number;
    weighbridgeWeight: number;
    difference: number; // weighbridge - royalty
    materialType: InwardMaterialType;
}

export type DispatchType = "loose_sale" | "bag_sale" | "other";

export interface OutwardEntry {
    id: string;
    date: Timestamp;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    dispatchType: DispatchType;
    itemId: string;
    itemName: string;
    bagSizeId?: string;
    numberOfBags?: number;
    grossWeight: number;
    tareWeight: number;
    netWeight: number; // auto
    linkedSaleId?: string;
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── PURCHASE ────────────────────────────────────────────────────────────────
export interface PurchaseRegisterEntry {
    id: string;
    date: Timestamp;
    inwardEntryId: string;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    materialType: InwardMaterialType;
    netWeight: number;
    ratePerTon: number;
    amount: number;
    billMatched: boolean;
    billId?: string;
    createdAt: Timestamp;
}

export interface PurchaseBill {
    id: string;
    date: Timestamp;
    billNumber: string;
    partyId: string;
    partyName: string;
    vehicleNumber: string;
    materialType: InwardMaterialType;
    billWeight: number;
    billRate: number;
    billAmount: number;
    matchedPurchaseId?: string;
    weightDifference?: number;
    amountDifference?: number;
    status: "unmatched" | "matched" | "disputed";
    createdAt: Timestamp;
}

// ─── PRODUCTION ──────────────────────────────────────────────────────────────
export interface ProductionGradeOutput {
    itemId: string;
    gradeName: string;
    quantity: number; // tons
}

export interface ProductionEntry {
    id: string;
    date: Timestamp;
    sandUsed: number;  // tons
    coalUsed: number;  // tons
    outputs: ProductionGradeOutput[];
    wastage: number;   // tons (logged only, no stock)
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── BAGGING ─────────────────────────────────────────────────────────────────
export interface BaggingEntry {
    id: string;
    date: Timestamp;
    itemId: string;       // finished sand grade
    gradeName: string;
    bagSizeId: string;
    bagSizeLabel: string;
    numberOfBags: number;
    totalWeightTons: number; // auto = bags * bagWeightKg / 1000
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── SALES ───────────────────────────────────────────────────────────────────
export interface LooseSale {
    id: string;
    date: Timestamp;
    outwardEntryId: string;
    vehicleNumber: string;
    partyId: string;
    partyName: string;
    itemId: string;
    itemName: string;
    netWeightTons: number;
    ratePerTon: number;
    amount: number;
    transportCost: number;
    totalAmount: number;
    invoiceNumber: string;
    createdAt: Timestamp;
    createdBy: string;
}

export interface BagSale {
    id: string;
    date: Timestamp;
    partyId: string;
    partyName: string;
    itemId: string;
    gradeName: string;
    bagSizeId: string;
    bagSizeLabel: string;
    numberOfBags: number;
    totalWeightTons: number;
    ratePerTon: number;
    pricePerBag: number;
    amount: number;
    transportCost: number;
    totalAmount: number;
    invoiceNumber: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
export interface ExpenseEntry {
    id: string;
    date: Timestamp;
    headId: string;
    headName: string;
    amount: number;
    description?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── ACCOUNTS / PAYMENTS ─────────────────────────────────────────────────────
export type PaymentMode = "cash" | "cheque" | "upi" | "bank_transfer" | "other";
export type PaymentType = "paid" | "received";

export interface Payment {
    id: string;
    date: Timestamp;
    partyId: string;
    partyName: string;
    type: PaymentType;
    amount: number;
    mode: PaymentMode;
    reference?: string; // cheque no, UTR, etc.
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── DAILY CLOSING STOCK ─────────────────────────────────────────────────────
export interface ClosingStockItem {
    itemId: string;
    itemName: string;
    systemStock: number;  // calculated
    physicalStock: number; // entered by operator
    shortage: number;      // auto = system - physical
}

export interface DailyClosingStock {
    id: string;
    date: Timestamp; // one per day
    items: ClosingStockItem[];
    remarks?: string;
    createdAt: Timestamp;
    createdBy: string;
}

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────
export type EmployeeType = "permanent" | "daily_wage" | "contract";

export interface Employee {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    type: EmployeeType;
    designation?: string;
    joiningDate: Timestamp;
    salaryOrWage: number;
    aadhaarNumber?: string;
    panNumber?: string;
    bankAccount?: string;
    bankIfsc?: string;
    licenceNumber?: string;
    licenceExpiry?: Timestamp;
    documentUrls: string[]; // Firebase Storage URLs
    isActive: boolean;
    createdAt: Timestamp;
}

export interface AttendanceEntry {
    id: string;
    date: Timestamp;
    employeeId: string;
    employeeName: string;
    present: boolean;
    overtimeHours?: number;
    remarks?: string;
}

export interface SalaryPayment {
    id: string;
    employeeId: string;
    employeeName: string;
    month: string; // "YYYY-MM"
    daysWorked: number;
    salaryAmount: number;
    deductions: number;
    netPayable: number;
    paidDate?: Timestamp;
    isPaid: boolean;
    createdAt: Timestamp;
}
