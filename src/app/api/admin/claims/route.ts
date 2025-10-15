import { NextRequest, NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "@/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { isEmailAdmin, getAdminAllowlist } from "@/lib/admin-allowlist";

function unauthorized(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return unauthorized("Missing bearer token");
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) {
    return unauthorized("Empty bearer token");
  }

  const adminServices = initializeFirebaseAdmin();
  if (!adminServices) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  try {
    const auth = getAuth(adminServices.app);
    const decoded = await auth.verifyIdToken(idToken, true);

    if (decoded.admin === true) {
      return NextResponse.json({ status: "already-admin" });
    }

    const email = decoded.email ?? decoded.firebase?.identities?.email?.[0];
    if (!isEmailAdmin(email)) {
      return unauthorized("Not on admin allowlist", 403);
    }

    const userRecord = await auth.getUser(decoded.uid);
    const claims = { ...(userRecord.customClaims ?? {}), admin: true };
    await auth.setCustomUserClaims(decoded.uid, claims);
    await auth.revokeRefreshTokens(decoded.uid);

    return NextResponse.json({
      status: "granted",
      allowlist: getAdminAllowlist(),
    });
  } catch (error) {
    console.error("Failed to grant admin claim:", error);
    return NextResponse.json(
      { error: "Unable to grant admin claim" },
      { status: 500 }
    );
  }
}
