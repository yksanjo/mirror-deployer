import { NextResponse } from "next/server";
import { analyzeDeployer, generateDeployerThesis } from "@/lib/deployer";

export async function POST(req: Request) {
  try {
    const { wallet, mint } = await req.json();

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 });
    }

    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HELIUS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const deployer = await analyzeDeployer(wallet, apiKey);
    const launch = mint
      ? deployer.recentLaunches.find((l) => l.mint === mint)
      : undefined;
    const thesis = generateDeployerThesis(deployer, launch);
    return NextResponse.json({ thesis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Thesis generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
