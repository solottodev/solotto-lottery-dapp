import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Solotto Lottery Backend API',
      version: '1.0.0',
      description: `
# Solotto - Decentralized Lottery System

Transparent, auditable, on-chain lottery automation for Solana.

## Architecture Overview

This backend orchestrates lottery operations through a multi-stage workflow:

1. **Control** - Configure lottery parameters (token mint, snapshot windows, prize pool, blacklists)
2. **Snapshot** - Capture on-chain token holder balances during configured window
3. **Drawing** - Cryptographically secure winner selection using Solana blockhash as randomness source
4. **Harvest** - Query prize source wallet and calculate tier-based prize distribution
5. **Distribution** - Execute on-chain SOL/SPL token transfers to winners

## Transparency & Auditability

- All operations are logged and timestamped in PostgreSQL
- On-chain verification data (blockhash, slot, transaction signatures) stored for each round
- Winner selection uses Solana blockhash + timestamp as verifiable randomness seed
- Complete audit trail available via /history endpoints and CSV exports
- Source code: [GitHub](https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend)

## Authentication

Most endpoints require JWT authentication. Obtain a token via the /auth endpoints using wallet signature verification.

## Public Endpoints

The following endpoints are publicly accessible without authentication:
- GET /api/v1/health - System health check
- GET /api/v1/health/rpc - RPC connection status
- GET /api/v1/health/alchemy - Alchemy connection status
- GET /api/v1/history/* - Historical lottery data and exports
- GET /api/v1/docs - This API documentation

## Rate Limiting & Network

- Configured for Solana devnet by default
- Production deployment will use mainnet-beta with enhanced rate limiting
- RPC service includes automatic fallback for reliability
      `,
      contact: {
        name: 'Solotto Development Team',
        url: 'https://github.com/solottodev/solotto-lottery-dapp'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local Development Server'
      },
      {
        url: 'https://api.solotto.io',
        description: 'Production Server (Mainnet)'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and status checks'
      },
      {
        name: 'Auth',
        description: 'Wallet-based authentication'
      },
      {
        name: 'Control',
        description: 'Lottery configuration and round creation (Operator only)'
      },
      {
        name: 'Snapshot',
        description: 'Token holder snapshot operations (Operator only)'
      },
      {
        name: 'Drawing',
        description: 'Winner selection operations (Operator only)'
      },
      {
        name: 'Harvest',
        description: 'Prize pool calculation (Operator only)'
      },
      {
        name: 'Distribution',
        description: 'Prize distribution to winners (Operator only)'
      },
      {
        name: 'History',
        description: 'Public lottery history and audit data'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint using wallet signature'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'string',
              description: 'Additional error details'
            }
          }
        },
        Round: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique round identifier (CUID)'
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Round start date (snapshot window start)'
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'Round end date (snapshot window end)'
            },
            drawingDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'When the drawing was executed'
            },
            distributionDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'When prizes were distributed'
            },
            prizePoolSol: {
              type: 'number',
              description: 'Total prize pool in SOL'
            },
            prizeDistributionPercent: {
              type: 'number',
              description: 'Percentage of source wallet allocated to prizes'
            },
            prizeSourceWallet: {
              type: 'string',
              description: 'Solana address of prize source wallet'
            },
            prizeSourceBalanceSol: {
              type: 'number',
              description: 'Balance of prize source wallet at control time'
            },
            totalParticipants: {
              type: 'integer',
              description: 'Total number of token holders captured'
            },
            eligibleParticipants: {
              type: 'integer',
              description: 'Number of eligible participants (met balance/trading thresholds)'
            },
            tierWinners: {
              type: 'object',
              properties: {
                t1: { type: 'string', nullable: true },
                t2: { type: 'string', nullable: true },
                t3: { type: 'string', nullable: true },
                t4: { type: 'string', nullable: true }
              }
            },
            tierPayouts: {
              type: 'object',
              properties: {
                t1: { type: 'number' },
                t2: { type: 'number' },
                t3: { type: 'number' },
                t4: { type: 'number' }
              }
            }
          }
        },
        Participant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique participant identifier'
            },
            roundId: {
              type: 'string',
              description: 'Associated round ID'
            },
            wallet: {
              type: 'string',
              description: 'Solana wallet address'
            },
            tokenLottoBalanceStart: {
              type: 'number',
              nullable: true,
              description: 'Token balance at round start (for trading activity calculation)'
            },
            tokenLottoBalanceEnd: {
              type: 'number',
              nullable: true,
              description: 'Token balance at round end (determines tier)'
            },
            tokenUsdBalance: {
              type: 'number',
              nullable: true,
              description: 'USD value of token holdings'
            },
            tier: {
              type: 'integer',
              enum: [1, 2, 3, 4],
              nullable: true,
              description: 'Assigned tier (1=highest holders, 4=lowest)'
            },
            isEligible: {
              type: 'boolean',
              description: 'Meets eligibility criteria (balance + trading activity thresholds)'
            },
            eligibilityScore: {
              type: 'number',
              nullable: true,
              description: 'Trading activity percentage (balance change)'
            },
            isWinner: {
              type: 'boolean',
              description: 'Selected as winner in drawing'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/index.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
