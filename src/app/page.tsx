"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  wallet: string;
  archetype: string;
  archetypeEmoji: string;
  reputationScore: number;
  totalLaunches: number;
  graduated: number;
  rugged: number;
  lastActiveAt: number;
}

interface FeedItem {
  id: string;
  launch: {
    mint: string;
    name: string;
    symbol: string;
    deployer: string;
    status: string;
    rugFlags: string[];
  };
  deployerReputation: number;
  deployerArchetype: string;
  deployerArchetypeEmoji: string;
  signal: "green" | "yellow" | "red";
  reasoning: string;
  timestamp: number;
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [tab, setTab] = useState<"leaderboard" | "feed">("leaderboard");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLeaderboard(data.leaderboard ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeed() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeed(data.feed ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-pink" />
            Deployer reputation feed · pump.fun
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-4">
            Mirror Deployer
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Every pump.fun deployer has a track record. Now it&apos;s public.
            Reputation, launch history, AI thesis — for any wallet.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Deployer wallet address"
              className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border focus:border-accent focus:outline-none font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && wallet.trim()) {
                  window.location.href = `/deployer/${wallet.trim()}`;
                }
              }}
            />
            <Link
              href={wallet.trim() ? `/deployer/${wallet.trim()}` : "#"}
              className="px-6 py-3 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap text-center"
              aria-disabled={!wallet.trim()}
            >
              Mirror
            </Link>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => {
              setTab("leaderboard");
              if (leaderboard.length === 0) loadLeaderboard();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "leaderboard"
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => {
              setTab("feed");
              if (feed.length === 0) loadFeed();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "feed"
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Live Feed
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Loading…
          </div>
        )}

        {!loading && tab === "leaderboard" && (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-12">
                No deployers yet. Try the live feed.
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <Link
                  key={entry.wallet}
                  href={`/deployer/${entry.wallet}`}
                  className="block rounded-xl border border-border bg-muted/30 hover:bg-muted/50 p-4 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center text-sm font-medium text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="text-2xl">{entry.archetypeEmoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">
                        {entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.archetype} · {entry.totalLaunches} launches ·{" "}
                        {entry.graduated} graduated · {entry.rugged} rugged
                      </div>
                    </div>
                    <ReputationBadge score={entry.reputationScore} />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {!loading && tab === "feed" && (
          <div className="space-y-3">
            {feed.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-12">
                No launches yet. Refresh to try again.
              </div>
            ) : (
              feed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SignalDot signal={item.signal} />
                      <span className="font-medium truncate">
                        {item.launch.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.launch.name}
                      </span>
                    </div>
                    <ReputationBadge score={item.deployerReputation} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {item.reasoning}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={`/deployer/${item.launch.deployer}`}
                      className="text-accent hover:underline font-mono"
                    >
                      {item.deployerArchetypeEmoji} {item.deployerArchetype}
                    </Link>
                    <a
                      href={`https://pump.fun/coin/${item.launch.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground font-mono"
                    >
                      pump.fun ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ReputationBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald/20 text-emerald border-emerald/30"
      : score < 35
      ? "bg-red/20 text-red border-red/30"
      : "bg-amber/20 text-amber border-amber/30";
  return (
    <div
      className={`px-2.5 py-1 rounded-md border text-xs font-medium tabular-nums ${color}`}
    >
      {score}/100
    </div>
  );
}

function SignalDot({ signal }: { signal: "green" | "yellow" | "red" }) {
  const color =
    signal === "green" ? "bg-emerald" : signal === "red" ? "bg-red" : "bg-amber";
  return <span className={`size-2 rounded-full ${color}`} />;
}
