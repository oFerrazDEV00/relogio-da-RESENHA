import { NextResponse } from "next/server";
import { getState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("state error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
