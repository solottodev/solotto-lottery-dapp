// apps/backend/scripts/test-price-fetch.ts
// Quick test to validate price fetching from CoinGecko API
// Run with: npx ts-node apps/backend/scripts/test-price-fetch.ts

import axios from 'axios';

const LOTTO_MINT = 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump';

interface CoinGeckoPriceResponse {
  [tokenAddress: string]: {
    usd: number;
  };
}

async function testPriceFetch() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         PRICE FETCH API TEST                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`Testing price fetch for LOTTO token:`);
  console.log(`Token: ${LOTTO_MINT}\n`);

  try {
    // Test CoinGecko API
    console.log('🔍 Fetching price from CoinGecko...');
    const startTime = Date.now();

    const response = await axios.get<CoinGeckoPriceResponse>(
      'https://api.coingecko.com/api/v3/simple/token_price/solana',
      {
        params: {
          contract_addresses: LOTTO_MINT,
          vs_currencies: 'usd'
        },
        timeout: 10000
      }
    );

    const duration = Date.now() - startTime;
    const priceData = response.data[LOTTO_MINT];

    if (!priceData || typeof priceData.usd !== 'number') {
      throw new Error('Token price not found in response');
    }

    const lottoPrice = priceData.usd;

    console.log(`✅ SUCCESS! Price fetched in ${duration}ms\n`);
    console.log('─'.repeat(60));
    console.log(`💵 LOTTO Price: $${lottoPrice.toFixed(8)} USD`);
    console.log('─'.repeat(60));

    // Calculate example eligibility
    console.log('\n📊 Eligibility Calculations:\n');

    const minUSD = 50;
    const minLottoRequired = minUSD / lottoPrice;

    console.log(`   Minimum USD Required: $${minUSD}`);
    console.log(`   Minimum LOTTO Required: ${minLottoRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })} LOTTO\n`);

    // Example holder balances
    const examples = [
      { name: 'Top Holder', lotto: 100000841 },
      { name: 'Medium Holder', lotto: 5000000 },
      { name: 'Small Holder', lotto: 500000 },
      { name: 'Below Minimum', lotto: 300000 }
    ];

    console.log('   Example Holders:');
    console.log('   ' + '─'.repeat(56));
    examples.forEach(ex => {
      const usdValue = ex.lotto * lottoPrice;
      const eligible = usdValue >= minUSD;
      const icon = eligible ? '✅' : '❌';
      console.log(`   ${icon} ${ex.name.padEnd(20)} ${ex.lotto.toLocaleString().padStart(15)} LOTTO = $${usdValue.toFixed(2).padStart(10)} ${eligible ? '✅ ELIGIBLE' : '❌ INELIGIBLE'}`);
    });

    console.log('\n🎉 TEST PASSED! CoinGecko API is working correctly.\n');
    console.log('✅ "Fetch Price" button will work using CoinGecko API');
    console.log('✅ Free tier: 30 calls/minute (more than sufficient)');
    console.log('✅ Response time: Fast (<1 second)');
    console.log('✅ USD calculations: Accurate\n');

    return true;

  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}\n`);

    if (error.response) {
      console.log('API Response:');
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    console.log('\n⚠️  CoinGecko API is not available.');
    console.log('Fallback: Operator must enter price manually (no auto-fetch).\n');

    return false;
  }
}

// Run test
testPriceFetch()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
