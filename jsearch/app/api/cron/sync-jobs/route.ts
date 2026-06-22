import { syncArbetsformedlingenJobs } from "@/lib/arbetsformedlingen";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncArbetsformedlingenJobs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
