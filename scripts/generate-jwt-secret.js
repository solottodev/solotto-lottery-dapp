#!/usr/bin/env node

/**
 * Generate a secure JWT secret for production
 *
 * Usage: node scripts/generate-jwt-secret.js
 */

const crypto = require('crypto');

// Generate 64 character random hex string
const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated JWT Secret (64 characters):\n');
console.log(secret);
console.log('\n✅ Copy this to your .env.production file:');
console.log(`JWT_SECRET="${secret}"`);
console.log('\n⚠️  Keep this secret secure and never commit it to version control!\n');
