"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DeployerData {
  wallet: string;
  archetypeLabel: string;
  archetypeEmoji: string;
  bio: string;
  reputation: {
    overall: number;
    breakdown: {
      graduationRate: number;
      rugRate: number;
      holderRetention: number;
      avgTimeToBondHours: number;
      sampleSize: number;
    };
  };
  stats: {
    totalLaunches: number;
    graduated: number;
    rugged: number;
    live: number;
    dead: number;
  };
  recentLaunches: Array<{
    mint: string;
    name: string;
    symbol: string;
    createdAt: number;
    status: string;
    rugFlags: string[];
    holderCount?: number;
    topHolderShare?: number;
  }>;
}

interface ThesisData {
  signal: "green" | "yellow" | "red";
  reasoning: string;
  riskFlags: string[];
  conviction: "low" | "medium" | "high";
}

export default function DeployerPage({
  params,
}: {
  params: { wallet: string };
}) {
  const { wallet } = params;
  const [data, setData] = useState<DeployerData | null>(null);
  const [thesis, setThesis] = useState<ThesisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deployer/${wallet}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json.deployer);
        setThesis(json.thesis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-8"
        >
          ← Back
        </Link>

        {loading && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Pulling deployer history…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Deployer
                  </div>
                  <h1 className="text-2xl font-semibold font-mono truncate">
                    {data.wallet.slice(0, 8)}…{data.wallet.slice(-6)}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {data.bio}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl mb-1">{data.archetypeEmoji}</div>
                  <div className="text-sm font-medium">{data.archetypeLabel}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Reputation" value={`${data.reputation.overall}/100`} />
                <Stat label="Launches" value={String(data.stats.totalLaunches)} />
                <Stat label="Graduated" value={String(data.stats.graduated)} />
                <Stat label="Rugged" value={String(data.stats.rugged)} />
              </div>
            </div>

            {thesis && (
              <div className="rounded-xl border border-border bg-muted/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <SignalDot signal={thesis.signal} />
                  <span className="text-sm font-medium uppercase tracking-wider">
                    Thesis · {thesis.conviction} conviction
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4">{thesis.reasoning}</p>
                {thesis.riskFlags.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Risk flags
                    </div>
                    {thesis.riskFlags.map((flag, i) => (
                      <div
                        key={i}
                        className="text-sm text-red-300 flex items-start gap-2"
                      >
                        <span className="text-red-400 shrink-0">⚠</span>
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Reputation breakdown
              </h3>
              <div className="space-y-3">
                <Bar
                  label="Graduation rate"
                  value={data.reputation.breakdown.graduationRate}
                  color="emerald"
                />
                <Bar
                  label="Rug rate"
                  value={data.reputation.breakdown.rugRate}
                  color="red"
                />
                <Bar
                  label="Holder retention"
                  value={data.reputation.breakdown.holderRetention}
                  color="accent"
                />
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Avg time to bond</span>
                  <span className="font-mono">
                    {data.reputation.breakdown.avgTimeToBondHours > 0
                      ? `${data.reputation.breakdown.avgTimeToBondHours}h`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Sample size</span>
                  <span className="font-mono">
                    {data.reputation.breakdown.sampleSize} launches
                  </span>
                </div>
              </div>
            </div>

            {data.recentLaunches.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                  Recent launches
                </h3>
                <div className="space-y-2">
                  {data.recentLaunches.map((l) => (
                    <a
                      key={l.mint}
                      href={`https://pump.fun/coin/${l.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border bg-muted/20 hover:bg-muted/40 p-3 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{l.symbol}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {l.name}
                          </div>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>
                      {l.rugFlags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.rugFlags.map((f) => (
                            <span
                              key={f}
                              className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300"
                            >
                              {f.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-medium mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "red" | "accent";
}) {
  const barColor =
    color === "emerald"
      ? "bg-emerald"
      : color === "red"
      ? "bg-red"
      : "bg-accent";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    bonded: { label: "Graduated", color: "bg-emerald/20 text-emerald" },
    live: { label: "Live", color: "bg-accent/20 text-accent" },
    rugged: { label: "Rugged", color: "bg-red/20 text-red" },
    dead: { label: "Dead", color: "bg-muted text-muted-foreground" },
  };
  const entry = map[status] ?? map.dead;
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${entry.color}`}>
      {entry.label}
    </span>
  );
}

function SignalDot({ signal }: { signal: "green" | "yellow" | "red" }) {
  const color =
    signal === "green" ? "bg-emerald" : signal === "red" ? "bg-red" : "bg-amber";
  return <span className={`size-2.5 rounded-full ${color}`} />;
}
