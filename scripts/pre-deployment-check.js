#!/usr/bin/env node

/**
 * Pre-deployment check script
 * Runs all necessary checks before mainnet deployment
 *
 * Usage: node scripts/pre-deployment-check.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running Pre-Deployment Checks...\n');
console.log('='.repeat(60));

let errors = [];
let warnings = [];
let passed = [];

// Helper function to check command exists
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check 1: Git status clean
console.log('\n📦 Checking Git Status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  const modifiedFiles = gitStatus
    .split('\n')
    .filter(line => line.trim())
    .filter(line => !line.includes('.env')); // Ignore .env files

  if (modifiedFiles.length > 0) {
    warnings.push('⚠️  Uncommitted changes detected. Consider committing before deployment.');
    console.log('⚠️  WARNING: Uncommitted changes detected');
  } else {
    passed.push('✅ Git working directory clean');
    console.log('✅ Git working directory clean');
  }
} catch (error) {
  warnings.push('⚠️  Could not check Git status');
  console.log('⚠️  Could not check Git status');
}

// Check 2: Node version
console.log('\n📦 Checking Node Version...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    passed.push(`✅ Node version: ${nodeVersion}`);
    console.log(`✅ Node version: ${nodeVersion} (>=18)`);
  } else {
    errors.push(`❌ Node version ${nodeVersion} is too old. Need >=18`);
    console.log(`❌ Node version ${nodeVersion} is too old`);
  }
} catch (error) {
  errors.push('❌ Could not check Node version');
  console.log('❌ Could not check Node version');
}

// Check 3: Required CLI tools
console.log('\n🛠️  Checking CLI Tools...');

const requiredTools = [
  { name: 'npm', command: 'npm' },
  { name: 'git', command: 'git' },
  { name: 'curl', command: 'curl' }
];

const optionalTools = [
  { name: 'vercel', command: 'vercel' },
  { name: 'solana', command: 'solana' }
];

requiredTools.forEach(tool => {
  if (commandExists(tool.command)) {
    passed.push(`✅ ${tool.name} installed`);
    console.log(`✅ ${tool.name} installed`);
  } else {
    errors.push(`❌ ${tool.name} not installed`);
    console.log(`❌ ${tool.name} not installed`);
  }
});

optionalTools.forEach(tool => {
  if (commandExists(tool.command)) {
    passed.push(`✅ ${tool.name} installed`);
    console.log(`✅ ${tool.name} installed`);
  } else {
    warnings.push(`⚠️  ${tool.name} not installed (optional)`);
    console.log(`⚠️  ${tool.name} not installed (optional)`);
  }
});

// Check 4: Backend dependencies
console.log('\n📦 Checking Backend Dependencies...');
const backendPackageJsonPath = path.join(__dirname, '../apps/backend/package.json');
const backendNodeModulesPath = path.join(__dirname, '../apps/backend/node_modules');

if (fs.existsSync(backendPackageJsonPath)) {
  if (fs.existsSync(backendNodeModulesPath)) {
    passed.push('✅ Backend dependencies installed');
    console.log('✅ Backend dependencies installed');
  } else {
    errors.push('❌ Backend node_modules not found. Run: cd apps/backend && npm install');
    console.log('❌ Backend node_modules not found');
  }
} else {
  errors.push('❌ Backend package.json not found');
  console.log('❌ Backend package.json not found');
}

// Check 5: Frontend dependencies
console.log('\n📦 Checking Frontend Dependencies...');
const frontendPackageJsonPath = path.join(__dirname, '../apps/frontend/package.json');
const frontendNodeModulesPath = path.join(__dirname, '../apps/frontend/node_modules');

if (fs.existsSync(frontendPackageJsonPath)) {
  if (fs.existsSync(frontendNodeModulesPath)) {
    passed.push('✅ Frontend dependencies installed');
    console.log('✅ Frontend dependencies installed');
  } else {
    errors.push('❌ Frontend node_modules not found. Run: cd apps/frontend && npm install');
    console.log('❌ Frontend node_modules not found');
  }
} else {
  errors.push('❌ Frontend package.json not found');
  console.log('❌ Frontend package.json not found');
}

// Check 6: Environment files
console.log('\n🔐 Checking Environment Files...');
const envFiles = [
  { path: path.join(__dirname, '../apps/backend/.env.production'), name: 'Backend .env.production' },
  { path: path.join(__dirname, '../apps/frontend/.env.production'), name: 'Frontend .env.production' }
];

envFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    passed.push(`✅ ${file.name} exists`);
    console.log(`✅ ${file.name} exists`);

    // Check for placeholder values
    const content = fs.readFileSync(file.path, 'utf8');
    if (content.includes('CHANGE_ME') || content.includes('YOUR_') || content.includes('changeme')) {
      warnings.push(`⚠️  ${file.name} contains placeholder values`);
      console.log(`⚠️  ${file.name} contains placeholder values`);
    }
  } else {
    errors.push(`❌ ${file.name} not found`);
    console.log(`❌ ${file.name} not found`);
  }
});

// Check 7: Build test
console.log('\n🏗️  Testing Backend Build...');
try {
  console.log('   Running: npm run build (this may take a minute)...');
  execSync('cd apps/backend && npm run build', {
    stdio: 'ignore',
    timeout: 60000
  });
  passed.push('✅ Backend builds successfully');
  console.log('✅ Backend builds successfully');
} catch (error) {
  errors.push('❌ Backend build failed. Run: cd apps/backend && npm run build');
  console.log('❌ Backend build failed');
}

// Check 8: Test connection to Supabase (optional)
console.log('\n🗄️  Checking Database Configuration...');
const backendEnvPath = path.join(__dirname, '../apps/backend/.env.production');
if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

  if (backendEnv.includes('DATABASE_URL=')) {
    passed.push('✅ DATABASE_URL configured');
    console.log('✅ DATABASE_URL configured');
  } else {
    errors.push('❌ DATABASE_URL not found in .env.production');
    console.log('❌ DATABASE_URL not found');
  }

  if (backendEnv.includes('nkiezfkiasqgefzgyuwb.supabase.co')) {
    passed.push('✅ Supabase connection string present');
    console.log('✅ Supabase connection string present');
  } else {
    warnings.push('⚠️  Supabase connection string may be incorrect');
    console.log('⚠️  Supabase connection string may be incorrect');
  }
}

// Check 9: Mainnet configuration
console.log('\n🌐 Checking Mainnet Configuration...');
if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');

  if (backendEnv.includes('SOLANA_NETWORK="mainnet-beta"')) {
    passed.push('✅ Network set to mainnet-beta');
    console.log('✅ Network set to mainnet-beta');
  } else {
    errors.push('❌ SOLANA_NETWORK should be "mainnet-beta"');
    console.log('❌ SOLANA_NETWORK not set to mainnet-beta');
  }

  if (backendEnv.includes('HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump')) {
    passed.push('✅ Mainnet LOTTO token configured');
    console.log('✅ Mainnet LOTTO token configured');
  } else {
    errors.push('❌ Mainnet LOTTO token address not found');
    console.log('❌ Mainnet LOTTO token not configured');
  }
}

// Check 10: Documentation
console.log('\n📚 Checking Documentation...');
const docs = [
  'MAINNET_DEPLOYMENT_GUIDE.md',
  'DEPLOYMENT_CHECKLIST.md',
  'READY_TO_DEPLOY.md'
];

docs.forEach(doc => {
  const docPath = path.join(__dirname, '..', doc);
  if (fs.existsSync(docPath)) {
    passed.push(`✅ ${doc} present`);
    console.log(`✅ ${doc} present`);
  } else {
    warnings.push(`⚠️  ${doc} not found`);
    console.log(`⚠️  ${doc} not found`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Pre-Deployment Check Summary');
console.log('='.repeat(60));

console.log(`\n✅ Passed: ${passed.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS (must fix before deployment):');
  errors.forEach(err => console.log('  ' + err));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (should address before deployment):');
  warnings.forEach(warn => console.log('  ' + warn));
}

// Final verdict
console.log('\n' + '='.repeat(60));
if (errors.length === 0) {
  if (warnings.length === 0) {
    console.log('🎉 All checks passed! Ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. node scripts/verify-production-config.js');
    console.log('2. Follow READY_TO_DEPLOY.md instructions');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log('⚠️  No errors, but there are warnings to address.');
    console.log('Review warnings above before deploying.');
    console.log('\nNext steps:');
    console.log('1. Address warnings if possible');
    console.log('2. node scripts/verify-production-config.js');
    console.log('3. Follow READY_TO_DEPLOY.md instructions');
    console.log('='.repeat(60));
    process.exit(0);
  }
} else {
  console.log('❌ Deployment blocked by errors.');
  console.log('Fix errors above and run this script again.');
  console.log('='.repeat(60));
  process.exit(1);
}
