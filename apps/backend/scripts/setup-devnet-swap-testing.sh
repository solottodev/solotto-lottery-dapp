#!/bin/bash

# Setup script for Jupiter Swap devnet testing
# This configures your environment to test swaps with USDC-Dev

set -e

echo "=========================================="
echo "Jupiter Swap Devnet Testing Setup"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env from .env.supabase.example first"
    echo ""
    echo "  cp .env.supabase.example .env"
    echo ""
    exit 1
fi

echo "✅ Found .env file"
echo ""

# Backup existing .env
echo "📋 Creating backup: .env.backup"
cp .env .env.backup

# Update LOTTO_MINT_ADDRESS for devnet testing
echo "🔧 Configuring for devnet swap testing..."
echo ""

# Check if LOTTO_MINT_ADDRESS exists in file
if grep -q "LOTTO_MINT_ADDRESS=" .env; then
    # Update existing line
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|^LOTTO_MINT_ADDRESS=.*|LOTTO_MINT_ADDRESS="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  # USDC-Dev for testing|g' .env
    else
        # Linux
        sed -i 's|^LOTTO_MINT_ADDRESS=.*|LOTTO_MINT_ADDRESS="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  # USDC-Dev for testing|g' .env
    fi
    echo "✅ Updated LOTTO_MINT_ADDRESS to USDC-Dev"
else
    # Add new line
    echo "" >> .env
    echo "# Jupiter Swap Testing (Devnet)" >> .env
    echo 'LOTTO_MINT_ADDRESS="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  # USDC-Dev for testing' >> .env
    echo "✅ Added LOTTO_MINT_ADDRESS configuration"
fi

# Verify network is set to devnet
if grep -q 'SOLANA_NETWORK="devnet"' .env; then
    echo "✅ Network is set to devnet"
else
    echo "⚠️  Warning: SOLANA_NETWORK is not set to devnet"
    echo "   Please verify your network configuration"
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Token: USDC-Dev (4zMMC9...ncDU)"
echo "  Network: Devnet"
echo "  Decimals: 6"
echo ""
echo "Next steps:"
echo "  1. Restart your backend: npm run dev"
echo "  2. Review: ../../DEVNET_TESTING_GUIDE.md"
echo "  3. Run Test 1: SOL distribution (baseline)"
echo "  4. Run Test 2: Jupiter swap with small amounts"
echo ""
echo "To restore original configuration:"
echo "  mv .env.backup .env"
echo ""
