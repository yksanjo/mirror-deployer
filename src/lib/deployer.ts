import type {
  Deployer,
  DeployerArchetype,
  DeployerThesis,
  FeedItem,
  Launch,
  LeaderboardEntry,
  ReputationScore,
} from "./types";
import { fetchDeployerLaunches, fetchRecentLaunches } from "./pumpfun";

const ARCHETYPES: Record<
  DeployerArchetype,
  { label: string; emoji: string }
> = {
  serial_graduate: { label: "Serial Graduate", emoji: "🎓" },
  one_hit_wonder: { label: "One-Hit Wonder", emoji: "🎯" },
  consistent_dud: { label: "Consistent Dud", emoji: "💤" },
  rug_pattern: { label: "Rug Pattern", emoji: "🚨" },
  fresh_wallet: { label: "Fresh Wallet", emoji: "🌱" },
  spray_and_pray: { label: "Spray and Pray", emoji: "🎰" },
};

export async function analyzeDeployer(
  wallet: string,
  apiKey: string
): Promise<Deployer> {
  const launches = await fetchDeployerLaunches(wallet, apiKey);
  const reputation = computeReputation(launches);
  const archetype = classifyArchetype(launches, reputation);
  const meta = ARCHETYPES[archetype];

  const stats = {
    totalLaunches: launches.length,
    graduated: launches.filter((l) => l.status === "bonded").length,
    rugged: launches.filter((l) => l.status === "rugged").length,
    live: launches.filter((l) => l.status === "live").length,
    dead: launches.filter((l) => l.status === "dead").length,
  };

  return {
    wallet,
    archetype,
    archetypeLabel: meta.label,
    archetypeEmoji: meta.emoji,
    bio: buildBio(archetype, stats, reputation),
    reputation,
    stats,
    recentLaunches: launches
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10),
  };
}

export function computeReputation(launches: Launch[]): ReputationScore {
  const sampleSize = launches.length;

  if (sampleSize === 0) {
    return {
      overall: 0,
      breakdown: {
        graduationRate: 0,
        rugRate: 0,
        holderRetention: 0,
        avgTimeToBondHours: 0,
        sampleSize: 0,
      },
    };
  }

  const graduated = launches.filter((l) => l.status === "bonded");
  const rugged = launches.filter((l) => l.status === "rugged");
  const graduationRate = graduated.length / sampleSize;
  const rugRate = rugged.length / sampleSize;

  const withHolders = launches.filter((l) => l.holderCount !== undefined);
  const holderRetention =
    withHolders.length > 0
      ? withHolders.reduce((sum, l) => sum + (l.holderCount ?? 0), 0) /
        withHolders.length /
        100
      : 0;

  const bondTimes = graduated
    .map((l) => l.timeToBondSeconds)
    .filter((t): t is number => typeof t === "number");
  const avgTimeToBondHours =
    bondTimes.length > 0
      ? bondTimes.reduce((s, t) => s + t, 0) / bondTimes.length / 3600
      : 0;

  let score = 50;
  score += graduationRate * 60;
  score -= rugRate * 80;
  score += Math.min(holderRetention, 1) * 20;
  if (avgTimeToBondHours > 0 && avgTimeToBondHours < 6) {
    score += 10;
  }
  if (sampleSize < 3) {
    score = score * 0.7;
  }

  return {
    overall: Math.max(0, Math.min(100, Math.round(score))),
    breakdown: {
      graduationRate: Math.round(graduationRate * 100),
      rugRate: Math.round(rugRate * 100),
      holderRetention: Math.round(Math.min(holderRetention, 1) * 100),
      avgTimeToBondHours: Number(avgTimeToBondHours.toFixed(1)),
      sampleSize,
    },
  };
}

function classifyArchetype(
  launches: Launch[],
  rep: ReputationScore
): DeployerArchetype {
  const { sampleSize, graduationRate, rugRate } = rep.breakdown;

  if (sampleSize === 0) return "fresh_wallet";
  if (sampleSize < 3 && graduationRate < 50) return "fresh_wallet";
  if (rugRate >= 40) return "rug_pattern";
  if (graduationRate >= 60 && sampleSize >= 3) return "serial_graduate";
  if (graduationRate >= 30 && sampleSize <= 5) return "one_hit_wonder";
  if (sampleSize >= 10 && graduationRate < 20) return "spray_and_pray";
  return "consistent_dud";
}

function buildBio(
  archetype: DeployerArchetype,
  stats: Deployer["stats"],
  rep: ReputationScore
): string {
  const { totalLaunches, graduated, rugged } = stats;
  switch (archetype) {
    case "serial_graduate":
      return `${graduated} graduations across ${totalLaunches} launches. Knows how to ship coins that bond.`;
    case "one_hit_wonder":
      return `${graduated} graduate, ${totalLaunches} total. Caught lightning once — can they do it again?`;
    case "consistent_dud":
      return `${totalLaunches} launches, none stuck. Persistent shipper, weak signal.`;
    case "rug_pattern":
      return `${rugged} of ${totalLaunches} launches show rug patterns. Avoid.`;
    case "fresh_wallet":
      return totalLaunches === 0
        ? "No launches detected on this wallet."
        : `${totalLaunches} early launches — too few to score with confidence.`;
    case "spray_and_pray":
      return `${totalLaunches} launches, ${graduated} graduated (${rep.breakdown.graduationRate}%). High volume, low hit rate.`;
  }
}

