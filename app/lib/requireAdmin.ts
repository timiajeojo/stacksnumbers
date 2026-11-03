import { NextRequest } from "next/server";
import { verifyRequestUser } from "./verifyAuth";

// Only the user IDs listed in the ADMIN_UIDS environment variable are admins.
export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const uid = await verifyRequestUser(req);
  if (!uid) return null;
  const allowed = (process.env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(uid) ? uid : null;
}