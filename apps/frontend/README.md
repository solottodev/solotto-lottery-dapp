# Solotto Frontend

**Status:** Production Ready

This is the Next.js 14 frontend application for the Solotto on-chain lottery system. It provides an operator dashboard for managing lottery rounds and a public portal for transparency and history viewing.

## Overview

The frontend orchestrates the complete lottery workflow through an intuitive, modular interface:

1. **Control** - Configure lottery parameters and eligibility rules
2. **Snapshot** - Generate token holder snapshots and assign tiers
3. **Drawing** - Execute cryptographically secure winner selection
4. **Harvest** - Calculate prize allocations from operator wallet
5. **Distribution** - Distribute prizes via Jupiter swap or direct SOL transfer
6. **History** - View round history, winners, and audit trails

## Technology Stack

### Core Framework
- **Framework:** Next.js 14.2.33 (App Router)
- **React:** 18.2.0
- **TypeScript:** 5.3.3
- **Build:** PostCSS + Tailwind CSS

### State Management
- **Global State:** Zustand 5.0.8
- **Form State:** React Hook Form 7.63.0
- **Server State:** @tanstack/react-query 5.90.2
- **Persistence:** sessionStorage with Zustand middleware

### Solana Integration
- **Blockchain SDK:** @solana/web3.js 1.98.4
- **Wallet Adapter:** @solana/wallet-adapter-react 0.15.39
- **Wallet UI:** @solana/wallet-adapter-react-ui 0.9.39
- **Supported Wallets:** Phantom, Solflare

### UI & Styling
- **CSS Framework:** Tailwind CSS 3.4.13
- **Icons:** Lucide React 0.544.0
- **Validation:** Zod 3.22.4

### Form Management
- **Form Library:** React Hook Form 7.63.0
- **Validation:** Zod 3.22.4 with @hookform/resolvers 3.3.4

## Project Structure

```
apps/frontend/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Homepage
│   ├── globals.css              # Global Tailwind styles
│   ├── providers.tsx            # Context providers setup
│   │
│   ├── api/                     # Backend API proxy routes
│   │   ├── control/             # Lottery configuration
│   │   ├── snapshot/            # Snapshot generation
│   │   ├── drawing/             # Winner selection
│   │   ├── harvest/             # Prize allocation
│   │   ├── distribution/        # Prize distribution
│   │   ├── history/             # History queries
│   │   ├── dashboard-stats/     # Dashboard statistics
│   │   ├── prize-pool/          # Prize pool balance
│   │   ├── price/               # Token price
│   │   └── transparency/        # Public transparency
│   │
│   ├── dashboard/               # Protected operator routes
│   │   ├── control/
│   │   ├── snapshot/
│   │   ├── drawing/
│   │   ├── harvest/
│   │   ├── distribution/
│   │   └── history/
│   │       └── [roundId]/       # Dynamic round details
│   │
│   ├── history/                 # Public history routes
│   │   └── [roundId]/           # Public round details
│   │
│   ├── transparency/            # Public transparency portal
│   └── setup-2fa/               # 2FA setup page
│
├── components/                  # React components
│   ├── ui/                      # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── date-time-picker.tsx
│   │   ├── confirmation-modal.tsx
│   │   └── progress-bar.tsx
│   │
│   ├── SiteHeader.tsx           # Main header with navigation
│   ├── SiteFooter.tsx           # Footer component
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── WalletPanel.tsx          # Wallet connection panel
│   ├── WalletConnect.tsx        # Wallet multi-button
│   ├── OperatorLogin.tsx        # JWT authentication modal
│   ├── ModuleGrid.tsx           # Dashboard module layout
│   ├── ControlForm.tsx          # Configuration form
│   ├── SnapshotForm.tsx         # Snapshot generation
│   ├── DrawingForm.tsx          # Drawing execution
│   ├── HarvestModule.tsx        # Harvest operations
│   ├── DistributionModule.tsx   # Prize distribution
│   ├── HistoryLookup.tsx        # History search
│   └── Setup2FA.tsx             # 2FA setup component
│
├── lib/                         # Utilities & services
│   ├── wallet.tsx               # Solana wallet provider
│   ├── api.ts                   # API client functions
│   └── zodSchemas.ts            # Form validation schemas
│
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts               # Authentication logic
│   ├── useAuthStore.ts          # JWT token store
│   ├── useWalletStore.ts        # Wallet address store
│   ├── useModuleStore.ts        # Workflow state store
│   ├── useDashboardStats.ts     # Dashboard stats fetching
│   └── usePrizePool.ts          # Prize pool fetching
│
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind customization
├── postcss.config.js            # PostCSS config
├── next.config.js               # Next.js config
└── .env                         # Environment variables
```

