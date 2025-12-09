/**
 * Test script to verify user role is correctly retrieved
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const USER_FILE = path.join(DATA_DIR, 'User.json');

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

const users = readUsers();
console.log('\n📋 Users in database:\n');

users.forEach((user, index) => {
  console.log(`${index + 1}. ${user.email}`);
  console.log(`   Role: ${user.role || 'USER (not set!)'}`);
  console.log(`   ID: ${user._id}`);
  if (user.permissions) {
    console.log(`   Permissions:`, JSON.stringify(user.permissions, null, 2));
  }
  console.log('');
});

const adminUser = users.find(u => u.email === 'admin@nexus.local');
if (adminUser) {
  console.log('✅ Admin user found:');
  console.log(`   Role: ${adminUser.role}`);
  if (adminUser.role === 'SUPER_ADMIN') {
    console.log('   ✅ Role is correctly set to SUPER_ADMIN');
  } else {
    console.log('   ❌ Role is NOT SUPER_ADMIN, it is:', adminUser.role);
    console.log('   💡 Run: node scripts/promote-to-superadmin.js admin@nexus.local');
  }
} else {
  console.log('❌ Admin user not found!');
}

