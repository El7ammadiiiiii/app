import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ clientId: serverEnv.GOOGLE_CLIENT_ID, scope: serverEnv.GOOGLE_OAUTH_SCOPE });
}
