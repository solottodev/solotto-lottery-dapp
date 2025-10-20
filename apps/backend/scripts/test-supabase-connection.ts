/**
 * Supabase Connection Test Script
 *
 * Tests database connectivity and verifies role permissions
 *
 * Usage:
 *   1. Copy .env.supabase.example to .env.supabase and fill in values
 *   2. Run: npx ts-node scripts/test-supabase-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import * as path from 'path';

// Load Supabase environment variables
const envPath = path.join(__dirname, '..', '.env.supabase');
dotenv.config({ path: envPath });

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('\n🚀 Supabase Connection Test Suite\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Testing connections...\n');

  // Test 1: Main Database Connection (Read/Write)
  await testMainConnection();

  // Test 2: Read-Only Connection
  await testReadOnlyConnection();

  // Test 3: Database Schema Verification
  await testSchemaVerification();

  // Test 4: Role Permissions
  await testRolePermissions();

  // Print Summary
  printSummary();
}

async function testMainConnection() {
  const start = Date.now();
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    // Test query
    await prisma.$queryRaw`SELECT 1 as test`;

    const duration = Date.now() - start;
    results.push({
      test: '1. Main Database Connection (solotto_app)',
      status: 'PASS',
      message: 'Connected successfully',
      duration,
    });

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: '1. Main Database Connection (solotto_app)',
      status: 'FAIL',
      message: `Connection failed: ${(error as Error).message}`,
      duration: Date.now() - start,
    });
  }
}

async function testReadOnlyConnection() {
  const start = Date.now();
  try {
    const roUrl = process.env.DATABASE_URL_RO;

    if (!roUrl) {
      results.push({
        test: '2. Read-Only Connection (solotto_ro)',
        status: 'FAIL',
        message: 'DATABASE_URL_RO not configured',
        duration: 0,
      });
      return;
    }

    const prismaRO = new PrismaClient({
      datasources: {
        db: { url: roUrl },
      },
    });

    // Test read query
    await prismaRO.$queryRaw`SELECT 1 as test`;

    const duration = Date.now() - start;
    results.push({
      test: '2. Read-Only Connection (solotto_ro)',
      status: 'PASS',
      message: 'Connected successfully',
      duration,
    });

    await prismaRO.$disconnect();
  } catch (error) {
    results.push({
      test: '2. Read-Only Connection (solotto_ro)',
      status: 'FAIL',
      message: `Connection failed: ${(error as Error).message}`,
      duration: Date.now() - start,
    });
  }
}

async function testSchemaVerification() {
  const start = Date.now();
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    // Check if tables exist
    const tables: any = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const expectedTables = [
      'User',
      'LotteryConfig',
      'Round',
      'Participant',
      'Snapshot',
      'Drawing',
      '_prisma_migrations',
    ];

    const actualTables = tables.map((t: any) => t.table_name);
    const missingTables = expectedTables.filter(t => !actualTables.includes(t));

    if (missingTables.length === 0) {
      const duration = Date.now() - start;
      results.push({
        test: '3. Database Schema Verification',
        status: 'PASS',
        message: `All ${expectedTables.length} expected tables exist`,
        duration,
      });
    } else {
      results.push({
        test: '3. Database Schema Verification',
        status: 'FAIL',
        message: `Missing tables: ${missingTables.join(', ')}. Run migrations first.`,
        duration: Date.now() - start,
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: '3. Database Schema Verification',
      status: 'FAIL',
      message: `Schema check failed: ${(error as Error).message}`,
      duration: Date.now() - start,
    });
  }
}

async function testRolePermissions() {
  const start = Date.now();
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    // Test 1: Write operation with main connection (should succeed)
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'test-password-hash',
      },
    });

    // Test 2: Delete the test user (cleanup)
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    // Test 3: Verify read-only connection cannot write
    const roUrl = process.env.DATABASE_URL_RO;
    if (roUrl) {
      const prismaRO = new PrismaClient({
        datasources: {
          db: { url: roUrl },
        },
      });

      try {
        // This should fail with permission denied
        await prismaRO.user.create({
          data: {
            email: `should-fail@example.com`,
            password: 'test',
          },
        });

        // If we got here, read-only is NOT working correctly
        results.push({
          test: '4. Role Permissions',
          status: 'FAIL',
          message: 'Read-only connection can write data (security issue!)',
          duration: Date.now() - start,
        });
      } catch (roError) {
        // Expected to fail - this is correct behavior
        const duration = Date.now() - start;
        results.push({
          test: '4. Role Permissions',
          status: 'PASS',
          message: 'Write blocked on read-only connection (correct)',
          duration,
        });
      }

      await prismaRO.$disconnect();
    } else {
      const duration = Date.now() - start;
      results.push({
        test: '4. Role Permissions',
        status: 'PASS',
        message: 'Main connection can read/write (RO not configured)',
        duration,
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: '4. Role Permissions',
      status: 'FAIL',
      message: `Permission test failed: ${(error as Error).message}`,
      duration: Date.now() - start,
    });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(70) + '\n');

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const durationStr = result.duration !== undefined ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.test}${durationStr}`);
    console.log(`   ${result.message}\n`);
  });

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('='.repeat(70));
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Review the errors above and:');
    console.log('   1. Verify connection strings in .env.supabase');
    console.log('   2. Ensure migrations have been applied');
    console.log('   3. Confirm roles were created (run supabase-init-roles.sql)');
    console.log('   4. Check Supabase Dashboard for network restrictions\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! Your Supabase database is ready.');
    console.log('   Next steps:');
    console.log('   1. Create an operator user: POST /auth/register');
    console.log('   2. Test authentication: POST /auth/login');
    console.log('   3. Create a test round: POST /api/v1/control');
    console.log('   4. Verify in Supabase Table Editor\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
