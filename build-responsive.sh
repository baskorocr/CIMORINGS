#!/bin/bash

echo "🚀 Building CIMORINGS with Mobile-Responsive Design..."

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building frontend..."
npm run build

# Navigate back to root
cd ..

# Navigate to backend directory
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "✅ Build completed!"
echo ""
echo "📱 Mobile-Responsive Features Added:"
echo "   ✓ Mobile-first responsive design"
echo "   ✓ Touch-friendly interface"
echo "   ✓ Mobile navigation menu"
echo "   ✓ Responsive cards for mobile"
echo "   ✓ Optimized tables for small screens"
echo "   ✓ Mobile-friendly forms and dialogs"
echo "   ✓ Responsive dashboard layout"
echo ""
echo "🎯 To start the application:"
echo "   Backend: cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run serve"
echo ""
echo "📱 The application is now fully responsive and mobile-friendly!"
