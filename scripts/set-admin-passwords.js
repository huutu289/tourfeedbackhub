/**
 * Script to set passwords for admin users
 * Run with: node scripts/set-admin-passwords.js
 */

require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log('Using project ID:', serviceAccount.projectId);

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

const ADMIN_USERS = [
  { email: 'huutu289@gmail.com', password: 'huutu289@gmail.com' },
  { email: 'iposntmk@gmail.com', password: 'iposntmk@gmail.com' },
];

async function setAdminPasswords() {
  console.log('Setting passwords for admin users...\n');

  for (const { email, password } of ADMIN_USERS) {
    try {
      const user = await auth.getUserByEmail(email);

      await auth.updateUser(user.uid, {
        password: password,
        emailVerified: true,
      });

      console.log(`✓ Set password for: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  UID: ${user.uid}\n`);
    } catch (error) {
      console.error(`✗ Error setting password for ${email}:`, error.message, '\n');
    }
  }

  console.log('Done! All admin passwords have been set.');
  console.log('\n⚠️  IMPORTANT: Change these passwords after first login!');
  process.exit(0);
}

setAdminPasswords().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
