# Solotto On-Chain Lottery Drawing Machine  
**Technical Specification Document v2.0**

- **Document Version:** 2.0  
- **Last Updated:** September 30, 2025  
- **Status:** Ready for Implementation  
- **Project:** Solotto Lottery Drawing Machine Rebuild  

---

## Table of Contents
- [Architecture Overview](#1-architecture-overview)
- [Technology Stack](#2-technology-stack)
- [System Architecture](#3-system-architecture)
- [Module Specifications](#4-module-specifications)
- [Data Models](#5-data-models)
- [API Specifications](#6-api-specifications)
- [Security Architecture](#7-security-architecture)
- [Deployment Strategy](#8-deployment-strategy)
- [Development Workflow](#9-development-workflow)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: References](#appendix-b-references)

---

Solotto On-Chain Lottery Drawing Machine
Technical Specification Document v2.0
Document Version: 2.0
Last Updated: September 30, 2025
Status: Ready for Implementation
Project: Solotto Lottery Drawing Machine Rebuild

Table of Contents
Architecture Overview
Technology Stack
System Architecture
Module Specifications
Data Models
API Specifications
Security Architecture
Deployment Strategy
1. Architecture Overview
1.1 Design Philosophy
The Solotto Drawing Machine follows a modular, event-driven architecture with clear separation between:

Frontend: User interface for operators and public history
Backend API: Business logic and blockchain orchestration
Blockchain Layer: Solana integration and VRF execution
Data Layer: PostgreSQL for audit logs, Redis for caching
1.2 Core Principles
Idempotency: All critical operations must be safely retriable
Auditability: Every action logged with immutable references
Fail-Safe: Graceful degradation with manual intervention paths
Transparency: Public verification of all lottery mechanics
2. Technology Stack
2.1 Frontend
Framework: Next.js 14.2+ (App Router)
Language: TypeScript 5.3+
Styling: TailwindCSS 3.4+ with custom design system
UI Components: shadcn/ui + Radix UI primitives
State Management: Zustand 4.5+
Data Fetching: TanStack Query (React Query) v5
Wallet Integration: @solana/wallet-adapter-react 0.15+
Charts: Recharts 2.10+
Forms: React Hook Form + Zod validation
2.2 Backend
Runtime: Node.js 20 LTS
Framework: Express.js 4.18+ with TypeScript
API Documentation: OpenAPI 3.1 (Swagger)
Validation: Zod schemas shared with frontend
Rate Limiting: express-rate-limit + Redis
Security: Helmet.js, CORS, express-validator
Job Queue: BullMQ for async processing
Monitoring: Sentry for errors, custom metrics
2.3 Blockchain
Solana SDK: @solana/web3.js 1.87+
RPC Providers: 
  - Primary: Helius RPC (premium tier)
  - Fallback: QuickNode
  - Tertiary: Alchemy
Indexer: Helius Digital Asset API
VRF Provider: Switchboard V2
DEX Integration: Jupiter Aggregator v6
Transaction Management: Custom retry logic with priority fees
2.4 Database & Cache
Primary Database: PostgreSQL 16
ORM: Prisma 5.8+
Schema Migrations: Prisma Migrate
Cache: Redis 7.2+ (Upstash or self-hosted)
Connection Pooling: PgBouncer
Backup Strategy: Automated daily snapshots to S3
2.5 DevOps
Version Control: GitHub with branch protection
CI/CD: GitHub Actions
Frontend Hosting: Vercel (Edge Network)
Backend Hosting: Railway or Render
Monitoring: Sentry + Custom Grafana dashboards
Secrets Management: Environment variables + Vault
Testing: Jest + Playwright
3. System Architecture
3.1 High-Level Architecture Diagram
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Operator   │  │    Public    │  │  Wallet Connect │  │
│  │   Dashboard  │  │   History    │  │    Provider     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────┬────────────────────────────────────┬──────────┘
             │                                     │
             │ HTTPS/WSS                          │ Web3
             │                                     │
┌────────────▼────────────────────────────────────▼──────────┐
│                   BACKEND API (Express)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │  Auth    │ │  Lottery │ │  Wallet  │ │   Job Queue   │ │
│  │ Service  │ │  Engine  │ │ Service  │ │   (BullMQ)    │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘ │
└────────┬───────────┬───────────┬──────────────────┬────────┘
         │           │           │                  │
         │           │           │                  │
┌────────▼──────┐┌───▼──────┐┌──▼────────┐  ┌──────▼───────┐
│  PostgreSQL   ││  Redis   ││  Solana   │  │  Switchboard │
│  (Audit Log)  ││  (Cache) ││    RPC    │  │     VRF      │
└───────────────┘└──────────┘└───────────┘  └──────────────┘

... (rest of the specification from user, unchanged) ...

## Implementation Alignment Updates (Oct 2025)

- Control Config Token
  - `tokenMint`: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
  - `tokenDecimals`: 6
  - Prize default is SOL; eligibility and thresholds are based on tokenMint holdings/trading.

- Control Config Fields and Persistence
  - Removed `name` from the lottery configuration; primary key is UUID.
  - Keep `minUsdLottoRequired` = 50 (USD threshold checked at snapshot using on-chain pricing).
  - Added and persist per-event inputs: `infraAllocationPercent` and `slippageTolerancePercent`.
  - `drawTime` is set later by the Drawing module (not during control setup).

- Date/Time Handling
  - Frontend collects `datetime-local` and normalizes to ISO UTC before sending.
  - Backend expects ISO strings and converts to `Date` objects.

- Backend Schema and API Changes
  - Prisma `LotteryConfig` model: remove `name`; add `infraAllocationPercent: Float` and `slippageTolerancePercent: Float`.
  - Zod schema (`lotteryConfigSchema`) updated to match.
  - `POST /control` route updated to accept and store the new fields; `name` removed.
  - Note: a Prisma migration is required to apply these schema changes in databases created before this update.

- Frontend Changes
  - Form validation via `ConfigSchema` mirrors fields used by the Control form.
  - API helper `createConfig` maps form inputs and sends ISO UTC datetimes.
  - ControlForm restyled to match dark module theme. No white/green card; inputs use dark backgrounds and primary borders.
  - Removed Control module top metrics from the dashboard card (values are captured directly in the form).
  - Removed the blue "Form Below" button from Control module card footer.
  - UI components (`Card*`) were extended earlier to accept `className`, but ControlForm now uses a themed section instead of Card to avoid conflicting base styles.

- Module Flow
  - After successful Control submission, `controlSubmitted` opens the Snapshot module form (gating state for Snapshot).

- Frontend Changes (UI refinements)
  - ControlForm restyled to match dark module theme. No white/green card; inputs use dark backgrounds and primary borders.
  - Removed Control module top metrics from the dashboard card (values are captured directly in the form).
  - Removed the blue "Form Below" button from Control module card footer.
  - Configure Parameters button now uses the same gradient/badge style as the "Pending Control Config" status pill for visual consistency.
  - Removed all "View module" links across module cards to reduce redundant navigation.
  - Snapshot module metrics now update dynamically after Control submission. Until backend integration is ready, the app simulates qualifying participant counts (Tier 1–4) on successful Control submission to let operators validate the flow.
  - Frontend validation: on invalid inputs, the form displays field errors, shows a user alert, and resets form state while keeping current values; on backend validation errors, an alert is shown as well.
