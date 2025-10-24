// apps/backend/scripts/test-solscan-api.ts
// Test script to verify Solscan API functionality and reliability
// Run with: npx ts-node apps/backend/scripts/test-solscan-api.ts

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface SolscanHolder {
  address: string;
  owner: string;
  amount: string;
  decimals: number;
  rank: number;
  value: number;
  percentage: number;
}

interface SolscanHoldersResponse {
  success: boolean;
  data: {
    total: number;
    items: SolscanHolder[];
  };
}

const SOLSCAN_API_BASE = 'https://pro-api.solscan.io/v2.0';
const LOTTO_TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT || 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump';

class SolscanAPITester {
  private apiKey: string;
  private testResults: {
    test: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    data?: any;
  }[] = [];

  constructor() {
    this.apiKey = process.env.SOLSCAN_API_KEY || '';
  }

  // Test 1: API Key Configuration
  async testAPIKeyConfig(): Promise<void> {
    console.log('\n📋 Test 1: API Key Configuration');
    console.log('─'.repeat(60));

    if (!this.apiKey) {
      this.testResults.push({
        test: 'API Key Config',
        status: 'FAIL',
        message: 'SOLSCAN_API_KEY not found in .env file'
      });
      console.log('❌ FAIL: SOLSCAN_API_KEY not configured');
      console.log('   Please add SOLSCAN_API_KEY to apps/backend/.env');
      return;
    }

    this.testResults.push({
      test: 'API Key Config',
      status: 'PASS',
      message: 'API key found in environment',
      data: { keyLength: this.apiKey.length }
    });
    console.log(`✅ PASS: API key found (length: ${this.apiKey.length} chars)`);
  }

