# 🪞 Mirror Deployer

**Built by [@yksanjo](https://github.com/yksanjo)**

The deployer reputation feed for pump.fun. Every coin has a deployer behind it — some have shipped three graduates in a row, some have rugged five times this week. **Mirror Deployer** makes the track record public.

Identity, transactions, memory, opportunities — connected at the deployer level.

## The Vision

Pump.fun's signal asymmetry is at the **deployer**, not the trader. A token is just an instance; the deployer is the through-line. But there's no shared reputation layer:

- Pump.fun shows you the coin, not the deployer's history
- DEX Screener shows the chart, not who's behind it
- Telegram alpha groups guess at "trusted devs" with no receipts

Mirror Deployer fixes this. Paste any pump.fun deployer wallet and get:
- **Reputation score** (0–100) from graduations, rugs, holder retention
- **Archetype**: Serial Graduate, One-Hit Wonder, Rug Pattern, Fresh Wallet, etc.
- **AI thesis** on every launch — what to ape, what to skip
- **Live feed** of new launches with deployer reputation badges

## Features

- Paste any Solana wallet → deployer profile + reputation score
- Auto-detected archetype (Serial Graduate, Rug Pattern, Spray and Pray, etc.)
- Per-launch status: live, graduated (bonded to Raydium), rugged, dead
- Risk flags: deployer dump, single-holder concentration, freeze/mint authority
- Live feed of recent pump.fun launches with reputation badges
- Leaderboard of top deployers by reputation

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your HELIUS_API_KEY
npm run dev
# Open http://localhost:3032
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deployer/[wallet]` | GET | Full deployer profile + reputation + thesis |
| `/api/leaderboard` | GET | Top deployers by reputation score |
| `/api/feed` | GET | Live launches with deployer reputation overlay |
| `/api/thesis` | POST | Generate thesis for a deployer (and optional mint) |

## Reputation Scoring

Reputation is a 0–100 score derived from on-chain history:

- **Graduation rate** — % of launches that bonded to Raydium
- **Rug rate** — % showing deployer-dump or LP-pull patterns
- **Holder retention** — distribution and count of token holders
- **Time-to-bond** — how fast their winners graduate
- **Sample size** — small sample = lower confidence

Rule-based, transparent, deterministic. No black-box LLM scoring — just on-chain truth.

## Stack

- Next.js 14 + TypeScript + Tailwind 4
- Helius RPC for transaction data, token metadata, holder distribution
- Pump.fun program ID parsing for launch and graduation detection

## Deploy

```bash
npm run build
npm start
```

Production runs on port 3032. See `deploy/` for systemd + Caddy snippets.

## Part of the Mirror family

- **[Mirror Pilot](https://github.com/yksanjo/mirror-pilot)** — Wallet-level trade thesis generator
- **[Mirror Marketplace](https://github.com/yksanjo/mirror-marketplace)** — Subscribe to top traders' AI theses
- **Mirror Deployer** — *(you are here)* — pump.fun deployer reputation feed

---

*Built by [Yoshi Kondo](https://linkedin.com/in/yoshi-kondo-3110462a9/) · [@yksanjo](https://github.com/yksanjo)*
