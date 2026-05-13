import { NextResponse } from "next/server";
import { analyzeDeployer, generateDeployerThesis } from "@/lib/deployer";

export async function GET(
  _req: Request,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet?.trim();
    if (!wallet || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }

    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HELIUS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const deployer = await analyzeDeployer(wallet, apiKey);
    const thesis = generateDeployerThesis(deployer);
    return NextResponse.json({ deployer, thesis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deployer lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
