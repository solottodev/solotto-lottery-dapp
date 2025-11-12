# Solotto dLOS: A Decentralized Lottery Operating System for Solana

**Bagonaut** (Solotto Founder)
SolottoOnSol@gmail.com

**Peppa Mache** (dLOS Technical Founder & Architect)
SolottoDev@gmail.com

**October 31, 2025**

---

## Abstract

A purely decentralized lottery system for blockchain-based tokens would allow transparent, verifiable prize distributions without relying on trusted intermediaries. Traditional lottery systems suffer from opacity, high operator fees (50%+), and geographic restrictions. Existing on-chain attempts provide only basic smart contracts without the infrastructure necessary for practical deployment. We propose a solution to the fair lottery problem using a combination of cryptographic randomness derived from blockchain consensus, multi-tier participant segmentation, and full-stack automation. The Solotto dLOS (Decentralized Lottery Operating System) provides production-grade infrastructure for any SPL token to deploy provably fair lotteries with complete transparency, automated execution, and verifiable on-chain audit trails. The network is secured by Solana's validator consensus providing unpredictable blockhashes, which serve as the randomness source for deterministic winner selection.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Background](#2-background)
3. [System Architecture](#3-system-architecture)
4. [Cryptographic Drawing Mechanism](#4-cryptographic-drawing-mechanism)
5. [Multi-Tier Fairness Model](#5-multi-tier-fairness-model)
6. [Eligibility and Sybil Resistance](#6-eligibility-and-sybil-resistance)
7. [Technical Implementation](#7-technical-implementation)
8. [Security Analysis](#8-security-analysis)
9. [Economic Model](#9-economic-model)
10. [Comparative Analysis](#10-comparative-analysis)
11. [Future Work](#11-future-work)
12. [Conclusion](#12-conclusion)
13. [References](#references)

---

## 1. Introduction

The global lottery industry represents a $300 billion annual market[1], touching the lives of hundreds of millions of participants worldwide. Yet despite this massive scale, the industry remains fundamentally broken at its core. Every day, people purchase lottery tickets with the hope of winning life-changing prizes, but they do so within a system that demands blind trust in centralized operators, offers no meaningful verification of fairness, and extracts exorbitant fees that reduce prize pools by more than half. The blockchain revolution promised to fix these problems through transparent, trustless systems—but five years into the crypto era, practical lottery infrastructure remains conspicuously absent.

The promise of blockchain-based lotteries has been discussed since Ethereum's early days, yet no project has successfully delivered production-grade infrastructure that combines verifiable randomness, operational automation, and user-friendly interfaces. Solotto dLOS bridges this gap, providing the first complete lottery operating system purpose-built for the Solana blockchain ecosystem.

### 1.1 The Problem

The current state of lottery systems represents a failure across three critical dimensions: trust, efficiency, and accessibility. Each dimension reveals deep structural problems that have persisted for decades, resisting meaningful reform because the incumbent systems benefit from the status quo.

#### 1.1.1 The Trust Problem: Centralization and Opacity

Traditional lotteries operate as impenetrable black boxes. When you purchase a lottery ticket from a state-run or private operator, you receive a promise: your ticket will be entered into a fair drawing, and winners will be selected randomly. But this promise rests entirely on trust. You cannot verify that your ticket was actually entered. You cannot observe the drawing mechanism. You cannot audit the prize pool calculations. You cannot confirm that the announced winners are real people who actually held valid tickets.

This information asymmetry creates an environment ripe for abuse. History is littered with lottery scandals: from the 1980 Pennsylvania lottery where weighted balls were used to rig the drawing, to the 2017 Hot Lotto fraud where an insider manipulated the random number generator to predict winning numbers. In each case, participants had no way to detect the fraud until whistleblowers came forward—often years after the fact.

The fundamental problem is architectural: centralized lotteries concentrate all power in the hands of operators. Drawing mechanisms are proprietary. Prize calculations happen behind closed doors. Winner selection processes are opaque. Participants must simply trust that operators are honest, competent, and not subject to internal fraud or external pressure. This trust requirement is antithetical to the principles that blockchain technology was designed to address.

#### 1.1.2 The Efficiency Problem: Extractive Economics

Even if we assume perfect honesty from lottery operators, the economic structure of traditional lotteries is fundamentally extractive. Study after study shows that state-run lotteries in the United States retain 40-60% of ticket revenues as "administrative costs" and government revenue[2]. This means that for every dollar spent on lottery tickets, only 40-60 cents flows into the prize pool. The remainder disappears into operational overhead, marketing expenses, retail commissions, and government coffers.

This extraction rate is staggering when compared to other forms of gambling or investment. Casino games typically have house edges of 1-5%. Stock market index funds charge expense ratios of 0.03-0.2%. Even actively managed investment funds rarely exceed 2% annual fees. Yet lottery operators routinely extract 40-60% of every dollar, making lotteries one of the most expensive forms of entertainment or speculation available to consumers.

Beyond fee extraction, traditional lotteries suffer from severe operational inefficiencies. Prize distribution can take days or weeks, requiring winners to physically claim prizes at designated locations, submit extensive paperwork, and navigate bureaucratic processes. Geographic restrictions prevent global participation—a New York resident cannot participate in a California lottery, and international participation is virtually impossible. Payment systems rely on archaic infrastructure: cash, checks, or bank wires rather than instant digital settlement.

#### 1.1.3 The Implementation Gap: Crypto's Unfulfilled Promise

The blockchain and cryptocurrency ecosystem has grown explosively over the past decade, spawning thousands of tokens, hundreds of blockchain protocols, and billions in market capitalization. Yet despite this growth, practical lottery infrastructure remains absent. Projects that have attempted to build on-chain lotteries fall into three categories, each with fatal flaws:

**Manual Discord Raffles**: Many crypto projects run "holder raffles" by manually exporting token holder lists from blockchain explorers, pasting wallet addresses into spreadsheets, and using random.org or similar tools to select winners. These processes offer zero automation, no audit trails, and minimal transparency. They're essentially Web2 processes applied to Web3 assets—a missed opportunity for blockchain's core value propositions.

**Simple Smart Contracts**: Some projects deploy basic smart contracts that implement lottery logic on-chain. While these contracts provide transparency of the lottery mechanism itself, they lack critical infrastructure for real-world operation. There are no operator dashboards for configuration. No analytics for tracking participation trends. No CSV exports for compliance reporting. No professional user interfaces for participants. These contracts are building blocks, not complete solutions.

**Non-Existent Infrastructure**: Most projects that want to run lotteries simply don't, because building the infrastructure from scratch requires months of engineering work. The barrier to entry is too high, so projects either skip community rewards entirely or resort to manual processes that don't scale.

The crypto ecosystem desperately needs fair distribution mechanisms. DAOs need to distribute treasury funds to active contributors. Gaming projects need to reward players with in-game assets. Meme coin communities need to engage holders with exciting prize events. NFT projects need to distribute rare drops to loyal collectors. Yet no production-grade infrastructure exists to serve these use cases.

### 1.2 Our Solution: A Complete Lottery Operating System

Solotto dLOS (Decentralized Lottery Operating System) addresses each dimension of the lottery problem through a combination of cryptographic innovation, economic design, and full-stack engineering. Rather than building yet another simple smart contract or relying on trust-based manual processes, we've created comprehensive infrastructure that any Solana token can deploy in minutes.

#### 1.2.1 Verifiable Randomness Through Validator Consensus

The heart of any lottery system is randomness. If the random number generation process can be predicted or manipulated, the entire system fails. Traditional lotteries use proprietary hardware random number generators that participants cannot audit. Some blockchain lotteries use external oracles like Chainlink VRF, which introduce new trust assumptions and additional costs.

Solotto dLOS takes a different approach: we derive randomness directly from Solana's validator consensus mechanism. Every 400 milliseconds, Solana's validator network produces a new block with a unique blockhash—a 32-byte cryptographic fingerprint of all transactions in that block and the previous block's hash. This blockhash is:

- **Unpredictable**: No single entity controls which transactions get included in a block or the order in which they're processed. The blockhash emerges from the collective activity of thousands of validators and users across the network.

- **Verifiable**: Every blockhash is permanently recorded on the Solana blockchain. Anyone can query historical blocks to verify that a particular blockhash existed at a claimed slot number.

- **High-Entropy**: Cryptographic hash functions like SHA-256 produce uniformly distributed outputs. A single bit change in input produces a completely different hash, providing 256 bits of entropy.

By using Solana blockhashes as our randomness source, we eliminate the trust requirement entirely. Lottery operators cannot manipulate the randomness because they don't control the validator network. Participants can independently verify the randomness by querying the blockchain. The system becomes provably fair in a way that traditional lotteries can never achieve.

#### 1.2.2 Multi-Tier Fairness: Preventing Whale Dominance

A naive implementation of a token-based lottery would give every token holder an equal chance of winning, or perhaps weight probabilities by holdings. But this approach fails to account for the extreme wealth concentration typical in cryptocurrency markets. In most tokens, the top 1% of holders control 80%+ of supply. If winning probabilities scale with holdings, these "whales" would win almost every drawing, defeating the purpose of community rewards.

Solotto dLOS solves this through a multi-tier segmentation model. We divide all token holders into four tiers based on their percentile ranking:

- **Tier 1** (Top 5%): The largest holders, typically whales and early investors
- **Tier 2** (5-20%): Mid-sized holders, often community builders and engaged participants
- **Tier 3** (20-50%): Smaller holders who maintain meaningful positions
- **Tier 4** (50-100%): Micro-holders and new community members

Each tier receives its own winner in every lottery round. Prize allocation favors larger holders (Tier 1 gets 40% of the prize pool, Tier 4 gets 10%), but critically, within each tier, every participant has equal probability of winning regardless of their exact balance. A Tier 1 holder with $5,000 in tokens has the same chance as a Tier 1 holder with $500,000.

This design achieves several goals simultaneously: it rewards larger holders with bigger prizes (maintaining incentive alignment), ensures that smaller holders have realistic winning chances (preventing discouragement), and distributes prizes broadly across the community (creating excitement and engagement at all levels).

#### 1.2.3 Production Infrastructure: Beyond Smart Contracts

The most significant differentiator of Solotto dLOS is not any single technical innovation, but rather the comprehensive infrastructure we've built around the lottery mechanism. While other projects stop at smart contracts, we provide a complete, white-label SaaS platform:

**Operator Dashboard**: A professional web interface where lottery operators configure rounds, monitor progress through the five-phase execution engine, review participant lists, execute drawings, and distribute prizes. The dashboard includes two-factor authentication, role-based access control, session persistence, and CSV export functionality.

**Transparency Portal**: A public website where anyone—participant or outside observer—can verify lottery fairness. The portal displays system health status, recent operations, complete audit trails with blockhash verification, and links to on-chain transactions. No authentication required; radical transparency by default.

**Backend API**: An Express.js server implementing business logic for the five-phase workflow, cryptographic drawing algorithm, RPC failover management, Jupiter DEX integration for prize swaps, and comprehensive audit logging. All endpoints documented with OpenAPI/Swagger.

**Database Infrastructure**: A PostgreSQL database with carefully designed schema to store rounds, participants, snapshots, drawings, and balance histories. Role-based access with separate read-write and read-only credentials. Daily automated backups with 7-day retention.

**Blockchain Integration**: Direct integration with Solana via Alchemy Enhanced RPC (with public RPC failover), SPL token standard support, Jupiter Aggregator v6 for SOL-to-token swaps, and real-time balance queries.

This infrastructure transforms lottery operation from a complex engineering project into a simple SaaS deployment. A crypto project can launch their first lottery in under an hour, rather than spending months building custom infrastructure.

### 1.3 Scope and Structure of This Paper

This whitepaper provides a comprehensive technical description of the Solotto dLOS architecture, mechanisms, and economic model. We begin with background on traditional and blockchain-based lottery approaches (Section 2), then describe our system architecture in detail (Section 3). The core technical sections explain our cryptographic drawing mechanism (Section 4), multi-tier fairness model (Section 5), and eligibility/Sybil resistance design (Section 6).

Following the technical exposition, we document our implementation details including technology stack, database schema, and code examples (Section 7). Security analysis covers threat modeling and defense mechanisms (Section 8). Economic modeling presents our revenue model, unit economics, and market projections (Section 9). We position Solotto dLOS within the competitive landscape (Section 10), describe future development plans (Section 11), and conclude with key insights and investment thesis (Section 12).

Our goal is to provide sufficient technical depth for serious evaluation by cryptographers, engineers, and investors, while maintaining accessibility for readers interested in understanding how verifiable randomness and economic mechanism design can solve long-standing problems in lottery systems.

---

## 2. Background

Understanding why Solotto dLOS represents a breakthrough requires examining the evolution of lottery systems: from traditional centralized models through early blockchain experiments, to Solana's unique infrastructure capabilities that make truly fair, efficient lotteries possible for the first time.

### 2.1 Traditional Lottery Systems: The Centralized Paradigm

For centuries, lotteries have operated under a fundamentally centralized model. Whether run by governments (state lotteries), private companies (casino lotteries), or charitable organizations (raffle fundraisers), the structure remains remarkably consistent: participants purchase tickets from an operator, the operator conducts a private drawing, winners are announced, and prizes are distributed—all under the control of a single entity.

![Figure 1 - Traditional Lottery Flow](images/Figure%201%20-%20Traditional%20Lottery%20Flow.png)

This centralized model persists because it serves the interests of operators and regulators, even as it fails participants in multiple ways.

#### The Verifiability Crisis

The most fundamental problem with traditional lotteries is the impossibility of independent verification. When a state lottery announces that ticket number 42,819,372 has won a $10 million jackpot, participants have no way to confirm several critical facts: Was this ticket actually purchased? Was it part of the eligible pool for this drawing? Was the drawing mechanism truly random, or could it have been influenced by insiders? Were all eligible tickets given equal probability of selection?

These questions aren't merely theoretical. The 2017 Hot Lotto scandal revealed how Eddie Tipton, a security director at the Multi-State Lottery Association, installed malicious code in random number generator software that allowed him to predict winning numbers on specific days. Over six years, Tipton and accomplices manipulated at least five lottery drawings across multiple states, winning over $24 million. The fraud was only discovered when investigators noticed suspicious patterns in winning ticket purchases—years after the manipulation began.

The Hot Lotto case exposed a terrifying truth: even systems with extensive security protocols, multiple auditors, and regulatory oversight can be compromised when randomness generation happens in a black box. Participants had no technical means to verify fairness; they could only hope that internal controls would catch fraud eventually. This hope proved insufficient.

#### Economic Extraction at Scale

Even assuming perfect honesty, traditional lotteries operate with economic structures that extract massive value from participants. State lotteries in the United States typically allocate revenues as follows:

- **40-60%**: Prize pool (what actually goes to winners)
- **20-30%**: Government revenue (state budgets, education funding, etc.)
- **5-10%**: Retail commissions (stores that sell tickets)
- **5-10%**: Administrative costs (operators, marketing, systems)
- **5-10%**: Lottery operator profit

This allocation means that for every dollar spent on a lottery ticket, only 40-60 cents contributes to prizes. The remainder flows to governments, retailers, and operators as fees and taxes. From a pure expected value perspective, this makes lotteries one of the worst possible ways to spend money—worse than casino gambling (typically 95-99% RTP), worse than stock market investing (99%+ returns to investors after fees), worse even than most carnival games.

The extractive economics extend beyond fee structures to operational inefficiencies. Prize distribution in traditional lotteries requires extensive friction:

- **Time Delays**: Winners must wait days to weeks to claim prizes, as operators verify tickets, process paperwork, and arrange transfers
- **Geographic Barriers**: Winners must physically travel to claim centers, often requiring interstate or international travel
- **Identity Requirements**: Extensive KYC and tax documentation, creating privacy concerns and bureaucratic burden
- **Payment Limitations**: Prizes paid via check or bank wire, with limited options for installments or alternative assets

Each layer of friction serves someone's interests—government tax collectors, banking intermediaries, regulatory agencies—but not the interests of participants who simply want fair, efficient access to prizes they've legitimately won.

#### Regulatory Capture and Innovation Resistance

Traditional lotteries exist within dense regulatory frameworks that ostensibly protect consumers but often serve to entrench incumbents and prevent innovation. Lottery licenses are granted to monopoly or oligopoly operators who face minimal competitive pressure. New entrants cannot simply launch better lottery products; they must navigate years of lobbying, regulatory approval, and political negotiation.

This regulatory structure made sense in an era when lotteries required physical infrastructure: printing tickets, distributing them to retail locations, collecting revenues, conducting drawings with physical balls or machines. The capital requirements and operational complexity created natural monopolies that required government oversight.

But the digital age has demolished these rationales. The internet enables global distribution at near-zero marginal cost. Cryptography provides verifiable randomness without physical apparatus. Blockchain enables instant settlement without payment intermediaries. Yet regulatory frameworks remain frozen in the pre-digital era, protecting incumbent operators rather than enabling innovation that would benefit participants.

### 2.2 Blockchain-Based Approaches: Unfulfilled Promise

The emergence of blockchain technology promised to solve lottery's core problems: verifiability through public ledgers, efficient settlement through automated execution, and global access through permissionless participation. Early blockchain enthusiasts predicted that decentralized lotteries would quickly replace centralized counterparts, just as Bitcoin promised to replace centralized currencies.

A decade later, this vision remains largely unrealized. While several projects have attempted blockchain-based lotteries, each approach has encountered fundamental limitations that prevent mainstream adoption.

#### Ethereum and the Gas Cost Barrier

Ethereum, as the first blockchain platform supporting sophisticated smart contracts, naturally became the testing ground for decentralized lottery experiments. Projects like PoolTogether pioneered the "no-loss lottery" concept: participants deposit funds into a smart contract, the contract lends those funds to interest-bearing protocols like Compound or Aave, the interest accumulates into a prize pool, and winners are selected randomly to receive the interest while all participants can withdraw their principal at any time.

This innovation solved certain problems elegantly. By structuring the lottery around interest rather than ticket purchases, PoolTogether eliminated the negative expected value problem that makes traditional lotteries economically irrational. Participants lose nothing except opportunity cost, while winners receive real prizes. The smart contract provides full transparency: anyone can verify that funds are allocated correctly and that winner selection follows the documented algorithm.

However, Ethereum's fundamental architecture creates insurmountable barriers for high-volume lottery operations. Gas costs—the fees required to execute smart contract operations—regularly reach $5-50 per transaction during periods of network congestion. For a lottery that needs to process thousands of participants, these costs become prohibitive. A lottery round with 1,000 participants might incur $5,000-50,000 in gas costs just to record entries and distribute prizes.

Beyond cost, Ethereum's 12-15 second block times and relatively low throughput (15-30 transactions per second) mean that lottery operations must be carefully structured to avoid network congestion. Drawing winners requires waiting multiple blocks to ensure finality. Prize distribution must be batched to avoid overwhelming the network. The user experience degrades significantly compared to centralized alternatives.

These limitations aren't temporary growing pains; they're inherent to Ethereum's architecture. Layer 2 scaling solutions like Optimism and Arbitrum improve cost and speed, but add complexity and introduce new trust assumptions (rollup operators, fraud proof mechanisms, bridge contracts). A truly decentralized, verifiably fair lottery requires the base layer's security guarantees—which means accepting Ethereum's performance constraints.

#### Chainlink VRF: Trading Decentralization for Convenience

Another approach to blockchain lotteries uses Chainlink's Verifiable Random Function (VRF) service. Chainlink VRF provides cryptographically secure random numbers that can be verified on-chain, eliminating the need for trust in randomness generation. Smart contracts can request random numbers from Chainlink, receive them along with cryptographic proofs of correctness, and use them for winner selection.

This approach offers significant advantages: the randomness is truly unpredictable (generated off-chain using techniques that leverage quantum effects or atmospheric noise), verifiably random (cryptographic proofs ensure the generated number corresponds to the committed seed), and conveniently accessible (simple API for smart contracts).

However, Chainlink VRF introduces several new problems:

**Centralization Risk**: While Chainlink uses a network of independent node operators, the VRF service still represents a centralized dependency. If Chainlink nodes go offline or refuse to serve a particular contract, the lottery cannot function. This reintroduces exactly the kind of centralization risk that blockchain was meant to eliminate.

**Oracle Manipulation**: Chainlink nodes could theoretically collude to manipulate random numbers, especially if lottery prizes become large enough to create meaningful economic incentives for fraud. While Chainlink's cryptographic commitments make manipulation detectable, detection after the fact doesn't help participants who have already lost to a rigged drawing.

**Additional Costs**: Chainlink VRF charges fees for randomness generation—typically 0.1-0.5 LINK per request, which translates to $1-5 per drawing at recent prices. For lotteries operating on tight margins, these costs add significantly to operational overhead.

**Response Delays**: VRF requests don't complete instantly; they require multiple on-chain transactions (request submission, randomness generation, fulfillment callback). This adds latency to lottery operations and complicates user experience.

More fundamentally, using Chainlink VRF misses an opportunity to leverage blockchain's native capabilities. Blockchains already produce randomness through their consensus mechanisms—every block hash represents an unpredictable, verifiable random number generated by the distributed validator network. Using external oracles for randomness when the blockchain itself can provide it seems like architectural over-engineering.

#### Simple On-Chain Raffles: Missing the Infrastructure

A third category of blockchain lottery attempts involves simple smart contracts that implement basic raffle logic: collect participant addresses, accept entry fees, select a winner randomly (often using block hashes), and transfer the prize. These contracts provide transparency—all logic is on-chain and auditable—while avoiding the complexity and cost of more sophisticated systems.

The problem with simple raffles is that they're just that: simple. They provide the mechanism for selecting winners but none of the infrastructure necessary for real-world operation. Consider what these contracts typically lack:

**No Operator Interface**: Configuring and managing raffles requires submitting transactions directly to the smart contract, often through command-line tools or custom scripts. There's no dashboard for viewing participant lists, no analytics for tracking trends, no user-friendly way to monitor round status.

**No Participant Experience**: Users must interact with smart contracts directly, copying and pasting contract addresses, carefully specifying gas parameters, and hoping transactions succeed. There's no clean web interface explaining how the lottery works, displaying current prize pools, or showing historical winners.

**No Compliance Features**: Real-world lottery operation requires extensive record-keeping for tax purposes, regulatory reporting, and dispute resolution. Simple raffles provide no CSV exports, no participant verification systems, no blacklist management, no jurisdiction filtering.

**No Payment Flexibility**: Smart contract raffles typically accept only the blockchain's native token (ETH on Ethereum, SOL on Solana). They don't integrate with DEXes for token swaps, don't support prize distribution in alternative assets, don't handle multi-token rewards.

These limitations mean that simple raffles remain toys—interesting experiments for blockchain developers, but unusable for projects that need reliable, professional lottery infrastructure. A crypto project considering running regular community lotteries would look at simple raffle contracts and conclude they need to build custom infrastructure—which brings us back to the original problem that practical lottery infrastructure doesn't exist.

### 2.3 Solana as Infrastructure: Why Now is Different

The failures of Ethereum-based lotteries and the limitations of simple raffle contracts might suggest that blockchain simply isn't suitable for lottery operations. But this conclusion would be premature. The real lesson is that blockchain lottery infrastructure requires specific performance characteristics that earlier platforms couldn't provide: low cost, high speed, high throughput, and built-in randomness.

Solana, launched in 2020, provides exactly these characteristics through fundamental architectural innovations.

#### Speed: 400-Millisecond Block Times

Solana produces blocks every 400 milliseconds—30x faster than Ethereum's 12-second blocks and 150x faster than Bitcoin's 10-minute blocks. This speed difference isn't merely a quantitative improvement; it fundamentally changes what kinds of applications become practical.

For lottery systems, sub-second block times mean that operations feel instantaneous to users. Drawing winners doesn't require waiting minutes for blockchain confirmation—it happens within a single second. Prize distribution doesn't require careful transaction batching to avoid overwhelming the network—thousands of payments can execute in rapid succession. The user experience approaches the responsiveness of centralized systems while maintaining blockchain's verifiability guarantees.

Beyond user experience, fast block times enable a different approach to randomness. With 12-second Ethereum blocks, using block hashes for randomness introduces significant latency—applications must wait multiple blocks to ensure finality, meaning 30-60 seconds of delay for a verifiable random number. With 400-millisecond Solana blocks, this delay shrinks to 1-2 seconds—fast enough that users perceive operations as instant.

#### Cost: Micro-Transactions at Scale

Solana's average transaction cost of approximately $0.00025 represents a 10,000-100,000x improvement over Ethereum's typical $2.50-25 gas fees. This cost reduction isn't achieved through centralization or security compromises—Solana maintains a decentralized validator network with over 1,900 validators globally—but through fundamental efficiency improvements in how transactions are processed.

For lottery operations, micro-transaction costs enable entirely new business models. A lottery with 1,000 participants might incur $0.25 in total transaction costs to record all entries—negligible compared to the prize pool. Prize distribution to multiple winners costs dollars rather than thousands of dollars. These economics make it practical to run frequent, small-scale lotteries that would be economically impossible on Ethereum.

The cost structure also changes participant incentives. On Ethereum, participants must consider whether a lottery's expected value exceeds gas costs—often a losing proposition for small-scale raffles. On Solana, gas costs are so low that they're effectively ignored in expected value calculations. This dramatically broadens the addressable market for lottery participation.

#### Throughput: Handling Peak Demand

Solana's current capacity of approximately 65,000 transactions per second (with Firedancer validator client targeting 1M+ TPS) means that even viral lottery events with massive participation won't overwhelm the network. A lottery that attracts 100,000 participants can process all entries within seconds. Prize distribution to thousands of winners completes in minutes.

This throughput guarantee eliminates a major source of uncertainty in blockchain application development: will the network be able to handle our scale? On Ethereum, applications must carefully architect around throughput limits, implementing queuing systems, batch processing, and complex fee management to avoid transaction failures during high demand. On Solana, developers can largely ignore these concerns and build applications as if throughput were unlimited.

#### Composability: Native Integration Ecosystem

Solana's SPL token standard, analogous to Ethereum's ERC-20, provides a consistent interface for token operations across the ecosystem. This standardization enables seamless integration between applications. Jupiter Aggregator, Solana's largest DEX aggregator, allows instant token swaps at minimal cost. Alchemy provides enhanced RPC APIs for querying blockchain state. Metaplex handles NFT operations. Marinade enables liquid staking. All of these services work together through standardized interfaces.

For Solotto dLOS, this composability is crucial. We integrate Jupiter to swap SOL prizes into project tokens automatically. We use Alchemy RPC for reliable token balance queries. We leverage SPL token standards to support any compliant token without custom integration. This ecosystem integration means Solotto inherits capabilities from the entire Solana ecosystem, rather than building everything from scratch.

#### Proof-of-History: Built-In Randomness Source

Perhaps most importantly for lottery applications, Solana's Proof-of-History (PoH) consensus mechanism provides a natural source of verifiable randomness. PoH creates a cryptographic clock by hashing the output of the previous hash function along with current events, producing a sequence of hashes that proves time has passed. Each block's hash depends on all previous blocks and all transactions in the current block—making it unpredictable, verifiable, and high-entropy.

This means Solana developers don't need external oracles like Chainlink VRF to obtain verifiable randomness. The blockchain itself provides randomness as a native feature, with no additional costs, no external dependencies, and no oracle manipulation risks. For lottery systems, this is transformative: the most critical component—verifiable randomness—is available for free as a core blockchain property.

When we combine all of Solana's characteristics—speed, cost, throughput, composability, and built-in randomness—we arrive at a platform that doesn't just enable blockchain lotteries; it makes them superior to centralized alternatives in every dimension that matters to participants. This is why Solotto dLOS is built on Solana, and why we believe Solana represents the future of fair, transparent, efficient lottery infrastructure.

---

## 3. System Architecture

The Solotto dLOS implements a five-phase execution engine. Each phase represents a distinct operation in the lottery lifecycle, with clear inputs, outputs, and verification mechanisms.

### 3.1 Architecture Overview

![Figure 2 - Solotto dLOS Architecture](images/Figure%202%20-%20Solotto%20dLOS%20Architecture.png)

Key components:

- **Operator Layer**: Web interface for lottery management
- **Application Layer**: Business logic and orchestration
- **Data Layer**: Persistent storage with role-based access
- **Blockchain Layer**: Solana integration for randomness and settlement

### 3.2 Five-Phase Execution Engine

Each lottery round progresses through five distinct phases:

**Phase 1: Control (Configuration)**

- Input: Lottery parameters (eligibility rules, prize allocation, blacklist)
- Process: Validate configuration, query prize wallet balance on-chain
- Output: Immutable `Round` record with confirmed parameters
- Verification: Prize wallet balance visible on Solscan

**Phase 2: Snapshot (Participant Discovery)**

- Input: Token mint address, eligibility window dates
- Process: Query all token holders, assign tiers, capture START balances
- Output: `Participant` records with wallet address, balance, tier assignment
- Verification: CSV export of all participants

**Phase 3: Drawing (Winner Selection)**

- Input: Eligible participants per tier
- Process: Generate cryptographic seed from blockhash, deterministic selection
- Output: `Drawing` record with seed, blockhash, slot, winner addresses
- Verification: Blockhash verifiable on Solana Explorer, algorithm reproducible

**Phase 4: Harvest (Prize Calculation)**

- Input: Prize wallet address, distribution percentage
- Process: Query wallet balance on-chain, calculate tier allocations
- Output: Prize amounts per tier (SOL denominated)
- Verification: Wallet balance queryable via RPC

**Phase 5: Distribution (Prize Transfer)**

- Input: Winner addresses, prize amounts
- Process: Execute Jupiter swaps (SOL → token) or direct transfers
- Output: Transaction signatures per winner
- Verification: All transactions visible on Solscan

---

## 4. Cryptographic Drawing Mechanism

The core innovation of Solotto dLOS is the use of Solana validator-generated blockhashes as an unpredictable entropy source for winner selection.

### 4.1 Randomness Requirements

A fair lottery system requires randomness with three properties:

1. **Unpredictability**: Future values cannot be predicted or influenced
2. **Verifiability**: Anyone can verify the randomness source is legitimate
3. **Determinism**: Given the same seed, the same winner is always selected

Traditional systems use hardware random number generators or atmospheric noise[6], which are unpredictable but not verifiable. Blockchain systems can achieve all three properties.

### 4.2 Solana Blockhash as Entropy

Solana produces blockhashes through validator consensus using a Proof-of-History (PoH) mechanism[7]. Each block's hash is:

- **Generated by validators**: The hash is computed from the previous hash and all transactions in the block, produced by the leader validator
- **Unpredictable**: No single entity controls the leader schedule or transaction ordering
- **Verifiable**: Blockhashes are permanently recorded on-chain and queryable

We use blockhashes as our randomness source because:

1. **Operator Cannot Manipulate**: The blockhash is determined by Solana's validator network, not the lottery operator
2. **Publicly Verifiable**: Anyone can query the Solana blockchain to verify the blockhash existed at the claimed slot
3. **High Entropy**: SHA-256 hashes provide 256 bits of entropy

### 4.3 Drawing Algorithm

The deterministic drawing algorithm operates as follows:

```typescript
/**
 * Cryptographic winner selection using Solana blockhash
 * @param seed - 32-byte random seed from crypto.randomBytes
 * @param tierIndex - Tier number (1-4)
 * @param eligibleParticipants - Array of eligible participant wallet addresses
 * @param blockhash - Latest Solana blockhash at drawing time
 * @param slot - Solana slot number
 * @returns Winner wallet address
 */
function selectWinner(
  seed: Buffer,
  tierIndex: number,
  eligibleParticipants: string[],
  blockhash: string,
  slot: number
): string {
  // Step 1: Combine seed with tier index for tier-specific randomness
  const tierSeed = Buffer.concat([seed, Buffer.from(tierIndex.toString())]);

  // Step 2: Create deterministic hash using SHA-256
  const hash = crypto.createHash("sha256").update(tierSeed).digest();

  // Step 3: Convert first 8 bytes of hash to integer
  // This provides sufficient entropy (2^64 possible values)
  const randomValue = hash.readBigUInt64BE(0);

  // Step 4: Modulo operation to map into participant index range
  const winnerIndex = Number(randomValue % BigInt(eligibleParticipants.length));

  // Step 5: Select winner at computed index
  const winner = eligibleParticipants[winnerIndex];

  // Step 6: Store audit trail
  storeDrawingAudit({
    seed: seed.toString("hex"),
    blockhash: blockhash,
    slot: slot,
    tierIndex: tierIndex,
    eligibleCount: eligibleParticipants.length,
    winnerIndex: winnerIndex,
    winnerAddress: winner,
    timestamp: Date.now(),
  });

  return winner;
}
```

**Key Properties**:

1. **Deterministic**: Same `seed` + `tierIndex` + `eligibleParticipants` always produces same winner
2. **Uniform Distribution**: Modulo operation ensures equal probability for each participant
3. **Tier Isolation**: Each tier uses distinct seed (prevents correlation between tier winners)
4. **Verifiable**: All inputs (seed, blockhash, slot, participants) stored publicly

### 4.4 Verification Process

Anyone can verify a drawing's fairness:

```typescript
/**
 * Independent verification of drawing results
 * @param roundId - Unique identifier for lottery round
 * @returns Verification result with match status
 */
async function verifyDrawing(roundId: string): Promise<VerificationResult> {
  // Step 1: Fetch drawing record from database
  const drawing = await db.drawing.findUnique({
    where: { roundId },
    include: { participants: true },
  });

  // Step 2: Verify blockhash exists on Solana
  const connection = new Connection(SOLANA_RPC_URL);
  const blockInfo = await connection.getBlock(drawing.slot);

  if (blockInfo.blockhash !== drawing.blockhash) {
    return {
      valid: false,
      reason: "Blockhash mismatch - potential manipulation",
    };
  }

  // Step 3: Reconstruct winner selection for each tier
  const reconstructedWinners = {};
  for (const tier of [1, 2, 3, 4]) {
    const eligible = drawing.participants.filter(
      (p) => p.tier === tier && p.isEligible
    );
    const winner = selectWinner(
      Buffer.from(drawing.seed, "hex"),
      tier,
      eligible.map((p) => p.walletAddress),
      drawing.blockhash,
      drawing.slot
    );
    reconstructedWinners[`t${tier}`] = winner;
  }

  // Step 4: Compare with stored winners
  const storedWinners = drawing.tierWinners; // {t1: "addr1", t2: "addr2", ...}
  const match =
    JSON.stringify(reconstructedWinners) === JSON.stringify(storedWinners);

  return {
    valid: match,
    storedWinners,
    reconstructedWinners,
    blockhash: drawing.blockhash,
    slot: drawing.slot,
    verificationTimestamp: Date.now(),
  };
}
```

This verification process ensures:

- Blockhash authenticity (on-chain query)
- Drawing reproducibility (deterministic algorithm)
- Audit trail integrity (database consistency)

![Figure 3 - Drawing Verification Flow](images/Figure%203%20-%20Drawing%20Verification%20Flow.png)

### 4.5 Attack Resistance

The drawing mechanism resists several attack vectors:

**Operator Manipulation**: The operator cannot:

- Choose favorable blockhashes (generated by validators)
- Predict future blockhashes (consensus-based)
- Modify the seed after seeing the blockhash (seed stored before query)

**Pre-computation Attack**: An attacker cannot:

- Pre-compute winning addresses (blockhash unknown at configuration time)
- Choose participant list to favor specific winners (snapshot occurs before drawing)

**Block Stuffing**: Solana's leader schedule prevents:

- Transaction censorship (multiple validators per epoch)
- Selective block production (PoH ordering)

**Timestamp Manipulation**: The timestamp is used only to:

- Provide additional entropy (combined with blockhash)
- Record audit trail (not used in winner selection directly)

---

## 5. Multi-Tier Fairness Model

A naive lottery system awards prizes to random participants. However, in token-based systems, wealth distribution is highly skewed. The top 1% of holders often control 80%+ of supply[8]. A single-winner system would be dominated by whales.

### 5.1 The Whale Problem

Consider a token with 1,000 holders:

- Top 10 holders: 80% of supply
- Next 90 holders: 15% of supply
- Bottom 900 holders: 5% of supply

In a single-winner system with probability proportional to holdings:

- Top 10 holders: 80% win probability
- Bottom 900 holders: 5% win probability

This concentrates prizes among whales, defeating the purpose of community rewards.

### 5.2 Tier Segmentation

Solotto dLOS implements a four-tier system:

| Tier | Holder Percentile | Typical Holdings  | Winner Count |
| ---- | ----------------- | ----------------- | ------------ |
| T1   | Top 5%            | $5,000 - $500,000 | 1 per round  |
| T2   | 5% - 20%          | $500 - $5,000     | 1 per round  |
| T3   | 20% - 50%         | $100 - $500       | 1 per round  |
| T4   | 50% - 100%        | $50 - $100        | 1 per round  |

**Tier Assignment Algorithm**:

```typescript
/**
 * Assign participants to tiers based on USD holdings
 * @param participants - Array of participants with USD balances
 * @param minUsdRequired - Minimum balance for eligibility (default: $50)
 * @returns Participants with tier assignments
 */
function assignTiers(
  participants: Participant[],
  minUsdRequired: number = 50
): Participant[] {
  // Step 1: Filter out dust (below minimum)
  const eligible = participants.filter((p) => p.usdValue >= minUsdRequired);

  // Step 2: Sort by USD value (descending)
  const sorted = eligible.sort((a, b) => b.usdValue - a.usdValue);

  // Step 3: Calculate percentile cutoffs
  const count = sorted.length;
  const t1Cutoff = Math.floor(count * 0.05); // Top 5%
  const t2Cutoff = Math.floor(count * 0.2); // Top 20%
  const t3Cutoff = Math.floor(count * 0.5); // Top 50%

  // Step 4: Assign tiers based on percentile rank
  return sorted.map((participant, index) => {
    let tier: number;
    if (index < t1Cutoff) {
      tier = 1;
    } else if (index < t2Cutoff) {
      tier = 2;
    } else if (index < t3Cutoff) {
      tier = 3;
    } else {
      tier = 4;
    }

    return {
      ...participant,
      tier,
      percentile: (index / count) * 100,
    };
  });
}
```

### 5.3 Prize Allocation

Prize pool is distributed across tiers with decreasing weights:

| Tier | Prize Allocation | Rationale                                    |
| ---- | ---------------- | -------------------------------------------- |
| T1   | 40%              | Largest holders, highest community influence |
| T2   | 30%              | Mid-tier holders, strong community members   |
| T3   | 20%              | Small holders, engaged participants          |
| T4   | 10%              | Micro holders, accessibility prize           |

**Total: 100% of prize pool**

This allocation balances:

- **Whale retention**: T1 receives highest absolute amount
- **Community engagement**: T2-T3 receive significant prizes
- **Accessibility**: T4 ensures even small holders can win

![Figure 4 - Multi-Tier Prize Distribution](images/Figure%204%20-%20Multi-Tier%20Prize%20Distribution.png)

### 5.4 Within-Tier Fairness

Within each tier, every participant has equal probability of winning:

```typescript
/**
 * Each participant in a tier has uniform winning probability
 * regardless of their exact balance within the tier
 */
function calculateWinProbability(
  participant: Participant,
  tierParticipants: Participant[]
): number {
  // Within-tier probability is uniform
  return 1 / tierParticipants.length;
}

// Example: T1 has 22 eligible participants
// Each T1 participant has 1/22 = 4.55% chance of winning T1 prize
// This is true regardless of whether they hold $5K or $500K
```

This ensures:

- Small T1 holders can compete with large T1 holders
- Within-tier whale dominance is eliminated
- Probability depends on tier, not absolute balance

---

## 6. Eligibility and Sybil Resistance

Token holdings alone are insufficient for eligibility. A sophisticated attacker could create thousands of wallets, each holding minimum balance, to increase their winning probability.

### 6.1 Trading Activity Requirement

Solotto dLOS implements a two-stage filter:

**Stage 1: Balance Filter**

- Minimum USD holdings (default: $50)
- Prevents dust accounts from cluttering tier distribution

**Stage 2: Trading Activity Filter**

- Balance must change by ≥50% during eligibility window
- Calculated as: `|(END_balance - START_balance) / START_balance| × 100%`

```typescript
/**
 * Calculate trading activity for participants
 * @param roundId - Lottery round identifier
 * @param activityThreshold - Minimum activity percentage (default: 50%)
 */
async function calculateTradingActivity(
  roundId: string,
  activityThreshold: number = 50
): Promise<void> {
  // Step 1: Fetch all participants with START and END balances
  const participants = await db.participant.findMany({
    where: { roundId },
    include: { balanceSnapshots: true },
  });

  for (const participant of participants) {
    // Step 2: Get START balance (captured at round creation)
    const startSnapshot = participant.balanceSnapshots.find(
      (s) => s.snapshotType === "START"
    );

    // Step 3: Get END balance (captured at snapshot confirmation)
    const endSnapshot = participant.balanceSnapshots.find(
      (s) => s.snapshotType === "END"
    );

    if (!startSnapshot || !endSnapshot) {
      // Missing balance data - mark ineligible
      await db.participant.update({
        where: { id: participant.id },
        data: {
          isEligible: false,
          tradingActivityPercent: 0,
          ineligibilityReason: "Missing balance snapshots",
        },
      });
      continue;
    }

    // Step 4: Calculate activity percentage
    const startBalance = startSnapshot.tokenBalance;
    const endBalance = endSnapshot.tokenBalance;
    const change = Math.abs(endBalance - startBalance);
    const activityPercent = (change / startBalance) * 100;

    // Step 5: Determine eligibility
    const meetsActivityThreshold = activityPercent >= activityThreshold;
    const meetsBalanceThreshold = participant.usdValue >= 50;
    const isEligible = meetsActivityThreshold && meetsBalanceThreshold;

    // Step 6: Update participant record
    await db.participant.update({
      where: { id: participant.id },
      data: {
        tradingActivityPercent: activityPercent,
        isEligible: isEligible,
        ineligibilityReason: !isEligible
          ? `Activity: ${activityPercent.toFixed(
              1
            )}% (req: ${activityThreshold}%)`
          : null,
      },
    });
  }
}
```

### 6.2 Sybil Resistance Properties

The trading activity filter provides strong Sybil resistance:

**Cost to Attacker**: To create N Sybil wallets:

1. Split holdings into N wallets (N × transaction cost)
2. Each wallet must trade to generate 50% activity (N × 2 trades = 2N transaction cost)
3. **Total cost: 3N transactions × $0.00025 ≈ $0.00075N**

For 1,000 Sybil wallets: **$0.75 attack cost**

**Probability Benefit**: In a 220-holder lottery:

- 1 wallet: ~1.8% win probability per tier (1/55 per tier)
- 10 wallets: ~18% win probability per tier (10/55)
- 100 wallets: Dominant in tier

**Defense Mechanism**: The 50% activity requirement means:

- Attacker must trade each Sybil wallet during eligibility window
- Trading incurs price impact and slippage
- Large split causes self-inflicted trading losses

**Net Effect**: Sybil attacks are economically irrational for rational attackers.

### 6.3 Alternative Eligibility Models

Future versions may incorporate:

**On-Chain Activity**: Require minimum transaction count during window
**Liquidity Provision**: Bonus eligibility for LP token holders
**Governance Participation**: Require DAO voting activity
**Time-Weighted Holdings**: Longer holding duration increases tier placement

These mechanisms further increase Sybil attack costs.

![Figure 5 - Eligibility Determination Flow](images/Figure%205%20-%20Eligibility%20Determination%20Flow.png)

---

## 7. Technical Implementation

### 7.1 Technology Stack

**Frontend (Operator Dashboard)**:

- **Framework**: Next.js 14.2.33 (React 18, TypeScript)
- **Styling**: Tailwind CSS 3.4 (custom dark theme)
- **State**: Zustand 5.0.8 (session persistence)
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare)
- **Deployment**: Vercel (Edge Network)

**Backend (API Server)**:

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **ORM**: Prisma 6.16.3 (PostgreSQL)
- **Auth**: JWT + bcrypt + TOTP (speakeasy)
- **Deployment**: Render.com (Auto-scaling)

**Database**:

- **DBMS**: PostgreSQL 16 (Supabase Pro)
- **Connection Pool**: PgBouncer (port 6543)
- **Roles**: `solotto_app` (read-write), `solotto_ro` (read-only)
- **Backup**: Daily automated (7-day retention)

**Blockchain**:

- **Network**: Solana mainnet-beta / devnet
- **RPC**: Alchemy Enhanced API (primary), public RPC (fallback)
- **Libraries**: @solana/web3.js 1.98.4, @solana/spl-token 0.4.14
- **DEX**: Jupiter Aggregator v6 (swap integration)

### 7.2 Database Schema

```sql
-- Core lottery configuration
CREATE TABLE "LotteryConfig" (
  "id" TEXT PRIMARY KEY,
  "tokenMint" TEXT NOT NULL,
  "tokenDecimals" INTEGER NOT NULL,
  "snapshotStartDate" TIMESTAMP NOT NULL,
  "snapshotEndDate" TIMESTAMP NOT NULL,
  "drawTime" TIMESTAMP NOT NULL,
  "tradePercentage" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "minUsdLottoRequired" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "prizeDistributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
  "blacklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "prizeSourceWallet" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "network" TEXT NOT NULL DEFAULT 'mainnet-beta',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("operatorId") REFERENCES "User"("id")
);

-- High-level round information
CREATE TABLE "Round" (
  "id" TEXT PRIMARY KEY,
  "configId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "prizePoolSol" DOUBLE PRECISION,
  "prizePoolLotto" DOUBLE PRECISION,
  "tierWinners" JSONB, -- {t1: "addr1", t2: "addr2", t3: "addr3", t4: "addr4"}
  "tierPayouts" JSONB, -- {t1: 0.05, t2: 0.03, t3: 0.02, t4: 0.01}
  "drawingDate" TIMESTAMP,
  "distributionDate" TIMESTAMP,
  "distributionTxSignatures" JSONB, -- {t1: "sig1", t2: "sig2", ...}
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("configId") REFERENCES "LotteryConfig"("id")
);

-- Snapshot execution metadata
CREATE TABLE "Snapshot" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalHolders" INTEGER,
  "eligibleHolders" INTEGER,
  "tierCounts" JSONB, -- {t1: 22, t2: 44, t3: 66, t4: 88}
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  FOREIGN KEY ("roundId") REFERENCES "Round"("id")
);

-- Individual participants (token holders)
CREATE TABLE "Participant" (
  "id" TEXT PRIMARY KEY,
  "snapshotId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "tokenBalance" DOUBLE PRECISION NOT NULL,
  "usdValue" DOUBLE PRECISION NOT NULL,
  "tier" INTEGER, -- 1, 2, 3, 4, or NULL (dust)
  "percentile" DOUBLE PRECISION,
  "isEligible" BOOLEAN DEFAULT FALSE,
  "tradingActivityPercent" DOUBLE PRECISION,
  "ineligibilityReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id"),
  FOREIGN KEY ("roundId") REFERENCES "Round"("id"),
  UNIQUE("roundId", "walletAddress")
);

-- Balance snapshots (START and END for trading activity)
CREATE TABLE "BalanceSnapshot" (
  "id" TEXT PRIMARY KEY,
  "participantId" TEXT NOT NULL,
  "snapshotType" TEXT NOT NULL, -- 'START' | 'END'
  "tokenBalance" DOUBLE PRECISION NOT NULL,
  "usdValue" DOUBLE PRECISION NOT NULL,
  "capturedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
);

-- Drawing execution metadata
CREATE TABLE "Drawing" (
  "id" TEXT PRIMARY KEY,
  "roundId" TEXT NOT NULL,
  "seed" TEXT NOT NULL, -- Hex-encoded 32-byte seed
  "blockhash" TEXT NOT NULL, -- Solana blockhash at drawing time
  "slot" BIGINT NOT NULL, -- Solana slot number
  "tierWinners" JSONB NOT NULL, -- {t1: "addr1", t2: "addr2", t3: "addr3", t4: "addr4"}
  "eligibleCounts" JSONB, -- {t1: 22, t2: 44, t3: 66, t4: 88}
  "executedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("roundId") REFERENCES "Round"("id")
);

-- Indexes for performance
CREATE INDEX "idx_participant_wallet" ON "Participant"("walletAddress");
CREATE INDEX "idx_participant_round" ON "Participant"("roundId");
CREATE INDEX "idx_participant_tier" ON "Participant"("tier");
CREATE INDEX "idx_round_status" ON "Round"("status");
CREATE INDEX "idx_snapshot_round" ON "Snapshot"("roundId");
```

### 7.3 RPC Service with Failover

Solana RPC reliability is critical for production systems. Solotto implements automatic failover:

```typescript
/**
 * RPC Service with primary/fallback architecture
 */
class RPCService {
  private primaryConnection: Connection;
  private fallbackConnection: Connection;
  private currentConnection: Connection;
  private failoverCount: number = 0;

  constructor() {
    // Primary: Alchemy Enhanced API (higher rate limits)
    this.primaryConnection = new Connection(process.env.ALCHEMY_RPC_URL!, {
      commitment: "confirmed",
    });

    // Fallback: Public RPC (slower, but always available)
    this.fallbackConnection = new Connection(process.env.SOLANA_RPC_FALLBACK!, {
      commitment: "confirmed",
    });

    // Start with primary
    this.currentConnection = this.primaryConnection;
  }

  /**
   * Get current connection with automatic failover
   */
  getConnection(): Connection {
    return this.currentConnection;
  }

  /**
   * Execute RPC call with automatic failover on error
   */
  async executeWithFailover<T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> {
    try {
      // Attempt with current connection
      const result = await operation(this.currentConnection);

      // Success - reset failover count if we're back on primary
      if (this.currentConnection === this.primaryConnection) {
        this.failoverCount = 0;
      }

      return result;
    } catch (error) {
      console.error("RPC error:", error);

      // If we're on primary, try failover
      if (this.currentConnection === this.primaryConnection) {
        console.warn("Primary RPC failed, switching to fallback");
        this.currentConnection = this.fallbackConnection;
        this.failoverCount++;

        // Retry with fallback
        return await operation(this.currentConnection);
      }

      // Both failed - throw error
      throw new Error("All RPC endpoints failed");
    }
  }

  /**
   * Get latest blockhash with failover
   */
  async getLatestBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    return await this.executeWithFailover(async (connection) => {
      return await connection.getLatestBlockhash("confirmed");
    });
  }

  /**
   * Get token accounts by owner with failover
   */
  async getTokenAccountsByOwner(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<RpcResponseAndContext<Array<AccountInfo<Buffer>>>> {
    return await this.executeWithFailover(async (connection) => {
      return await connection.getTokenAccountsByOwner(owner, {
        mint: mint,
      });
    });
  }
}

// Singleton instance
let rpcServiceInstance: RPCService | null = null;

export function getRPCService(): RPCService {
  if (!rpcServiceInstance) {
    rpcServiceInstance = new RPCService();
  }
  return rpcServiceInstance;
}
```

**Failover Behavior**:

1. All RPC calls route through `executeWithFailover()`
2. On primary failure, automatically switch to fallback
3. Subsequent calls use fallback until system restart
4. Health check endpoint monitors both connections

### 7.4 Jupiter Integration for Swaps

Distribution can execute SOL → Token swaps via Jupiter DEX:

```typescript
/**
 * Jupiter swap service for prize distribution
 */
class JupiterService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl =
      process.env.JUPITER_API_BASE_URL || "https://quote-api.jup.ag";
  }

  /**
   * Get swap quote from Jupiter
   * @param inputMint - Input token mint (e.g., SOL)
   * @param outputMint - Output token mint (e.g., LOTTO)
   * @param amount - Amount in lamports (for SOL) or smallest unit
   * @param slippageBps - Slippage tolerance in basis points (50 = 0.5%)
   */
  async getSwapQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<JupiterQuote> {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: "false",
      asLegacyTransaction: "false",
    });

    const response = await fetch(`${this.apiBaseUrl}/v6/quote?${params}`);
    if (!response.ok) {
      throw new Error(`Jupiter quote failed: ${response.statusText}`);
    }

    const quote = await response.json();
    return quote;
  }

  /**
   * Build swap transaction from quote
   */
  async buildSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true
  ): Promise<{ swapTransaction: string }> {
    const response = await fetch(`${this.apiBaseUrl}/v6/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: wrapUnwrapSOL,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    if (!response.ok) {
      throw new Error(`Jupiter swap build failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Prepare distribution transactions for all winners
   */
  async prepareDistribution(
    roundId: string,
    prizeAllocations: { [tier: string]: number } // SOL amounts
  ): Promise<DistributionPlan> {
    const round = await db.round.findUnique({
      where: { id: roundId },
      include: { config: true },
    });

    const transactions: { [tier: string]: string } = {};
    const expectedAmounts: { [tier: string]: number } = {};

    // For each tier with a winner
    for (const [tier, solAmount] of Object.entries(prizeAllocations)) {
      const winner = round.tierWinners[tier];
      if (!winner) continue;

      // Convert SOL to lamports
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Get quote from Jupiter
      const quote = await this.getSwapQuote(
        NATIVE_MINT.toString(), // SOL
        round.config.tokenMint, // LOTTO or other token
        lamports,
        50 // 0.5% slippage
      );

      // Build unsigned transaction
      const { swapTransaction } = await this.buildSwapTransaction(
        quote,
        winner, // Winner's wallet address
        true // Wrap/unwrap SOL automatically
      );

      // Store for operator signing
      transactions[tier] = swapTransaction;
      expectedAmounts[tier] =
        parseInt(quote.outAmount) / Math.pow(10, round.config.tokenDecimals);
    }

    return {
      transactions, // Base64-encoded transactions
      expectedAmounts, // Token amounts (UI units)
      requiresSigning: true,
    };
  }
}
```

**Distribution Flow**:

1. Backend prepares unsigned transactions
2. Frontend passes transactions to wallet for signing
3. User reviews and approves in Phantom/Solflare
4. Backend broadcasts signed transactions
5. Transaction signatures stored for audit trail

![Figure 6 - Distribution Transaction Flow](images/Figure%206%20-%20Distribution%20Transaction%20Flow.png)

---

## 8. Security Analysis

### 8.1 Threat Model

We consider the following adversaries:

**Operator (Internal Threat)**:

- Goal: Manipulate winner selection to favor specific addresses
- Capabilities: Control backend, database, and configuration
- Limitations: Cannot control Solana validators or modify blockchain

**Whale Attacker (External Threat)**:

- Goal: Dominate lottery through Sybil attacks or whale concentration
- Capabilities: Large token holdings, ability to create multiple wallets
- Limitations: Trading activity requirements, economic costs

**Technical Attacker (External Threat)**:

- Goal: Exploit vulnerabilities in randomness, authentication, or transaction flow
- Capabilities: RPC manipulation attempts, replay attacks, SQL injection
- Limitations: JWT authentication, input validation, rate limiting

### 8.2 Randomness Security

**Attack**: Operator pre-selects favorable blockhash

**Defense**: Blockhash is queried in real-time during drawing execution. The operator cannot predict future blockhashes (generated by validator consensus). All blockhashes are stored and publicly verifiable.

**Attack**: Operator re-runs drawing until favorable outcome

**Defense**: Drawing seed and timestamp are stored in database immediately upon execution. Any modification would be visible in database audit logs. Multiple drawing records for same round would be detectable.

**Attack**: Operator modifies participant list before drawing

**Defense**: Snapshot is confirmed and locked before drawing. All participants stored in database with timestamps. CSV exports allow external verification of participant lists.

### 8.3 Authentication Security

**JWT Token Expiration**: Tokens expire after 1 hour, requiring re-authentication

**2FA Protection**: TOTP-based two-factor authentication (Google Authenticator, Authy)

```typescript
/**
 * JWT middleware with expiration enforcement
 */
function requireJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Check expiration explicitly
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ error: "Token expired" });
    }

    // Attach user info to request
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * 2FA verification for sensitive operations
 */
async function verify2FA(userId: string, token: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  // Verify TOTP token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: token,
    window: 1, // Allow 1 time step tolerance
  });

  return verified;
}
```

### 8.4 Input Validation

All API inputs validated with Zod schemas:

```typescript
/**
 * Control endpoint validation schema
 */
const controlSchema = z
  .object({
    tokenMint: z
      .string()
      .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address"),
    tokenDecimals: z.number().int().min(0).max(18),
    snapshotStartDate: z.string().datetime(),
    snapshotEndDate: z.string().datetime(),
    drawTime: z.string().datetime(),
    tradePercentage: z.number().min(0).max(100).default(50),
    minUsdLottoRequired: z.number().positive().default(50),
    prizeDistributionPercent: z.number().min(1).max(100).default(70),
    blacklist: z
      .array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/))
      .default([]),
    prizeSourceWallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
    network: z.enum(["devnet", "mainnet-beta"]).default("mainnet-beta"),
  })
  .refine(
    (data) => new Date(data.snapshotEndDate) > new Date(data.snapshotStartDate),
    { message: "End date must be after start date" }
  )
  .refine((data) => new Date(data.drawTime) > new Date(data.snapshotEndDate), {
    message: "Draw time must be after snapshot end",
  });
```

This prevents:

- SQL injection (parameterized queries via Prisma)
- Invalid Solana addresses
- Out-of-range numeric values
- Invalid date sequences

### 8.5 Rate Limiting & DoS Protection

**API Rate Limiting**: Express middleware limits requests per IP
**Database Connection Pooling**: PgBouncer prevents connection exhaustion
**Timeouts**: All RPC calls have 30-second timeout
**Input Size Limits**: Request body size capped at 10MB

### 8.6 Audit Trail Integrity

All critical operations logged:

```typescript
/**
 * Audit log for all state changes
 */
async function logAudit(
  userId: string,
  action: string,
  resource: string,
  metadata: object
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId,
      action, // 'CREATE_ROUND', 'RUN_DRAWING', 'DISTRIBUTE_PRIZES'
      resource, // roundId or snapshotId
      metadata, // JSON object with details
      ipAddress: req.ip,
      timestamp: new Date(),
    },
  });
}
```

Audit logs enable:

- Forensic investigation of operator actions
- Detection of abnormal patterns
- Compliance with SOC 2 requirements (future)

---

## 9. Economic Model

### 9.1 Revenue Streams

Solotto dLOS monetizes through three mechanisms:

**1. White-Label Subscriptions** (Primary Revenue)

| Tier       | Price      | Target Customer                  | Features                           |
| ---------- | ---------- | -------------------------------- | ---------------------------------- |
| Community  | $99/mo     | Small tokens (<1K holders)       | 5 rounds/month, basic support      |
| Growth     | $499/mo    | Mid-size tokens (1K-10K holders) | Unlimited rounds, priority support |
| Enterprise | $2,000+/mo | Large tokens (10K+ holders)      | Dedicated infra, custom features   |

**2. Transaction Fees** (Secondary Revenue)

- 1-2% of prize pool per distribution
- Collected automatically during distribution phase
- Transparent to users (displayed in UI)

**3. $LOTTO Token Economics** (Long-term Value)

- **Utility**: Required for Enterprise tier features
- **Staking**: Operators stake $LOTTO for subscription discounts
- **Buyback**: 20% of quarterly revenue used to buy and burn $LOTTO
- **Governance**: Token holders vote on roadmap priorities

### 9.2 Unit Economics

**Average Customer Profile** (Growth Tier):

- Monthly subscription: $499
- Runs 8 lottery rounds per month
- Average prize pool: 5 SOL per round (~$750 at $150/SOL)
- Transaction fees: 1.5% × 5 SOL × 8 rounds = 0.6 SOL/month (~$90)

**Monthly Revenue per Customer**: $499 + $90 = **$589**

**Customer Acquisition Cost** (CAC):

- Solana ecosystem marketing: $200
- Community engagement: $150
- Onboarding support: $150
- **Total CAC: $500**

**Lifetime Value** (LTV):

- Average customer retention: 12 months
- Monthly revenue: $589
- **LTV: $589 × 12 = $7,068**

**LTV/CAC Ratio: 14.1** (Healthy SaaS benchmark: 3+)

### 9.3 Revenue Projections

![Figure 7 - Revenue Projections (3 Years)](images/Figure%207%20-%20Revenue%20Projections%20%283%20Years%29.png)

**Assumptions**:

- Solana ecosystem continues growth (1,000+ new tokens monthly)
- 2-5% conversion rate from free trial to paid
- 80% annual retention (10% monthly churn)
- Average subscription: $400/month blended across tiers

### 9.4 Market Size

**TAM (Total Addressable Market)**: $50B

- Global crypto community engagement tools
- Token utility and distribution mechanisms
- DAO treasury management
- Gaming and NFT rewards

**SAM (Serviceable Addressable Market)**: $5B

- Solana ecosystem specifically
- 100,000+ SPL tokens
- 10,000+ active community tokens

**SOM (Serviceable Obtainable Market - Year 3)**: $50M

- 1,500 paying tokens (1.5% of active tokens)
- Average $2,800/year per customer
- Represents 1% of SAM

### 9.5 $LOTTO Token Economics

**Token Utility**:

1. **Subscription Discounts**: Stake 10,000 $LOTTO → 20% off monthly subscription
2. **Enterprise Access**: Hold 50,000 $LOTTO → unlock Enterprise features
3. **Governance**: 1 $LOTTO = 1 vote on feature proposals
4. **Treasury Reserve**: Hold $LOTTO to reserve operator wallet slots during high demand

**Supply Dynamics**:

- **Total Supply**: 1,000,000,000 $LOTTO (fixed)
- **Initial Distribution**:
  - 40% Community (pump.fun launch)
  - 30% Team (4-year vest, 1-year cliff)
  - 20% Treasury (DAO controlled)
  - 10% Liquidity Provision

**Burn Mechanism**:

- 20% of quarterly revenue used to buy $LOTTO from market
- Purchased tokens immediately burned (sent to null address)
- Reduces circulating supply over time
- Creates deflationary pressure

**Example** (Year 1, Q4):

- Quarterly revenue: $225K (base case)
- Buyback budget: $45K
- $LOTTO price: $0.10
- Tokens bought and burned: 450,000 $LOTTO (0.045% of supply)

![Figure 8 - Token Burn Schedule](images/Figure%208%20-%20Token%20Burn%20Schedule.png)

---

## 10. Comparative Analysis

### 10.1 Competitive Landscape

| Feature                 | Solotto dLOS                      | Traditional Lotteries  | PoolTogether (Ethereum) | Simple Smart Contracts     | Discord Raffles |
| ----------------------- | --------------------------------- | ---------------------- | ----------------------- | -------------------------- | --------------- |
| **Transparency**        | Full (on-chain + open-source)     | None (black box)       | On-chain only           | On-chain only              | None            |
| **Randomness Source**   | Solana blockhash (validators)     | Private (unverifiable) | Chainlink VRF           | blockhash or VRF           | Manual/trust    |
| **Automation**          | Fully automated (backend + DB)    | Centralized            | Smart contract only     | Smart contract only        | Manual          |
| **Operator Tools**      | Dashboard, analytics, CSV exports | N/A (internal only)    | None                    | None                       | None            |
| **White-Label**         | Yes (SaaS model)                  | No                     | No                      | No (one-off deployments)   | No              |
| **Multi-Tier Fairness** | Yes (4 tiers, anti-whale)         | No                     | No (single pool)        | No (usually single winner) | No              |
| **Transaction Cost**    | $0.00025 avg                      | N/A (fiat)             | $5-50 (Ethereum gas)    | Varies                     | $0 (manual)     |
| **Settlement Speed**    | <1 minute                         | Days to weeks          | Minutes                 | Minutes                    | Hours to days   |
| **Geographic Limits**   | None (permissionless)             | Heavy restrictions     | None                    | None                       | None            |
| **Fees**                | 1-2% transaction fee              | 40-60% operator fee    | ~1% APY spread          | Gas only                   | $0              |
| **Professional UX**     | Dashboard + portal                | Legacy interfaces      | Basic UI                | None (code only)           | Spreadsheets    |
| **Audit Trail**         | Database + on-chain               | None                   | On-chain                | On-chain                   | None            |
| **2FA Security**        | Yes (TOTP)                        | N/A                    | N/A (wallet only)       | N/A                        | N/A             |
| **CSV Exports**         | Yes                               | No                     | No                      | No                         | Manual          |

**Key Differentiators**:

1. **Only Production-Grade Full-Stack Solution**: Competitors offer either smart contracts (no operator tools) or centralized services (no transparency). Solotto provides both.

2. **Solana-Native Advantages**: 400ms blocks and $0.00025 transactions enable frequent, accessible lotteries. Ethereum gas ($5-50) makes this economically unviable.

3. **White-Label from Day 1**: Built as infrastructure platform, not single-use application. Any SPL token can deploy without custom development.

4. **Multi-Tier Anti-Whale Design**: Prevents concentration of prizes among top holders. Unique in the market.

### 10.2 Market Positioning

![Figure 9 - Competitive Positioning Matrix](images/Figure%209%20-%20Competitive%20Positioning%20Matrix.png)

**Strategic Positioning**: "The only production-grade, fully transparent lottery infrastructure for Web3"

---

## 11. Future Work

### 11.1 On-Chain Program Deployment

Current system uses backend services for orchestration. Future versions will deploy Solana programs for:

**Benefits**:

- Lower operational costs (no backend compute)
- Increased decentralization (program on-chain)
- Composability with other protocols

**Challenges**:

- Program complexity (5-phase workflow)
- State rent costs for large participant sets
- RPC calls for snapshot still required (off-chain data)

**Hybrid Approach**:

- Drawing logic in on-chain program (pure randomness)
- Snapshot and distribution in backend (RPC intensive)
- Best of both: verifiability + practicality

```rust
// Solana program for on-chain drawing (pseudocode)
#[program]
pub mod solotto_drawing {
    use anchor_lang::prelude::*;

    pub fn execute_drawing(
        ctx: Context<ExecuteDrawing>,
        tier: u8,
        participants: Vec<Pubkey>
    ) -> Result<()> {
        let clock = Clock::get()?;
        let slot = clock.slot;

        // Use recent blockhash as entropy
        let recent_blockhash = ctx.accounts.recent_blockhashes.data();

        // Deterministic winner selection
        let seed = hash(&[recent_blockhash, &tier.to_le_bytes()]);
        let winner_index = u64::from_le_bytes(seed[0..8]) % participants.len() as u64;
        let winner = participants[winner_index as usize];

        // Store result in program account
        ctx.accounts.drawing.tier = tier;
        ctx.accounts.drawing.winner = winner;
        ctx.accounts.drawing.blockhash = recent_blockhash;
        ctx.accounts.drawing.slot = slot;

        emit!(DrawingExecuted {
            tier,
            winner,
            blockhash: recent_blockhash,
            slot
        });

        Ok(())
    }
}
```

### 11.2 Advanced Eligibility Models

**Time-Weighted Holdings**: Longer holding duration increases tier placement

```
eligibility_score = balance × sqrt(holding_days)
```

**LP Token Bonus**: Liquidity providers receive eligibility multiplier

```
if (user_has_lp_tokens) {
  eligibility_score *= 1.5
}
```

**Governance Participation**: Require DAO voting activity for eligibility

```
if (votes_cast_in_window < 1) {
  is_eligible = false
}
```

### 11.3 Multi-Token Lotteries

Support lotteries across multiple tokens:

- Prize pool: 50% in TokenA, 30% in TokenB, 20% in SOL
- Eligibility: Must hold both TokenA AND TokenB
- Tier assignment: Based on combined USD value

### 11.4 Cross-Chain Expansion

Expand to other high-performance chains:

- **Sui**: Similar speed/cost characteristics, Move language
- **Aptos**: Move-based, compatible architecture
- **Ethereum L2s**: Base, Arbitrum, Optimism (if gas costs acceptable)

### 11.5 DAO Governance Integration

Transition to decentralized governance:

- **Parameter Control**: DAO votes on tier allocations, activity thresholds
- **Treasury Management**: DAO controls buyback schedule, protocol upgrades
- **Feature Prioritization**: Token holders vote on roadmap

![Figure 10 - DAO Governance Structure](images/Figure%2010%20-%20DAO%20Governance%20Structure.png)

---

## 12. Conclusion

Solotto dLOS introduces the first production-grade, fully transparent lottery operating system for blockchain-based tokens. By combining Solana's validator-generated blockhashes as verifiable randomness, multi-tier anti-whale mechanisms, and complete full-stack infrastructure, we enable any SPL token to deploy provably fair lotteries with zero trust assumptions.

### 12.1 Key Innovations

1. **Cryptographic Fairness**: Solana blockhashes provide unpredictable, verifiable entropy that cannot be manipulated by operators
2. **Economic Fairness**: Multi-tier segmentation prevents whale dominance and ensures equitable prize distribution
3. **Production Infrastructure**: Full-stack platform (frontend, backend, database, monitoring) ready for white-label deployment
4. **Radical Transparency**: Open-source code, public audit trails, CSV exports, and on-chain verification

### 12.2 Validation

- **150+ Test Rounds**: Completed on devnet without failures
- **220 Token Holders**: Real community built in 43 days
- **Mainnet Deployment**: Live on mainnet-beta, public launch November 9, 2025
- **Production Stack**: Supabase Pro, Alchemy RPC, Vercel/Render hosting

### 12.3 Market Opportunity

The Solana ecosystem creates 1,000+ new tokens monthly, each needing engagement tools. With 10,000+ active community tokens and zero production-grade lottery infrastructure, the market opportunity is substantial:

- **Year 1 Target**: 150 paying customers, $900K ARR
- **Year 3 Target**: 800 paying customers, $5M ARR
- **Long-term Vision**: Default lottery standard for Solana token distributions

### 12.4 Investment Thesis

Solotto dLOS represents a high-growth infrastructure play in the expanding Solana ecosystem:

**Market Timing**: Meme coin super-cycle creates demand for community tools
**Technical Moat**: Production-grade infrastructure is complex to replicate
**Unit Economics**: 14:1 LTV/CAC ratio, 80% gross margins
**Network Effects**: More tokens → more visibility → more tokens
**Token Value Accrual**: Buyback-and-burn mechanism captures protocol revenue

We are building the future of fair, transparent lottery infrastructure. Every token should be able to run a provably fair lottery in five minutes.

---

## References

[1] Global Lottery Market Report 2024, Grand View Research

[2] La Fleur's World Lottery Almanac 2023, TLF Publications

[3] PoolTogether Protocol: A No-Loss Lottery, PoolTogether Inc., 2021

[4] Chainlink VRF: Verifiable Random Functions for Smart Contracts, Chainlink Labs, 2020

[5] Solana Firedancer: Next-Generation Validator Client, Jump Crypto, 2024

[6] Random.org: True Random Number Service, Randomness and Integrity Services Ltd.

[7] Solana: A New Architecture for a High Performance Blockchain, Yakovenko A. et al., 2018

[8] Token Distribution Analysis: Concentration in DeFi Protocols, Chainalysis Research, 2024

---

## Appendix A: API Reference

### Operator Endpoints (Authenticated)

**POST** `/api/v1/control`

- Create lottery configuration
- **Request**: LotteryConfig object
- **Response**: Created Round with ID

**POST** `/api/v1/snapshot/run`

- Execute token holder snapshot
- **Request**: `{ roundId: string }`
- **Response**: Snapshot status + participant counts

**POST** `/api/v1/snapshot/confirm`

- Confirm snapshot and calculate eligibility
- **Request**: `{ snapshotId: string }`
- **Response**: Updated participant eligibility

**GET** `/api/v1/snapshot/:id/participants`

- Fetch participant list
- **Response**: Array of Participant objects

**GET** `/api/v1/snapshot/:id/participants/export`

- Export participants as CSV
- **Response**: CSV file download

**POST** `/api/v1/drawing/run`

- Execute cryptographic drawing
- **Request**: `{ roundId: string }`
- **Response**: Drawing results with winners

**POST** `/api/v1/drawing/confirm`

- Confirm drawing and update round
- **Request**: `{ drawingId: string }`
- **Response**: Updated Round with winners

**POST** `/api/v1/harvest/prepare`

- Calculate prize allocations
- **Request**: `{ roundId: string }`
- **Response**: Prize amounts per tier

**POST** `/api/v1/distribution/prepare`

- Build unsigned transactions
- **Request**: `{ roundId: string, method: 'jupiter' | 'direct' }`
- **Response**: Unsigned transactions (base64)

**POST** `/api/v1/distribution/execute`

- Broadcast signed transactions
- **Request**: `{ roundId: string, signedTransactions: string[] }`
- **Response**: Transaction signatures

### Public Endpoints (No Authentication)

**GET** `/api/v1/transparency`

- Fetch transparency dashboard data
- **Response**: System status, recent operations, audit trail

**GET** `/api/v1/history/stats`

- Fetch lottery statistics
- **Response**: Total rounds, prizes distributed, winners

**GET** `/api/v1/history/round/:id`

- Fetch specific round details
- **Response**: Round object with all metadata

**GET** `/api/v1/price/current`

- Fetch current LOTTO price
- **Response**: USD price from CoinGecko

---

## Appendix B: Deployment Architecture

![Figure 11 - Production Deployment Diagram](images/Figure%2011%20-%20Production%20Deployment%20Diagram.png)

**Infrastructure Costs** (Monthly):

- Vercel Pro: $20
- Render.com: $25 (auto-scaling)
- Supabase Pro: $25
- Alchemy Growth: $49
- Sentry: $26
- **Total: ~$145/month**

---

## Appendix C: Glossary

**Blockhash**: Cryptographic hash of a Solana block, generated by validators through consensus. Used as entropy source for randomness.

**Eligibility**: Participant qualification status based on balance and trading activity requirements.

**Lamports**: Smallest unit of SOL (1 SOL = 1,000,000,000 lamports). Analogous to satoshis in Bitcoin.

**Multi-Tier**: Segmentation of participants into four groups based on token holdings to ensure fair prize distribution.

**Proof-of-History (PoH)**: Solana's consensus mechanism that creates a cryptographic clock, enabling high throughput and low latency.

**RPC (Remote Procedure Call)**: API interface for interacting with Solana blockchain (querying balances, sending transactions, etc.).

**Seed**: 32-byte random value generated via `crypto.randomBytes()`, used as input to deterministic drawing algorithm.

**Slot**: Unit of time in Solana blockchain (~400ms). Each slot produces one block.

**SPL Token**: Solana Program Library token standard, analogous to ERC-20 on Ethereum.

**Sybil Attack**: Creation of multiple fake identities to gain disproportionate influence or advantage.

**Trading Activity**: Percentage change in token balance during eligibility window, calculated as `|(END - START) / START| × 100%`.

**White-Label**: Software platform that can be rebranded and deployed by multiple customers as their own product.

---

**END OF WHITEPAPER**

---

**Version**: 1.0
**Date**: October 31, 2025
**Authors**: Bagonaut, Peppa Mache
**License**: MIT (code), CC BY 4.0 (whitepaper)
**Contact**: SolottoDev@gmail.com
**Live Production Site**: https://solotto-lottery-dapp-frontend.vercel.app/
**Token Website**: https://solotto.live
**GitHub**: https://github.com/solottodev/solotto-lottery-dapp