## Environment Variables

Create a `.env.local` file in `apps/frontend/`:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet          # devnet | mainnet-beta
NEXT_PUBLIC_SOLANA_RPC=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY

# Token Configuration
NEXT_PUBLIC_LOTTO_MINT=HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
NEXT_PUBLIC_NETWORK=mainnet-beta
```

See [.env.example](.env.example) for a complete template.

## Installation & Setup

### 1. Install Dependencies

```bash
cd apps/frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Start Development Server

```bash
npm run dev
```

The application starts at http://localhost:3000

## Features

### Operator Dashboard

**Authentication:**
- Email/password login with JWT tokens
- Optional TOTP 2FA (Google Authenticator compatible)
- Session-based token storage (memory only, no persistence)
- Wallet-based transaction signing

**Control Module:**
- Configure lottery parameters (start/end dates, thresholds)
- Set minimum USD balance requirement (default: $50)
- Configure trading activity threshold (default: 50%)
- Set prize distribution percentage (default: 70%)
- Manage blacklist (wallets to exclude)
- Fetch current LOTTO price from CoinGecko
- Validate prize source wallet balance on-chain

**Snapshot Module:**
- Generate token holder snapshots from blockchain
- Automatic tier assignment:
  - **Tier 1:** Top 5% of holders
  - **Tier 2:** 5-20%
  - **Tier 3:** 20-50%
  - **Tier 4:** 50-100%
  - **Dust:** Below minimum threshold
- View participant counts by tier
- Export participants as CSV
- Confirm snapshot with trading activity calculation

**Drawing Module:**
- Execute cryptographically secure winner selection
- One winner per tier (4 total)
- Cryptographic seed generation (32 bytes)
- Blockchain audit trail (blockhash, slot)
- Deterministic verification
- Confirm drawing results

**Harvest Module:**
- Calculate prize pool from operator wallet
- Allocate prizes by tier:
  - **T1:** 40% of prize pool
  - **T2:** 30%
  - **T3:** 20%
  - **T4:** 10%
- Display allocations before distribution

**Distribution Module:**
- Option 1: Jupiter swap (SOL → LOTTO)
  - Fetches swap quotes for each winner
  - Builds unsigned transactions
  - Wallet signs transactions
  - Broadcasts to Solana network
- Option 2: Direct SOL transfer (fallback)
- View winner addresses and amounts
- Export distribution results as CSV
- Transaction signature tracking

**History Module:**
- View all completed lottery rounds
- Paginated round list with filters
- Detailed round view with:
  - Winner addresses
  - Prize amounts
  - Transaction signatures
  - Participant counts
  - Eligibility scores
- Export round data as CSV
- Search by round ID or wallet address

### Public Portal

**Transparency Page:**
- System health status
- Recent operations audit trail
- Source code verification
- Last drawing information
- Network status (RPC, database, Alchemy)

**Public History:**
- View all completed lottery rounds
- Round details with winners
- Transaction verification (Solscan links)
- No authentication required

### Wallet Integration

**Supported Wallets:**
- Phantom (primary)
- Solflare (secondary)

