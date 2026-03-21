# claude.md

## Project
Build a premium landing page for **SIGX**, an AI-native platform for creating, backtesting, optimizing, and deploying **MetaTrader 5 trading strategies**.

The website should feel like:
- **v0 for interaction**
- **Base44 for polish**
- dark, premium, product-first
- minimal, sharp, modern
- conversion-focused, not over-marketed

This is **not** a generic SaaS landing page.
This is a **MetaTrader 5 strategy operating system**.

---

## Core positioning

SIGX helps users go from:

**idea → MT5 strategy → backtest → deploy**

using natural language.

### Positioning line
**From idea to live MT5 strategy in seconds.**

### Product summary
SIGX is an AI-powered strategy engine for MetaTrader 5 that allows users to:
- describe a strategy in plain English
- generate the trading logic
- backtest it instantly
- optimize it with AI
- deploy it to MetaTrader 5

This version of the product is focused **only on MT5**.

Supported strategy types for now:
- FX strategies
- gold strategies
- indices strategies
- BTC / crypto CFDs on MT5
- scalping
- mean reversion
- breakout
- trend following
- market-neutral / stat arb where supported by MT5 workflows

---

## Design direction

### Hero direction
Use **v0-style hero interaction**:
- dark background
- centered headline
- dominant prompt box
- suggestion pills under input
- instant product feel

### Overall visual style
Use **Base44-level polish**:
- premium spacing
- refined typography
- subtle borders
- large rounded corners
- tasteful glow only if needed
- black / charcoal background
- soft gray text hierarchy
- clean, expensive feel

### Visual principles
- background: near-black
- cards: black / charcoal with subtle border
- text: white / gray
- CTA: white or soft off-white
- accent: restrained cool glow only if tasteful
- avoid loud crypto colors
- avoid “cheap trading bot” aesthetic
- make it feel premium and serious

### Overall vibe
Think:
- v0
- Linear
- Vercel
- premium quant software
- professional MT5 tooling

---

## Tech stack
Use:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion for subtle transitions

Code should be:
- clean
- modular
- responsive
- production-level
- componentized

---

## Page structure

### 1. Navbar
Dark, minimal, sticky.

#### Left
- SIGX logo (text-only or simple mark + text)

#### Center nav
- Strategies
- Marketplace
- Leaderboard
- Pricing
- Enterprise
- Docs

#### Right
- Sign In
- Start Building

Navbar should feel like v0:
- compact
- subtle border bottom
- clean spacing
- blurred dark background on scroll

---

### 2. Hero section
This is the most important section.

#### Headline
**What MT5 strategy do you want to build?**

#### Optional subheadline
**Create, backtest, and deploy MetaTrader 5 strategies with AI.**

#### Input box
A large centered prompt input.

Placeholder:
**Build an MT5 EURUSD breakout strategy for the London session with max drawdown under 5%**

Prompt box should feel like the product:
- large
- dark
- rounded
- subtle border
- send / arrow button bottom-right
- optional model selector in lower-left like:
  - SIGX Core
  - SIGX Max

#### Suggestion pills below
Use MT5-specific prompts:
- EURUSD London breakout
- XAUUSD mean reversion
- NAS100 momentum strategy
- BTCUSD MT5 breakout
- EURUSD scalping system
- Gold trend-following strategy

#### Hero behavior
The hero should immediately communicate:
- this is for MetaTrader 5
- user can start now
- speed + execution + results

Do not make the hero too marketing-heavy.

---

### 3. Strategy section
Inspired by the v0 “Start with a template” section.

#### Section title
**Top MT5 Strategies**

#### Category pills
Use:
- FX
- Gold
- Indices
- Crypto CFDs
- Scalping
- Breakout
- Browse all

#### Strategy cards
Create a premium grid of strategy cards.

Example cards:
- EURUSD London Breakout
  - Sharpe 2.0
  - Max DD 4.2%
  - 12.1k runs

- XAUUSD Mean Reversion
  - Sharpe 1.8
  - Win rate 63%
  - 9.4k runs

- NAS100 Momentum
  - Return 27%
  - Trend-following
  - 6.8k runs

- BTCUSD MT5 Breakout
  - Sharpe 1.9
  - Max DD 5.1%
  - 7.2k runs

Each card should include:
- visual preview / chart thumbnail
- title
- metadata
- credibility indicators
- optional pricing label like Free / Pro / 1 Credit

This section should feel like an MT5 strategy marketplace preview.

---

### 4. Core feature grid
Inspired by v0’s premium black feature card layout.

#### Main headline card
**Prompt. Backtest. Deploy.**

Subtext:
**Turn ideas into live MetaTrader 5 strategies in minutes with AI.**

#### Other cards
Create a 2-row grid of feature cards with strong typography and simple product visuals.

