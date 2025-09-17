#!/bin/bash
# setup-dev.sh - Development Environment Setup Script

set -e

echo "\U0001f680 Setting up Workflow Management System - Development Environment"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "\u274c Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "\u274c Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories and the MongoDB init script
echo "\U0001f4dc Creating directories and MongoDB init script..."
mkdir -p scripts
cat <<EOF > ./scripts/mongo-init.js
// ./scripts/mongo-init.js
// scripts/mongo-init.js
// MongoDB initialization script for development

// Switch to office database
db = db.getSiblingDB('admin');

// Create application user
db.createUser({
  user: 'office_user',
  pwd: 'office_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'office'
    }
  ]
});

// Create initial collections with proper indexes
db.createCollection('letters');
db.createCollection('accounts_orgrolegroup');
db.createCollection('accounts_orgrole');
db.createCollection('accounts_membership');
db.createCollection('letters_approval');
db.createCollection('auth_user');

// Create indexes for better performance
db.letters.createIndex({ "state": 1 });
db.letters.createIndex({ "created_at": -1 });
db.letters.createIndex({ "created_by": 1 });
db.letters.createIndex({ "applicant_national_id": 1 });

db.letters_approval.createIndex({ "letter_id": 1, "state": 1 });
db.letters_approval.createIndex({ "letter_id": 1, "state": 1, "step": 1 }, { unique: true });

db.accounts_membership.createIndex({ "user": 1 });
db.accounts_membership.createIndex({ "role": 1 });

db.auth_user.createIndex({ "username": 1 }, { unique: true });

print('\U0001f389 MongoDB initialization completed for workflow management system');
print('Database: office');
print('User: office_user created with readWrite permissions');
print('');
print('\U0001f4cb Next: Django will create demo users via management command');
print('\U0001f465 Demo users will be available with password: pass1234');
print('');
EOF

mkdir -p backend/static
mkdir -p backend/media

# Copy environment file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "\U0001f4cb Creating environment file..."
    cp backend/.env.dev backend/.env
    echo "\u26a0\ufe0f  Please update backend/.env with your configuration"
fi

# Build and start services
echo "\U0001f433 Building and starting Docker containers..."
docker compose down -v  # Clean start
docker compose up --build -d

echo "\u23f3 Waiting for services to be ready..."
sleep 30

# Check service health
echo "\U0001f3e5 Checking service health..."

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "\u2705 MongoDB is running"
else
    echo "\u274c MongoDB is not responding"
fi

# Check MinIO
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "\u2705 MinIO is running"
else
    echo "\u274c MinIO is not responding"
fi

# Check Backend
if curl -f http://localhost:8000/api/ > /dev/null 2>&1; then
    echo "\u2705 Backend is running"
else
    echo "\u274c Backend is not responding"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "\u2705 Frontend is running"
else
    echo "\u274c Frontend is not responding"
fi

echo ""
echo "\U0001f389 Development environment setup complete!"
echo ""
echo "\U0001f4cb Service URLs:"
echo "   Frontend:      http://localhost:3000"
echo "   Backend API:   http://localhost:8000/api"
echo "   Django Admin:  http://localhost:8000/admin"
echo "   MinIO Console: http://localhost:9001 (minio/minio123)"
echo "   MongoDB:       mongodb://localhost:27017"
echo ""
echo "\U0001f527 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   Stop services:       docker-compose down"
echo "   Restart services:    docker-compose restart"
echo "   Backend shell:       docker-compose exec backend python manage.py shell"
echo "   Create superuser:    docker-compose exec backend python manage.py createsuperuser"
echo ""
echo "\U0001f4da Next steps:"
echo "   1. Create a Django superuser: docker-compose exec backend python manage.py createsuperuser"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Login with your credentials"
echo ""