**Features:**
- Auto-connect on page load
- Network detection (devnet/mainnet)
- Balance checking
- Transaction signing
- Multi-wallet support
- Responsive wallet button

### State Persistence

**Session Restoration:**
- Workflow state saved to sessionStorage
- Automatic restoration on page refresh
- Banner alert for restored sessions
- Option to continue or reset

**Persisted State:**
- Control configuration
- Snapshot status and results
- Drawing winners
- Harvest allocations
- Distribution status
- Round ID context
- Participant counts

## Development

### Running Locally

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

### Code Quality

- **TypeScript:** Strict mode enabled
- **ESLint:** Code quality enforcement
- **Path Aliases:** `@/*` for clean imports
- **Module Resolution:** Modern bundler-based

### Building for Production

```bash
npm run build
```

Output: `.next/` directory with optimized build

## Styling

### Tailwind CSS

**Custom Color Palette:**
- **Primary:** `#00ffd4` (cyan/turquoise)
- **Accent:** `#36f1fe` (bright cyan)
- **Night:** Multiple dark shades for backgrounds
- **Status Colors:** Success (green), Warning (red), Info (blue)

**Custom Animations:**
- `animate-grid-float` - Floating grid background (20s)
- `animate-glow-pulse` - Pulsing glow effect (4s)

**Custom Shadows:**
- `shadow-glow` - Cyan glow effect
- `shadow-panel` - Large panel shadow
- `shadow-card` - Medium card shadow

**Responsive Breakpoints:**
- `sm:` 640px (mobile)
- `md:` 768px (tablet)
- `lg:` 1024px (desktop)
- `2xl:` 1536px (large desktop)

### Design System

- Dark mode optimized
- Grid pattern background
- Gradient text effects
- Glass morphism panels
- Consistent spacing scale
- Semantic color tokens

## API Integration

### Backend Proxy Pattern

All API calls go through Next.js API routes (`/api/*`) which proxy to the backend:

```typescript
// Frontend → Next.js API Route → Backend API
POST /api/control → Backend /api/v1/control
GET /api/dashboard-stats → Backend /api/v1/history/stats
```

**Benefits:**
- Hides backend URL from client
- Adds CORS headers automatically
- Enables server-side authentication
- Simplifies deployment

### API Client Functions

Located in [lib/api.ts](lib/api.ts):

| Function | Purpose |
|----------|---------|
| `createConfig()` | Submit lottery configuration |
| `fetchCurrentPrice()` | Get LOTTO price from CoinGecko |
| `generateSnapshot()` | Start snapshot generation |
| `confirmSnapshot()` | Confirm snapshot completion |
| `getParticipants()` | Fetch participants list |
| `exportParticipantsCSV()` | Export participants as CSV |
| `runDrawing()` | Execute winner drawing |
| `confirmDrawing()` | Confirm drawing results |
| `prepareHarvest()` | Calculate prize allocations |
| `prepareDistribution()` | Build distribution transactions |
| `broadcastDistribution()` | Broadcast signed transactions |

### Authentication Flow

1. User logs in via OperatorLogin modal
2. Backend returns JWT token (1-hour expiration)
3. Token stored in Zustand `useAuthStore` (memory only)
4. Token sent in Authorization header for all API calls
5. Token automatically cleared on logout or expiration

## State Management

### Zustand Stores

**useModuleStore:**
- Workflow state (control, snapshot, drawing, harvest, distribution)
- Round ID tracking
- Participant counts
- History data
- Persisted to sessionStorage

**useAuthStore:**
- JWT token storage (not persisted)
- Login/logout actions
- Token expiration handling

**useWalletStore:**
- Current wallet address
- Updates on wallet connection change

### Data Fetching Patterns

**Dashboard Stats:**
- Fetches every 5 minutes
- Shows: total rounds, SOL distributed, winners, avg prize pool
- Graceful error fallback

**Prize Pool:**
- Fetches every 2 minutes
- Queries Solana RPC for wallet balance
- Calculates 70% of balance
- Retry logic (3 attempts)

