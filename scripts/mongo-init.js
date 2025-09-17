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