Feature cards:
1. **MT5 Strategy Builder**  
   Turn natural language into executable MetaTrader 5 strategy logic.

2. **Backtest Engine**  
   Test strategies on historical MT5 market data with fast iteration.

3. **One-Click MT5 Deployment**  
   Push strategies into your MT5 workflow with minimal friction.

4. **Strategy Optimization**  
   Fine-tune parameters, risk settings, and entry/exit logic with AI assistance.

5. **Strategy Marketplace**  
   Discover, copy, and monetize high-performing MT5 strategies.

6. **AI Trading Engine**  
   AI helps generate, improve, and refine strategies based on your objective.

Optional cards:
7. **Risk Controls**  
   Set drawdown limits, stop logic, sizing rules, and execution constraints.

8. **Live Monitoring**  
   Track PnL, drawdown, win rate, and execution behavior in real time.

These cards should feel premium and product-led.

---

### 5. Marketplace section
Dedicated section for monetization and ecosystem.

#### Title
**MT5 Strategy Marketplace**

#### Copy
**Discover, copy, and publish MetaTrader 5 strategies built by the SIGX community.**

Show featured strategies with:
- title
- market
- Sharpe
- drawdown
- creator
- usage count

This section should communicate:
- community
- monetization
- discoverability
- credibility

---

### 6. Leaderboard section
A competitive, viral section.

#### Title
**Leaderboard**

#### Copy
**See the highest-performing MetaTrader 5 strategies across markets and styles.**

Possible leaderboard columns:
- Rank
- Strategy
- Market
- Sharpe
- Drawdown
- Return
- Creator

Optional badges:
- Top 1%
- Most Copied
- Lowest Drawdown
- Best FX Strategy
- Best Gold Strategy

---

### 7. Enterprise section
Dark premium section for professional users.

#### Title
**Built for serious MT5 traders and teams**

#### Copy
**From individual traders to professional strategy teams, SIGX provides the infrastructure to build, test, govern, and deploy MetaTrader 5 strategies at scale.**

Include bullets like:
- audit trails
- team workspaces
- API access
- dedicated compute
- private deployment
- advanced permissions
- priority support

CTA:
**Talk to Sales**

---

### 8. Final CTA section
Large centered CTA near the bottom.

#### Headline
**Start building your MT5 strategy**

#### Subheadline
**Go from idea to live MetaTrader 5 execution in minutes.**

#### Buttons
- Start Building
- Book a Demo

---

### 9. Footer
Dark, minimal, structured like v0.

#### Left
- SIGX logo
- short description:
  **SIGX is the AI-powered infrastructure for building and scaling MetaTrader 5 strategies.**

#### Right columns

##### Product
- Home
- Strategies
- Marketplace
- Leaderboard
- Pricing
- Enterprise

##### Resources
- Docs
- API
- FAQs
- Blog

##### Company
- About
- Careers
- Contact

##### Legal
- Privacy
- Terms
- Security

##### Social
- X / Twitter
- LinkedIn
- GitHub

---

## Copy replacements

Use these exact text replacements where appropriate:

### Hero title
**What MT5 strategy do you want to build?**

### Generic templates section title
**Top MT5 Strategies**

### Main process line
**Prompt. Backtest. Deploy.**

### Final CTA title
**Start building your MT5 strategy**

### Positioning line
**From idea to live MT5 strategy in seconds.**

---

## UX principles

### Must-have
- immediate clarity
- MT5-specific language
- input-first interaction
- premium dark product feel
- fast loading
- clean spacing
- strong typography

### Avoid
- generic “AI app builder” language
- loud crypto visuals
- cheesy trading bot branding
- clutter
- overdone gradients
- weak placeholder copy

---

## Components to create
Create reusable components for:
- Navbar
- HeroPrompt
- CategoryPills
- StrategyCard
- FeatureCard
- MarketplaceSection
- LeaderboardTable
- EnterpriseSection
- CTASection
- Footer

---

## Motion / animation
Use Framer Motion subtly:
- fade-up on section entrance
- slight lift on card hover
- smooth transitions
- no excessive animation

---

## Responsiveness
The page must work well on:
- desktop
- tablet
- mobile

On mobile:
- hero remains strong
- prompt box remains dominant
- cards stack nicely
- navbar collapses cleanly

---

## Output requirements
Generate:
- `app/page.tsx`
- reusable components
- clean Tailwind styling
- no lorem ipsum
- fully written product copy
- visually cohesive final result

---

## Final objective
The page should feel like:

**v0 for MetaTrader 5 strategy creation**

Users should instantly feel:
1. this is specifically for MT5
2. they can build a strategy right away
3. this is a real premium product, not a marketing shell
4. it is serious enough for advanced traders and professional teams

Make it feel like a category-defining homepage for a premium MT5 AI trading startup.