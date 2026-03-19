# claude.md — SIGX Dashboard (Simplified)

## Product
SIGX is an AI-native platform to build, backtest, and deploy **MetaTrader 5 strategies**.

Core flow:
**Prompt → Strategy → Backtest → Iterate → Deploy**

Everything happens inside **AI chat**.

---

## Core concept

SIGX is NOT a traditional dashboard.

It is:

👉 **Chat-first trading strategy builder**

Users:
- describe a strategy
- instantly see results
- iterate in chat
- deploy when ready

---

## Layout

### Sidebar (simple)

- Home
- Strategies
- Marketplace
- Leaderboard
- AI Builder (main)
- Live
- Settings

---

### Main view

Default page = **AI Builder**

---

## AI Builder (core feature)

### Layout

- Left: Chat (main)
- Right: Dynamic panel (optional)

---

## Chat behavior

User types:

> Build a EURUSD London breakout strategy with max drawdown 5%

---

## AI response (in chat)

### 1. Strategy summary
- Entry rules
- Exit rules
- Risk logic

---

### 2. Backtest preview (embedded)

#### Chart
- Equity curve

#### Metrics
- Sharpe
- Drawdown
- Win rate
- Return

#### Actions
- Optimize
- Deploy
- View code

---

## Code view

Click “View code”:

- opens panel or modal
- shows MQL5 code
- copy + edit

---

## Iteration loop

User:
> Reduce drawdown to 3%

AI:
- updates strategy
- reruns backtest
- updates results

---

## Key UX rule

👉 **No separate backtest page**

Everything stays inside chat.

---

## Strategies page

Simple list:

- Name
- Market
- Status
- Sharpe
- Drawdown

Actions:
- Open
- Duplicate
- Delete

---

## Marketplace

Grid of strategies:

- Name
- Market
- Sharpe
- Drawdown
- Usage

Actions:
- Copy
- Run
- Deploy

---

## Leaderboard

Table:

- Rank
- Strategy
- Sharpe
- Drawdown
- Return

---

## Live page

Monitor running strategies:

- PnL
- Drawdown
- Open trades
- Status

---

## Design

- Dark UI
- Minimal
- Clean (v0 / Linear style)
- Premium feel
- No clutter

---

## Components

- Sidebar
- Chat
- PromptInput
- StrategyCard
- BacktestCard
- Chart
- Table
- Modal

---

## Tech

- Next.js
- Tailwind
- TypeScript

---

## Final objective

The app should feel like:

👉 **ChatGPT for MT5 strategies**

User experience:

- instant
- powerful
- simple
- addictive loop

---

## One-line positioning

👉 **“Build and deploy MT5 strategies in seconds.”**