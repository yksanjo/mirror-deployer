import type { Launch, RugFlag } from "./types";

const PUMP_FUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const PUMP_FUN_AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";

interface HeliusEnrichedTx {
  signature: string;
  timestamp: number;
  slot: number;
  type?: string;
  source?: string;
  description?: string;
  feePayer?: string;
  tokenTransfers?: Array<{
    mint: string;
    tokenAmount: number;
    fromUserAccount: string;
    toUserAccount: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount?: { tokenAmount: string; decimals: number };
      tokenAccount: string;
      userAccount: string;
    }>;
  }>;
  instructions?: Array<{
    programId: string;
    accounts: string[];
    data?: string;
  }>;
  events?: {
    swap?: unknown;
    nft?: unknown;
  };
}

interface HeliusTokenMetadata {
  account: string;
  onChainMetadata?: {
    metadata?: {
      data?: {
        name?: string;
        symbol?: string;
      };
    };
  };
  offChainMetadata?: {
    metadata?: {
      name?: string;
      symbol?: string;
    };
  };
}

export async function fetchDeployerLaunches(
  wallet: string,
  apiKey: string,
  limit = 100
): Promise<Launch[]> {
  const txs = await fetchAddressTxs(wallet, apiKey, limit);

  const launchTxs = txs.filter((tx) =>
    tx.instructions?.some(
      (ix) => ix.programId === PUMP_FUN_PROGRAM || ix.programId === PUMP_FUN_AMM
    ) || tx.source === "PUMP_FUN" || /pump/i.test(tx.description ?? "")
  );

  const launches: Launch[] = [];
  const seenMints = new Set<string>();

  for (const tx of launchTxs) {
    const newTokenTransfer = tx.tokenTransfers?.find(
      (t) => t.fromUserAccount === wallet || t.toUserAccount === wallet
    );
    if (!newTokenTransfer) continue;
    if (seenMints.has(newTokenTransfer.mint)) continue;
    seenMints.add(newTokenTransfer.mint);

    launches.push({
      mint: newTokenTransfer.mint,
      name: "Unknown",
      symbol: "???",
      deployer: wallet,
      createdAt: tx.timestamp * 1000,
      status: "live",
      rugFlags: [],
    });
  }

  if (launches.length === 0) return [];

  await enrichLaunches(launches, apiKey);
  return launches;
}

async function enrichLaunches(launches: Launch[], apiKey: string): Promise<void> {
  const mints = launches.map((l) => l.mint);
  const metadata = await fetchTokenMetadataBatch(mints, apiKey);

  for (const launch of launches) {
    const meta = metadata.find((m) => m.account === launch.mint);
    if (meta) {
      const onChain = meta.onChainMetadata?.metadata?.data;
      const offChain = meta.offChainMetadata?.metadata;
      launch.name = onChain?.name?.trim() || offChain?.name || "Unknown";
      launch.symbol = onChain?.symbol?.trim() || offChain?.symbol || "???";
    }

    const status = await classifyLaunchStatus(launch, apiKey);
    launch.status = status.status;
    launch.bondedAt = status.bondedAt;
    launch.timeToBondSeconds = status.timeToBondSeconds;
    launch.rugFlags = status.rugFlags;
    launch.holderCount = status.holderCount;
    launch.topHolderShare = status.topHolderShare;
  }
}

interface LaunchStatusResult {
  status: Launch["status"];
  bondedAt?: number;
  timeToBondSeconds?: number;
  rugFlags: RugFlag[];
  holderCount?: number;
  topHolderShare?: number;
}

async function classifyLaunchStatus(
  launch: Launch,
  apiKey: string
): Promise<LaunchStatusResult> {
  const rugFlags: RugFlag[] = [];

  const supply = await fetchTokenSupply(launch.mint, apiKey);
  if (!supply) {
    return { status: "dead", rugFlags };
  }

  const holders = await fetchTopHolders(launch.mint, apiKey, 20);
  const totalSupply = supply.amount;
  const deployerHolding = holders.find((h) => h.owner === launch.deployer);
  const deployerShare = deployerHolding
    ? deployerHolding.amount / totalSupply
    : 0;

  const topShare = holders[0] ? holders[0].amount / totalSupply : 0;

  if (deployerShare < 0.0001 && holders.length > 1) {
    rugFlags.push("deployer_dump");
  }
  if (topShare > 0.5) {
    rugFlags.push("single_holder");
  }
  if (supply.freezeAuthority) {
    rugFlags.push("freeze_authority");
  }
  if (supply.mintAuthority) {
    rugFlags.push("mint_authority");
  }

  const bondedAt = await detectBondingEvent(launch.mint, apiKey);
  const status: Launch["status"] = bondedAt
    ? "bonded"
    : rugFlags.includes("deployer_dump")
    ? "rugged"
    : holders.length < 3
    ? "dead"
    : "live";

  return {
    status,
    bondedAt,
    timeToBondSeconds: bondedAt
      ? Math.round((bondedAt - launch.createdAt) / 1000)
      : undefined,
    rugFlags,
    holderCount: holders.length,
    topHolderShare: topShare,
  };
}