  // Test 2: Basic API Connectivity
  async testConnectivity(): Promise<void> {
    console.log('\n🔌 Test 2: API Connectivity');
    console.log('─'.repeat(60));

    try {
      const response = await axios.get(`${SOLSCAN_API_BASE}/token/holders`, {
        params: {
          address: LOTTO_TOKEN_MINT,
          page: 1,
          page_size: 10
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        this.testResults.push({
          test: 'API Connectivity',
          status: 'PASS',
          message: 'Successfully connected to Solscan API',
          data: { statusCode: response.status }
        });
        console.log('✅ PASS: Successfully connected to Solscan API');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response time: ${response.headers['x-response-time'] || 'N/A'}`);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error: any) {
      const message = error.response?.status === 401
        ? 'Invalid API key (401 Unauthorized)'
        : error.message;

      this.testResults.push({
        test: 'API Connectivity',
        status: 'FAIL',
        message,
        data: { error: error.message, status: error.response?.status }
      });
      console.log(`❌ FAIL: ${message}`);
    }
  }

  // Test 3: Data Structure Validation
  async testDataStructure(): Promise<void> {
    console.log('\n📊 Test 3: Response Data Structure');
    console.log('─'.repeat(60));

    try {
      const response = await axios.get<SolscanHoldersResponse>(
        `${SOLSCAN_API_BASE}/token/holders`,
        {
          params: {
            address: LOTTO_TOKEN_MINT,
            page: 1,
            page_size: 10
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const data = response.data;

      // Validate response structure
      const checks = [
        { name: 'success field', value: typeof data.success === 'boolean' },
        { name: 'data object', value: typeof data.data === 'object' },
        { name: 'total field', value: typeof data.data?.total === 'number' },
        { name: 'items array', value: Array.isArray(data.data?.items) }
      ];

      const allValid = checks.every(c => c.value);

      if (allValid && data.data.items.length > 0) {
        const firstHolder = data.data.items[0];
        const holderChecks = [
          { name: 'owner', value: typeof firstHolder.owner === 'string' },
          { name: 'amount', value: typeof firstHolder.amount === 'string' },
          { name: 'value (USD)', value: typeof firstHolder.value === 'number' },
          { name: 'decimals', value: typeof firstHolder.decimals === 'number' },
          { name: 'rank', value: typeof firstHolder.rank === 'number' },
          { name: 'percentage', value: typeof firstHolder.percentage === 'number' }
        ];

        const allHolderFieldsValid = holderChecks.every(c => c.value);

        if (allHolderFieldsValid) {
          this.testResults.push({
            test: 'Data Structure',
            status: 'PASS',
            message: 'Response structure matches expected format',
            data: { totalHolders: data.data.total, sampleHolder: firstHolder }
          });
          console.log('✅ PASS: Response structure is valid');
          console.log(`   Total holders: ${data.data.total}`);
          console.log('\n   Sample holder data:');
          console.log(`   - Owner: ${firstHolder.owner}`);
          console.log(`   - Token Balance: ${firstHolder.amount}`);
          console.log(`   - USD Value: $${firstHolder.value.toFixed(2)}`);
          console.log(`   - Rank: #${firstHolder.rank}`);
          console.log(`   - Percentage: ${firstHolder.percentage.toFixed(2)}%`);
        } else {
          throw new Error('Holder fields do not match expected structure');
        }
      } else {
        throw new Error('Response structure is invalid');
      }
    } catch (error: any) {
      this.testResults.push({
        test: 'Data Structure',
        status: 'FAIL',
        message: error.message,
        data: { error: error.message }
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  // Test 4: USD Value Validation
  async testUSDValues(): Promise<void> {
    console.log('\n💵 Test 4: USD Value Validation');
    console.log('─'.repeat(60));

    try {
      const response = await axios.get<SolscanHoldersResponse>(
        `${SOLSCAN_API_BASE}/token/holders`,
        {
          params: {
            address: LOTTO_TOKEN_MINT,
            page: 1,
            page_size: 10
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const holders = response.data.data.items;
      const holdersWithUSD = holders.filter(h => h.value > 0);

      if (holdersWithUSD.length === 0) {
        this.testResults.push({
          test: 'USD Values',
          status: 'WARN',
          message: 'No holders have USD values > 0 (token may not be priced)',
          data: { totalHolders: holders.length }
        });
        console.log('⚠️  WARN: No holders have USD values');
        console.log('   This could mean:');
        console.log('   - Token is not actively traded');
        console.log('   - Token has no price data on Solscan');
        console.log('   - API is not returning price data');
        return;
      }

      // Calculate implied price from first holder
      const firstHolder = holders[0];
      const impliedPrice = firstHolder.value / parseFloat(firstHolder.amount);

      this.testResults.push({
        test: 'USD Values',
        status: 'PASS',
        message: 'USD values are present and calculable',
        data: {
          holdersWithUSD: holdersWithUSD.length,
          impliedPrice,
          sampleUSDValue: firstHolder.value
        }
      });

      console.log('✅ PASS: USD values are present');
      console.log(`   Holders with USD values: ${holdersWithUSD.length}/${holders.length}`);
      console.log(`   Implied LOTTO price: $${impliedPrice.toFixed(8)} USD`);
      console.log(`   Top holder USD value: $${firstHolder.value.toFixed(2)}`);
    } catch (error: any) {
      this.testResults.push({
        test: 'USD Values',
        status: 'FAIL',
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  // Test 5: Pagination Test
  async testPagination(): Promise<void> {
    console.log('\n📄 Test 5: Pagination');
    console.log('─'.repeat(60));

    try {
      // Fetch first page
      const page1 = await axios.get<SolscanHoldersResponse>(
        `${SOLSCAN_API_BASE}/token/holders`,
        {
          params: { address: LOTTO_TOKEN_MINT, page: 1, page_size: 40 },
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      const totalHolders = page1.data.data.total;
      const expectedPages = Math.ceil(totalHolders / 40);

      console.log(`   Total holders: ${totalHolders}`);
      console.log(`   Expected pages (40/page): ${expectedPages}`);

      // Fetch second page if available
      if (totalHolders > 40) {
        const page2 = await axios.get<SolscanHoldersResponse>(
          `${SOLSCAN_API_BASE}/token/holders`,
          {
            params: { address: LOTTO_TOKEN_MINT, page: 2, page_size: 40 },
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
          }
        );

        const page1Owners = page1.data.data.items.map(h => h.owner);
        const page2Owners = page2.data.data.items.map(h => h.owner);

        // Check for overlap (should be none)
        const overlap = page1Owners.filter(o => page2Owners.includes(o));

        if (overlap.length === 0) {
          this.testResults.push({
            test: 'Pagination',
            status: 'PASS',
            message: 'Pagination works correctly (no duplicate holders)',
            data: { totalHolders, expectedPages, overlap: overlap.length }
          });
          console.log('✅ PASS: Pagination works correctly');
          console.log(`   Page 1 holders: ${page1.data.data.items.length}`);
          console.log(`   Page 2 holders: ${page2.data.data.items.length}`);
          console.log(`   No overlapping holders between pages`);
        } else {
          throw new Error(`Found ${overlap.length} duplicate holders between pages`);
        }
      } else {
        this.testResults.push({
          test: 'Pagination',
          status: 'PASS',
          message: 'All holders fit on single page (pagination not needed)',
          data: { totalHolders }
        });
        console.log('✅ PASS: All holders fit on single page');
      }
    } catch (error: any) {
      this.testResults.push({
        test: 'Pagination',
        status: 'FAIL',
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  // Test 6: Rate Limiting
  async testRateLimiting(): Promise<void> {
    console.log('\n⏱️  Test 6: Rate Limiting');
    console.log('─'.repeat(60));

    try {
      const requests = 5;
      const startTime = Date.now();

      console.log(`   Sending ${requests} rapid requests...`);

      const promises = Array.from({ length: requests }, (_, i) =>
        axios.get<SolscanHoldersResponse>(
          `${SOLSCAN_API_BASE}/token/holders`,
          {
            params: { address: LOTTO_TOKEN_MINT, page: 1, page_size: 10 },
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
          }
        ).then(() => i + 1)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const requestsPerSecond = (requests / duration) * 1000;

      this.testResults.push({
        test: 'Rate Limiting',
        status: 'PASS',
        message: `Handled ${requests} rapid requests successfully`,
        data: {
          requests,
          durationMs: duration,
          requestsPerSecond: requestsPerSecond.toFixed(2)
        }
      });

      console.log('✅ PASS: Rate limiting test passed');
      console.log(`   Completed ${requests} requests in ${duration}ms`);
      console.log(`   Rate: ${requestsPerSecond.toFixed(2)} requests/second`);
      console.log(`   Free tier limit: 1,000 requests/60 seconds (16.67 req/s)`);

      if (requestsPerSecond > 16) {
        console.log('   ⚠️  Note: You may hit rate limits with rapid pagination');
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.testResults.push({
          test: 'Rate Limiting',
          status: 'WARN',
          message: 'Rate limit hit (429 Too Many Requests)',
          data: { status: 429 }
        });
        console.log('⚠️  WARN: Rate limit encountered (429)');
        console.log('   This is expected - you may need to add delays between requests');
      } else {
        this.testResults.push({
          test: 'Rate Limiting',
          status: 'FAIL',
          message: error.message
        });
        console.log(`❌ FAIL: ${error.message}`);
      }
    }
  }

  // Test 7: Eligibility Calculation Test
  async testEligibilityCalculation(): Promise<void> {
    console.log('\n🎯 Test 7: Eligibility Calculation ($50 USD Minimum)');
    console.log('─'.repeat(60));

    try {
      const response = await axios.get<SolscanHoldersResponse>(
        `${SOLSCAN_API_BASE}/token/holders`,
        {
          params: { address: LOTTO_TOKEN_MINT, page: 1, page_size: 40 },
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );

      const holders = response.data.data.items;
      const minUSD = 50.0;
      const eligibleHolders = holders.filter(h => h.value >= minUSD);
      const ineligibleHolders = holders.filter(h => h.value < minUSD);

      this.testResults.push({
        test: 'Eligibility Calculation',
        status: 'PASS',
        message: 'Successfully calculated eligibility based on USD values',
        data: {
          totalHolders: holders.length,
          eligible: eligibleHolders.length,
          ineligible: ineligibleHolders.length,
          minUSD
        }
      });

      console.log('✅ PASS: Eligibility calculation works');
      console.log(`   Total holders checked: ${holders.length}`);
      console.log(`   Eligible (≥$50 USD): ${eligibleHolders.length} (${(eligibleHolders.length / holders.length * 100).toFixed(1)}%)`);
      console.log(`   Ineligible (<$50 USD): ${ineligibleHolders.length} (${(ineligibleHolders.length / holders.length * 100).toFixed(1)}%)`);

      if (eligibleHolders.length > 0) {
        const topEligible = eligibleHolders[0];
        console.log(`\n   Top eligible holder:`);
        console.log(`   - Wallet: ${topEligible.owner}`);
        console.log(`   - USD Value: $${topEligible.value.toFixed(2)}`);
        console.log(`   - Token Balance: ${parseFloat(topEligible.amount).toLocaleString()}`);
      }

      if (ineligibleHolders.length > 0) {
        const topIneligible = ineligibleHolders[0];
        console.log(`\n   Top ineligible holder:`);
        console.log(`   - Wallet: ${topIneligible.owner}`);
        console.log(`   - USD Value: $${topIneligible.value.toFixed(2)}`);
        console.log(`   - Token Balance: ${parseFloat(topIneligible.amount).toLocaleString()}`);
      }
    } catch (error: any) {
      this.testResults.push({
        test: 'Eligibility Calculation',
        status: 'FAIL',
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         SOLSCAN API TEST SUITE                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\nToken: ${LOTTO_TOKEN_MINT}`);
    console.log(`API Base: ${SOLSCAN_API_BASE}`);

    await this.testAPIKeyConfig();
    if (this.apiKey) {
      await this.testConnectivity();
      await this.testDataStructure();
      await this.testUSDValues();
      await this.testPagination();
      await this.testRateLimiting();
      await this.testEligibilityCalculation();
    }

    this.printSummary();
  }

  // Print test summary
  printSummary(): void {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         TEST SUMMARY                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warned = this.testResults.filter(r => r.status === 'WARN').length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️ ';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Warnings: ${warned} ⚠️`);
    console.log('─'.repeat(60));

    if (failed === 0 && warned === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Solscan API is ready for integration.');
      console.log('\nNext steps:');
      console.log('1. Review the test results above');
      console.log('2. Implement SolscanService in apps/backend/src/services/solscan.service.ts');
      console.log('3. Update SnapshotService to use Solscan instead of Alchemy');
      console.log('4. Run end-to-end snapshot test');
    } else if (failed > 0) {
      console.log('\n❌ TESTS FAILED! Do NOT proceed with Solscan integration.');
      console.log('\nFallback plan:');
      console.log('1. Use Alchemy for holder data (current approach)');
      console.log('2. Implement Manual Price Entry in Control Form');
      console.log('3. See FALLBACK_PRICE_CONVERSION_ANALYSIS.md for details');
    } else {
      console.log('\n⚠️  TESTS PASSED WITH WARNINGS. Review warnings above before proceeding.');
    }

    console.log('\n');
  }
}

// Run tests
const tester = new SolscanAPITester();
tester.runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
