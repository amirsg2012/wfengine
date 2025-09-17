#!/bin/bash
# update-lockfile.sh - Update package-lock.json to match package.json

echo "🔄 Updating package-lock.json to match package.json..."

cd frontend

# Remove existing lock file and node_modules
rm -f package-lock.json
rm -rf node_modules

# Install dependencies to generate new lock file
npm install

echo "✅ package-lock.json updated successfully!"
echo "📋 You can now run: docker-compose up --build"