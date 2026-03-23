import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    where,
    getDocs,
    onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function collectionListener<T>(
    collectionName: string,
    orderByField: string,
    callback: (data: T[]) => void,
    direction: "asc" | "desc" = "asc"
) {
    const q = query(collection(db, collectionName), orderBy(orderByField, direction));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
    });
}

export async function queryDocuments<T>(
    collectionName: string,
    field: string,
    value: unknown
): Promise<T[]> {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function addDocument(collectionName: string, data: Record<string, unknown>) {
    return addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
    });
}

export async function updateDocument(
    collectionName: string,
    id: string,
    data: Record<string, unknown>
) {
    return updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocument(collectionName: string, id: string) {
    return deleteDoc(doc(db, collectionName, id));
}
