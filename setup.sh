#!/bin/bash

# Mench-ai Quick Setup Script
# This script sets up the complete development environment

echo "🕊️ Setting up Mench-ai Development Environment..."
echo "=================================================="

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v 2>/dev/null | cut -d'v' -f2)
if [ -z "$node_version" ]; then
    echo "❌ Node.js not found. Please install Node.js 18+ and npm 8+"
    exit 1
fi

echo "✅ Node.js version: $node_version"

# Check npm version
npm_version=$(npm -v 2>/dev/null)
echo "✅ npm version: $npm_version"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo ""
echo "🔧 Setting up backend..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Copy backend environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created backend/.env from example"
    echo "⚠️  Please edit backend/.env with your API keys!"
else
    echo "📝 Backend .env already exists"
fi

cd ..

# Install frontend dependencies
echo ""
echo "🎨 Setting up frontend..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

# Copy frontend environment file
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "📝 Created frontend/.env.local from example"
else
    echo "📝 Frontend .env.local already exists"
fi

cd ..

# Create logs directory
mkdir -p backend/logs
echo "📁 Created logs directory"

echo ""
echo "🎉 Setup complete!"
echo "=================================================="
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your OpenAI API key:"
echo "   LLM_API_KEY=your_openai_api_key_here"
echo ""
echo "2. Start development servers:"
echo "   npm run dev"
echo ""
echo "3. Open your browser:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📚 Documentation:"
echo "   - Development Guide: docs/DEVELOPMENT.md"
echo "   - Architecture: docs/ARCHITECTURE.md"
echo ""
echo "Happy coding! 🚀"