async function fetchAddressTxs(
  wallet: string,
  apiKey: string,
  limit: number
): Promise<HeliusEnrichedTx[]> {
  const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${apiKey}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius tx fetch failed: ${res.status}`);
  return (await res.json()) as HeliusEnrichedTx[];
}

async function fetchTokenMetadataBatch(
  mints: string[],
  apiKey: string
): Promise<HeliusTokenMetadata[]> {
  if (mints.length === 0) return [];
  const url = `https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mintAccounts: mints, includeOffChain: true }),
  });
  if (!res.ok) return [];
  return (await res.json()) as HeliusTokenMetadata[];
}

interface TokenSupply {
  amount: number;
  decimals: number;
  freezeAuthority: boolean;
  mintAuthority: boolean;
}

async function fetchTokenSupply(
  mint: string,
  apiKey: string
): Promise<TokenSupply | null> {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAsset",
      params: { id: mint },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: {
      token_info?: { supply?: number; decimals?: number };
      authorities?: Array<{ scopes: string[] }>;
    };
  };
  const info = json.result?.token_info;
  if (!info?.supply) return null;
  const auths = json.result?.authorities ?? [];
  return {
    amount: info.supply,
    decimals: info.decimals ?? 9,
    freezeAuthority: auths.some((a) => a.scopes.includes("freeze")),
    mintAuthority: auths.some((a) => a.scopes.includes("full")),
  };
}

interface TopHolder {
  owner: string;
  amount: number;
}

async function fetchTopHolders(
  mint: string,
  apiKey: string,
  limit: number
): Promise<TopHolder[]> {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenLargestAccounts",
      params: [mint],
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      value?: Array<{ address: string; amount: string; uiAmount: number }>;
    };
  };
  const accounts = json.result?.value ?? [];
  return accounts.slice(0, limit).map((a) => ({
    owner: a.address,
    amount: a.uiAmount ?? Number(a.amount),
  }));
}

async function detectBondingEvent(
  mint: string,
  apiKey: string
): Promise<number | undefined> {
  const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${apiKey}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) return undefined;
  const txs = (await res.json()) as HeliusEnrichedTx[];

  const bondTx = txs.find((tx) =>
    tx.instructions?.some((ix) => ix.programId === PUMP_FUN_AMM) ||
    /bonded|migrate|graduat/i.test(tx.description ?? "")
  );
  return bondTx ? bondTx.timestamp * 1000 : undefined;
}

export async function fetchRecentLaunches(
  apiKey: string,
  limit = 30
): Promise<Launch[]> {
  const url = `https://api.helius.xyz/v0/addresses/${PUMP_FUN_PROGRAM}/transactions?api-key=${apiKey}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const txs = (await res.json()) as HeliusEnrichedTx[];

  const launches: Launch[] = [];
  const seenMints = new Set<string>();

  for (const tx of txs) {
    const isCreate =
      /create|initialize|mint/i.test(tx.description ?? "") ||
      tx.type === "TOKEN_MINT";
    if (!isCreate) continue;

    const newToken = tx.tokenTransfers?.[0];
    if (!newToken || seenMints.has(newToken.mint)) continue;
    seenMints.add(newToken.mint);

    launches.push({
      mint: newToken.mint,
      name: "Unknown",
      symbol: "???",
      deployer: tx.feePayer ?? newToken.fromUserAccount,
      createdAt: tx.timestamp * 1000,
      status: "live",
      rugFlags: [],
    });
  }

  if (launches.length > 0) {
    await enrichLaunches(launches, apiKey);
  }
  return launches;
}
