import { syncArbetsformedlingenJobs } from "@/lib/arbetsformedlingen";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const result = await syncArbetsformedlingenJobs();
    const url = new URL(request.url);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("synced", "1");
    url.searchParams.set("upserted", String(result.upserted));

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL(request.url);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("syncError", "1");

    if (error instanceof Error && error.message) {
      url.searchParams.set("message", error.message.slice(0, 120));
    }

    return NextResponse.redirect(url);
  }
}
