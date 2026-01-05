#!/bin/bash

# WhatsApp Gateway SaaS - Quick Start Script
# This script helps you set up the development environment

set -e

echo "🚀 WhatsApp Gateway SaaS - Quick Start"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL not found. Please install MySQL 8.0+ and try again."
    exit 1
fi

echo "✅ MySQL found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your configuration:"
    echo "   - Database credentials"
    echo "   - OAuth credentials"
    echo "   - Session secret"
    echo ""
    read -p "Press Enter when you've configured .env..."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs sessions public/css public/js public/images
echo "✅ Directories created"
echo ""

# Database setup
echo "🗄️  Database Setup"
echo "=================="
read -p "Do you want to initialize the database now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:init
    echo "✅ Database initialized"
else
    echo "⏭️  Skipping database initialization"
    echo "   Run 'npm run db:init' when ready"
fi
echo ""

# Build CSS
echo "🎨 Building Tailwind CSS..."
npm run build:css
echo "✅ CSS built"
echo ""

# All done
echo "🎉 Setup Complete!"
echo "===================="
echo ""
echo "Next steps:"
echo "1. Configure your OAuth provider integration"
echo "2. Start the development server: npm run dev"
echo "3. Visit http://localhost:3000"
echo "4. Log in via OAuth"
echo "5. Connect your first WhatsApp account"
echo ""
echo "Documentation:"
echo "- Setup Guide: docs/SETUP.md"
echo "- API Docs: docs/API.md"
echo "- Architecture: docs/ARCHITECTURE.md"
echo "- Deployment: docs/DEPLOYMENT.md"
echo ""
echo "Happy coding! 🚀"

