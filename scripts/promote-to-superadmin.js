/**
 * Script to promote a user to SUPER_ADMIN role
 * 
 * Usage: node scripts/promote-to-superadmin.js <email>
 * Example: node scripts/promote-to-superadmin.js admin@example.com
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const USER_FILE = path.join(DATA_DIR, 'User.json');

const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
};

function readUsers() {
  if (!fs.existsSync(USER_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(USER_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

function writeUsers(users) {
  // Ensure directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

function promoteToSuperAdmin(email) {
  if (!email) {
    console.error('❌ Error: Email is required');
    console.log('\nUsage: node scripts/promote-to-superadmin.js <email>');
    console.log('Example: node scripts/promote-to-superadmin.js admin@example.com');
    process.exit(1);
  }

  console.log(`\n🔍 Looking for user with email: ${email}...\n`);

  const users = readUsers();
  
  if (users.length === 0) {
    console.error('❌ No users found in database');
    console.log('\n💡 Please register a user first through the application.');
    process.exit(1);
  }

  // Find user by email
  const userIndex = users.findIndex(u => 
    u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (userIndex === -1) {
    console.error(`❌ User not found with email: ${email}`);
    console.log('\n💡 Available users:');
    users.forEach(u => {
      console.log(`   - ${u.email || 'No email'} (Role: ${u.role || 'USER'})`);
    });
    process.exit(1);
  }

  const user = users[userIndex];
  console.log(`✅ Found user: ${user.name || 'Unknown'} (${user.email})`);
  console.log(`   Current role: ${user.role || 'USER'}`);
  console.log(`   Current organizationId: ${user.organizationId || 'None'}`);
  console.log(`   Current affiliateId: ${user.affiliateId || 'None'}\n`);

  // Update user to SUPER_ADMIN
  users[userIndex] = {
    ...user,
    role: UserRole.SUPER_ADMIN,
    // Remove affiliateId for SuperAdmin
    affiliateId: undefined,
    // Set all permissions for SuperAdmin
    permissions: {
      canAccessRuleEngine: true,
      canValidateEvidence: true,
      canEditRuleEngine: true,
      canUploadEvidence: true,
      canManageRoadmap: true,
      isOrganizationAdmin: true,
    },
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);

  console.log('✅ User promoted to SUPER_ADMIN successfully!');
  console.log(`\n📋 Updated user details:`);
  console.log(`   Email: ${users[userIndex].email}`);
  console.log(`   Name: ${users[userIndex].name || 'Unknown'}`);
  console.log(`   Role: ${users[userIndex].role}`);
  console.log(`   OrganizationId: ${users[userIndex].organizationId || 'None (can be set later)'}`);
  console.log(`   AffiliateId: ${users[userIndex].affiliateId || 'None (removed for SuperAdmin)'}`);
  console.log(`\n💡 You can now create organizations and affiliates!`);
  console.log(`   Log out and log back in for changes to take effect.\n`);

  process.exit(0);
}

// Get email from command line arguments
const email = process.argv[2];

promoteToSuperAdmin(email);

