/**
 * Script to create a SUPER_ADMIN user
 * 
 * Usage: node scripts/create-superadmin.js <email> <password> <name>
 * Example: node scripts/create-superadmin.js admin@example.com password123 "Admin User"
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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

async function createSuperAdmin(email, password, name) {
  if (!email || !password || !name) {
    console.error('❌ Error: Email, password, and name are required');
    console.log('\nUsage: node scripts/create-superadmin.js <email> <password> <name>');
    console.log('Example: node scripts/create-superadmin.js admin@example.com password123 "Admin User"');
    process.exit(1);
  }

  console.log(`\n🔍 Creating SUPER_ADMIN user...\n`);

  const users = readUsers();
  
  // Check if user already exists
  const existingUser = users.find(u => 
    u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (existingUser) {
    console.log(`⚠️  User already exists: ${email}`);
    console.log(`   Current role: ${existingUser.role || 'USER'}`);
    console.log('\n💡 Use promote-to-superadmin.js to promote existing user instead:');
    console.log(`   node scripts/promote-to-superadmin.js ${email}\n`);
    process.exit(1);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate user ID
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const userId = `local-${timestamp}-${randomId}`;

  // Create new user
  const newUser = {
    _id: userId,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    name: name,
    role: UserRole.SUPER_ADMIN,
    organizationId: undefined,
    affiliateId: undefined,
    permissions: {
      canAccessRuleEngine: true,
      canValidateEvidence: true,
      canEditRuleEngine: true,
      canUploadEvidence: true,
      canManageRoadmap: true,
      isOrganizationAdmin: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  console.log('✅ SUPER_ADMIN user created successfully!');
  console.log(`\n📋 User details:`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Name: ${newUser.name}`);
  console.log(`   Role: ${newUser.role}`);
  console.log(`   Password: ${password} (hashed and stored)`);
  console.log(`\n💡 You can now log in with this account!`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Password: ${password}\n`);

  process.exit(0);
}

// Get arguments from command line
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

createSuperAdmin(email, password, name);