**Form Data:**
- Manual fetch on user action
- Current LOTTO price from CoinGecko
- No caching (fresh data each time)

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables (Production)

Set in Vercel dashboard or via CLI:

```bash
vercel env add NEXT_PUBLIC_BACKEND_URL
vercel env add NEXT_PUBLIC_SOLANA_NETWORK
vercel env add NEXT_PUBLIC_SOLANA_RPC
vercel env add NEXT_PUBLIC_LOTTO_MINT
```

### Build Configuration

- **Output:** Standard Next.js build
- **Runtime:** Node.js
- **Caching:** Dynamic routes (no-store for API proxies)
- **Revalidation:** Disabled for real-time data

See [MAINNET_DEPLOYMENT_PLAN.md](../../MAINNET_DEPLOYMENT_PLAN.md) for detailed deployment guide.

## Pages & Routes

### Operator Dashboard (Protected)

| Route | Description |
|-------|-------------|
| `/dashboard/control` | Lottery configuration |
| `/dashboard/snapshot` | Token holder snapshot |
| `/dashboard/drawing` | Winner selection |
| `/dashboard/harvest` | Prize allocation |
| `/dashboard/distribution` | Prize distribution |
| `/dashboard/history` | Round history |
| `/dashboard/history/[roundId]` | Round details |

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with overview |
| `/history` | Public history explorer |
| `/history/[roundId]` | Public round details |
| `/transparency` | Transparency portal |

### Authentication

| Route | Description |
|-------|-------------|
| `/setup-2fa` | 2FA setup page |

## Security

### Authentication
- JWT tokens (1-hour expiration)
- TOTP 2FA support
- No token persistence (memory only)
- Automatic logout on expiration

### Wallet Security
- Signature verification for transactions
- User confirms all transactions in wallet
- No private key handling

### Input Validation
- Zod schema validation on all forms
- Base58 address validation
- Date range validation
- Numeric input constraints

### CORS
- Handled via Next.js API routes
- Backend URL hidden from client
- Proper CORS headers

## Troubleshooting

### Wallet Connection Issues

**Problem:** Wallet not connecting

**Solution:**
```bash
# Check network configuration
echo $NEXT_PUBLIC_SOLANA_NETWORK

# Verify RPC endpoint
curl $NEXT_PUBLIC_SOLANA_RPC
```

### API Connection Failures

**Problem:** Backend API not reachable

**Solution:**
```bash
# Check backend URL
echo $NEXT_PUBLIC_BACKEND_URL

# Test backend health
curl http://localhost:4000/api/v1/health
```

### State Persistence Issues

**Problem:** State lost on refresh

**Solution:**
- Check browser sessionStorage (DevTools → Application → Session Storage)
- Verify Zustand middleware configuration
- Clear sessionStorage if corrupted: `sessionStorage.clear()`

## Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Building
npm run build            # Create production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors

# Type Checking
npx tsc --noEmit         # Check TypeScript errors
```

## Contributing

1. Create a feature branch
2. Follow TypeScript best practices
3. Use Tailwind CSS for styling
4. Test wallet integration on devnet
5. Verify responsive design (mobile, tablet, desktop)
6. Update component documentation

## Related Documentation

- [Backend README](../backend/README.md) - Backend API documentation
- [Database README](../backend/DATABASE_README.md) - Database schema
- [Deployment Guide](../../MAINNET_DEPLOYMENT_PLAN.md) - Production deployment
- [Implementation Checklist](../../IMPLEMENTATION_CHECKLIST.md) - Feature tracking

## Support

- **Technical Issues:** Create repository issue
- **Wallet Issues:** Check wallet extension console logs
- **API Errors:** Check Network tab in DevTools

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note:** Solana wallet extensions require Chromium-based browsers (Chrome, Brave, Edge).

---

**Built with Next.js 14, React 18, Tailwind CSS, and Solana Web3.js**
