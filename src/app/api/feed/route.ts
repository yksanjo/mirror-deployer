import { NextResponse } from "next/server";
import { buildFeed } from "@/lib/deployer";

export async function GET() {
  try {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HELIUS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const feed = await buildFeed(apiKey, 20);
    return NextResponse.json({ feed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feed build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
