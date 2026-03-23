import type { UserRole } from "@/types";

/**
 * Defines which roles can access each route.
 * Based on the Dry Sand Plant Management System spec.
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
    "/dashboard":    ["admin", "operator", "accountant", "viewer"],
    "/weighbridge":  ["admin", "operator"],
    "/purchase":     ["admin", "accountant"],
    "/production":   ["admin", "operator"],
    "/bagging":      ["admin", "operator"],
    "/sales":        ["admin", "operator"],
    "/expenses":     ["admin", "accountant"],
    "/accounts":     ["admin", "accountant"],
    "/profit":       ["admin"],
    "/closing-stock":["admin", "operator"],
    "/vehicles":     ["admin", "operator"],
    "/employees":    ["admin"],
    "/reports":      ["admin", "accountant"],
    "/masters":      ["admin"],
    "/users":        ["admin"],
};

/** Returns true if the role can access the given pathname. */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
    const match = Object.keys(ROUTE_ACCESS).find(
        (k) => pathname === k || pathname.startsWith(k + "/")
    );
    if (!match) return true; // unknown routes — allow through
    return ROUTE_ACCESS[match].includes(role);
}

/** Only admins can edit any existing entry. */
export function canEditEntry(role: UserRole | undefined): boolean {
    return role === "admin";
}

/** Only admins can delete any entry. */
export function canDeleteEntry(role: UserRole | undefined): boolean {
    return role === "admin";
}

/** Human-readable label for each role. */
export const ROLE_LABELS: Record<UserRole, string> = {
    admin:      "Admin",
    operator:   "Operator",
    accountant: "Accountant",
    viewer:     "Viewer",
};

/** Sidebar nav items that a role should NOT see (hidden from nav). */
export const HIDDEN_NAV_FOR_ROLE: Record<UserRole, string[]> = {
    admin:      [],
    operator:   ["/purchase", "/accounts", "/expenses", "/profit", "/employees", "/masters", "/users", "/reports"],
    accountant: ["/weighbridge", "/production", "/bagging", "/sales", "/closing-stock", "/vehicles", "/employees", "/masters", "/users"],
    viewer:     ["/profit", "/masters", "/users", "/employees"],
};
