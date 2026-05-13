export type LaunchStatus = "live" | "bonded" | "rugged" | "dead";

export interface Launch {
  mint: string;
  name: string;
  symbol: string;
  deployer: string;
  createdAt: number;
  status: LaunchStatus;
  bondedAt?: number;
  timeToBondSeconds?: number;
  peakMarketCapUsd?: number;
  currentMarketCapUsd?: number;
  holderCount?: number;
  topHolderShare?: number;
  rugFlags: RugFlag[];
}

export type RugFlag =
  | "deployer_dump"
  | "lp_pulled"
  | "honeypot"
  | "single_holder"
  | "freeze_authority"
  | "mint_authority";

export interface ReputationScore {
  overall: number;
  breakdown: {
    graduationRate: number;
    rugRate: number;
    holderRetention: number;
    avgTimeToBondHours: number;
    sampleSize: number;
  };
}

export type DeployerArchetype =
  | "serial_graduate"
  | "one_hit_wonder"
  | "consistent_dud"
  | "rug_pattern"
  | "fresh_wallet"
  | "spray_and_pray";

export interface Deployer {
  wallet: string;
  archetype: DeployerArchetype;
  archetypeLabel: string;
  archetypeEmoji: string;
  bio: string;
  reputation: ReputationScore;
  stats: {
    totalLaunches: number;
    graduated: number;
    rugged: number;
    live: number;
    dead: number;
  };
  recentLaunches: Launch[];
}

export interface DeployerThesis {
  deployer: string;
  launch?: Launch;
  signal: "green" | "yellow" | "red";
  reasoning: string;
  riskFlags: string[];
  conviction: "low" | "medium" | "high";
  generatedAt: number;
}

export interface LeaderboardEntry {
  wallet: string;
  archetype: string;
  archetypeEmoji: string;
  reputationScore: number;
  totalLaunches: number;
  graduated: number;
  rugged: number;
  lastActiveAt: number;
}

export interface FeedItem {
  id: string;
  launch: Launch;
  deployerReputation: number;
  deployerArchetype: string;
  deployerArchetypeEmoji: string;
  signal: "green" | "yellow" | "red";
  reasoning: string;
  timestamp: number;
}