export function generateDeployerThesis(
  deployer: Deployer,
  launch?: Launch
): DeployerThesis {
  const rep = deployer.reputation;
  const reasoning: string[] = [];
  const riskFlags: string[] = [];

  let signal: DeployerThesis["signal"] = "yellow";
  if (rep.overall >= 70) signal = "green";
  else if (rep.overall < 35) signal = "red";

  reasoning.push(
    `Deployer reputation ${rep.overall}/100 (${deployer.archetypeLabel}).`
  );

  if (rep.breakdown.sampleSize >= 3) {
    reasoning.push(
      `${rep.breakdown.graduationRate}% graduation rate across ${rep.breakdown.sampleSize} launches.`
    );
  }

  if (rep.breakdown.rugRate >= 20) {
    riskFlags.push(`${rep.breakdown.rugRate}% historical rug rate`);
  }

  if (deployer.archetype === "fresh_wallet") {
    riskFlags.push("Insufficient history — treat as unknown");
  }

  if (deployer.archetype === "rug_pattern") {
    riskFlags.push("Pattern matches prior rug behavior");
  }

  if (launch) {
    reasoning.push(`Current launch: ${launch.name} (${launch.symbol}).`);
    if (launch.rugFlags.length > 0) {
      riskFlags.push(...launch.rugFlags.map(formatRugFlag));
    }
    if (launch.topHolderShare && launch.topHolderShare > 0.3) {
      riskFlags.push(
        `Top holder controls ${Math.round(launch.topHolderShare * 100)}% of supply`
      );
    }
    if (
      launch.status === "live" &&
      Date.now() - launch.createdAt < 1000 * 60 * 60
    ) {
      reasoning.push("Fresh launch — under 1 hour old.");
    }
  }

  const conviction: DeployerThesis["conviction"] =
    rep.breakdown.sampleSize >= 5 && riskFlags.length === 0
      ? "high"
      : rep.breakdown.sampleSize >= 3
      ? "medium"
      : "low";

  return {
    deployer: deployer.wallet,
    launch,
    signal,
    reasoning: reasoning.join(" "),
    riskFlags,
    conviction,
    generatedAt: Date.now(),
  };
}

function formatRugFlag(flag: string): string {
  const map: Record<string, string> = {
    deployer_dump: "Deployer sold most of their position",
    lp_pulled: "Liquidity pulled",
    honeypot: "Honeypot signature detected",
    single_holder: "Concentrated holder distribution",
    freeze_authority: "Freeze authority not renounced",
    mint_authority: "Mint authority not renounced",
  };
  return map[flag] ?? flag;
}

export async function buildLeaderboard(
  apiKey: string,
  limit = 20
): Promise<LeaderboardEntry[]> {
  const recent = await fetchRecentLaunches(apiKey, 50);
  const byDeployer = new Map<string, Launch[]>();

  for (const launch of recent) {
    if (!byDeployer.has(launch.deployer)) byDeployer.set(launch.deployer, []);
    byDeployer.get(launch.deployer)!.push(launch);
  }

  const entries: LeaderboardEntry[] = [];
  for (const [wallet, launches] of byDeployer.entries()) {
    const reputation = computeReputation(launches);
    const archetype = classifyArchetype(launches, reputation);
    const meta = ARCHETYPES[archetype];
    entries.push({
      wallet,
      archetype: meta.label,
      archetypeEmoji: meta.emoji,
      reputationScore: reputation.overall,
      totalLaunches: launches.length,
      graduated: launches.filter((l) => l.status === "bonded").length,
      rugged: launches.filter((l) => l.status === "rugged").length,
      lastActiveAt: Math.max(...launches.map((l) => l.createdAt)),
    });
  }

  return entries
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .slice(0, limit);
}

export async function buildFeed(
  apiKey: string,
  limit = 20
): Promise<FeedItem[]> {
  const launches = await fetchRecentLaunches(apiKey, limit);
  const items: FeedItem[] = [];
  const deployerCache = new Map<string, Deployer>();

  for (const launch of launches) {
    let deployer = deployerCache.get(launch.deployer);
    if (!deployer) {
      try {
        deployer = await analyzeDeployer(launch.deployer, apiKey);
        deployerCache.set(launch.deployer, deployer);
      } catch {
        continue;
      }
    }

    const thesis = generateDeployerThesis(deployer, launch);
    items.push({
      id: `launch_${launch.mint}`,
      launch,
      deployerReputation: deployer.reputation.overall,
      deployerArchetype: deployer.archetypeLabel,
      deployerArchetypeEmoji: deployer.archetypeEmoji,
      signal: thesis.signal,
      reasoning: thesis.reasoning,
      timestamp: launch.createdAt,
    });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
