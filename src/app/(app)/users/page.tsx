"use client";

import { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { AppUser, UserRole } from "@/types";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const ROLES: UserRole[] = ["admin", "operator", "accountant", "viewer"];

function statusBadge(status: AppUser["status"]) {
    if (status === "active") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    if (status === "pending") return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Disabled</Badge>;
}

export default function UsersPage() {
    const { appUser: currentUser } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Only admin can access this page
    if (currentUser && currentUser.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground text-sm">Access denied — Admins only.</p>
            </div>
        );
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map((d) => d.data() as AppUser));
            setLoading(false);
        });
        return unsub;
    }, []);

    async function approveUser(uid: string, role: UserRole) {
        await updateDoc(doc(db, "users", uid), {
            status: "active",
            role,
            approvedAt: serverTimestamp(),
            approvedBy: currentUser?.uid,
        });
        toast.success("User approved and access granted.");
    }

    async function changeRole(uid: string, role: UserRole) {
        await updateDoc(doc(db, "users", uid), { role });
        toast.success("Role updated.");
    }

    async function disableUser(uid: string) {
        await updateDoc(doc(db, "users", uid), { status: "disabled" });
        toast.info("User disabled.");
    }

    async function enableUser(uid: string) {
        await updateDoc(doc(db, "users", uid), { status: "active" });
        toast.success("User re-enabled.");
    }

    async function removeUser(uid: string) {
        if (!confirm("Remove this user completely? They will need to request access again.")) return;
        await deleteDoc(doc(db, "users", uid));
        toast.info("User removed.");
    }

    const pending = users.filter((u) => u.status === "pending");
    const active = users.filter((u) => u.status === "active");
    const disabled = users.filter((u) => u.status === "disabled");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-muted-foreground">Manage access and roles for all system users.</p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading users…</p>}

            {/* ── PENDING REQUESTS ── */}
            {pending.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                            ⏳ Pending Access Requests
                            <span className="bg-yellow-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                                {pending.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pending.map((u) => (
                            <PendingRow
                                key={u.uid}
                                user={u}
                                onApprove={approveUser}
                                onRemove={removeUser}
                                isSelf={u.uid === currentUser?.uid}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ── ACTIVE USERS ── */}
            {active.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">
                            ✅ Active Users ({active.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {active.map((u, i) => (
                            <div key={u.uid}>
                                <UserRow
                                    user={u}
                                    currentUserUid={currentUser?.uid}
                                    onChangeRole={changeRole}
                                    onDisable={disableUser}
                                    onRemove={removeUser}
                                />
                                {i < active.length - 1 && <Separator className="my-1" />}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ── DISABLED USERS ── */}
            {disabled.length > 0 && (
                <Card className="border-gray-200 opacity-75">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-500">
                            🚫 Disabled Users ({disabled.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {disabled.map((u) => (
                            <div key={u.uid} className="flex items-center justify-between py-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={u.photoURL} />
                                        <AvatarFallback className="text-[10px]">{u.name?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{u.name}</p>
                                        <p className="text-[11px] text-gray-400">{u.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusBadge(u.status)}
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => enableUser(u.uid)}>
                                        Re-enable
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeUser(u.uid)}>
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {!loading && users.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        No users found.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ─── PENDING ROW ─────────────────────────────────────────────────────────────
function PendingRow({
    user,
    onApprove,
    onRemove,
    isSelf,
}: {
    user: AppUser;
    onApprove: (uid: string, role: UserRole) => Promise<void>;
    onRemove: (uid: string) => Promise<void>;
    isSelf: boolean;
}) {
    const [selectedRole, setSelectedRole] = useState<UserRole>("viewer");
    const [busy, setBusy] = useState(false);

    async function handleApprove() {
        setBusy(true);
        await onApprove(user.uid, selectedRole);
        setBusy(false);
    }

    return (
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-md p-3 border border-yellow-100">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="text-xs">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Select value={selectedRole} onValueChange={(v) => v && setSelectedRole(v as UserRole)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleApprove} disabled={busy || isSelf}>
                Approve
            </Button>
            <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive"
                onClick={() => onRemove(user.uid)}
                disabled={isSelf}
            >
                Deny
            </Button>
        </div>
    );
}

// ─── ACTIVE USER ROW ─────────────────────────────────────────────────────────
function UserRow({
    user,
    currentUserUid,
    onChangeRole,
    onDisable,
    onRemove,
}: {
    user: AppUser;
    currentUserUid?: string;
    onChangeRole: (uid: string, role: UserRole) => Promise<void>;
    onDisable: (uid: string) => Promise<void>;
    onRemove: (uid: string) => Promise<void>;
}) {
    const isSelf = user.uid === currentUserUid;

    return (
        <div className="flex flex-wrap items-center gap-3 py-2">
            <Avatar className="h-7 w-7">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="text-[10px]">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                    {user.name} {isSelf && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Select
                value={user.role}
                onValueChange={(v) => v && onChangeRole(user.uid, v as UserRole)}
                disabled={isSelf}
            >
                <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {statusBadge(user.status)}
            {!isSelf && (
                <>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onDisable(user.uid)}>
                        Disable
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onRemove(user.uid)}>
                        Remove
                    </Button>
                </>
            )}
        </div>
    );
}
