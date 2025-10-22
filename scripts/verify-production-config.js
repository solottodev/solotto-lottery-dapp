#!/usr/bin/env node

/**
 * Verify production environment configuration before deployment
 *
 * Usage: node scripts/verify-production-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Production Configuration...\n');

// Check backend .env.production
const backendEnvPath = path.join(__dirname, '../apps/backend/.env.production');
const frontendEnvPath = path.join(__dirname, '../apps/frontend/.env.production');

let errors = [];
let warnings = [];

// Backend checks
console.log('📦 Checking Backend Configuration...');
if (!fs.existsSync(backendEnvPath)) {
  errors.push('❌ Backend .env.production file not found!');
} else {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

  // Check critical variables
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'SOLANA_NETWORK',
    'ALCHEMY_RPC_URL',
    'LOTTO_MINT_ADDRESS',
    'OPERATOR_WALLET_PRIVATE_KEY'
  ];

  requiredVars.forEach(varName => {
    if (!backendEnv.includes(varName)) {
      errors.push(`❌ Missing required variable: ${varName}`);
    } else {
      // Check for placeholder values
      const line = backendEnv.split('\n').find(l => l.startsWith(varName));
      if (line && (
        line.includes('CHANGE_ME') ||
        line.includes('YOUR_') ||
        line.includes('changeme')
      )) {
        warnings.push(`⚠️  ${varName} contains placeholder value - update before deployment!`);
      }
    }
  });

  // Check mainnet configuration
  if (backendEnv.includes('SOLANA_NETWORK="mainnet-beta"')) {
    console.log('✅ Network set to mainnet-beta');
  } else if (backendEnv.includes('SOLANA_NETWORK="devnet"')) {
    errors.push('❌ Network is set to devnet, should be mainnet-beta!');
  }

  // Check token address
  if (backendEnv.includes('HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump')) {
    console.log('✅ Mainnet LOTTO token address configured');
  } else {
    errors.push('❌ Mainnet LOTTO token address not found!');
  }

  // Check JWT secret strength
  const jwtMatch = backendEnv.match(/JWT_SECRET="([^"]+)"/);
  if (jwtMatch) {
    const secret = jwtMatch[1];
    if (secret.length < 32) {
      warnings.push('⚠️  JWT_SECRET should be at least 32 characters for production');
    } else {
      console.log('✅ JWT_SECRET has adequate length');
    }
  }
}

// Frontend checks
console.log('\n🎨 Checking Frontend Configuration...');
if (!fs.existsSync(frontendEnvPath)) {
  errors.push('❌ Frontend .env.production file not found!');
} else {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8');

  const requiredVars = [
    'NEXT_PUBLIC_SOLANA_NETWORK',
    'NEXT_PUBLIC_RPC_URL',
    'NEXT_PUBLIC_LOTTO_MINT',
    'NEXT_PUBLIC_BACKEND_URL'
  ];

  requiredVars.forEach(varName => {
    if (!frontendEnv.includes(varName)) {
      errors.push(`❌ Missing required variable: ${varName}`);
    }
  });

  // Check mainnet configuration
  if (frontendEnv.includes('NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"')) {
    console.log('✅ Frontend network set to mainnet-beta');
  } else {
    errors.push('❌ Frontend network should be mainnet-beta!');
  }

  // Check backend URL
  if (frontendEnv.includes('localhost')) {
    warnings.push('⚠️  NEXT_PUBLIC_BACKEND_URL contains localhost - update to production URL!');
  } else if (frontendEnv.includes('https://')) {
    console.log('✅ Production backend URL configured');
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Configuration Verification Summary:');
console.log('='.repeat(60));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed! Configuration looks good for production.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix before deployment):');
    errors.forEach(err => console.log('  ' + err));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (should fix before deployment):');
    warnings.forEach(warn => console.log('  ' + warn));
  }

  console.log('\n🔧 Fix these issues and run this script again.\n');
  process.exit(1);
}
