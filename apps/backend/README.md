# Solotto Backend API

This Express.js API powers the Solotto on-chain lottery machine. It handles:

- Lottery configuration and snapshot scheduling
- VRF-based drawing using Switchboard
- Prize harvesting and token/SOL distribution
- History tracking and audit logs

## Tech Stack
- Node.js 20
- Express.js 4
- Prisma ORM with PostgreSQL
- Redis for caching and queues
- Solana Web3 SDK
