import { NextRequest } from "next/server";
import { adminDb } from "./firebaseAdmin";
import { verifyRequestUser } from "./verifyAuth";

// Returns the caller's uid only if they're signed in AND their user document
// has isAdmin: true (set that by hand in the Firestore console).
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const uid = await verifyRequestUser(req);
  if (!uid) return null;
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.data()?.isAdmin === true ? uid : null;
}
