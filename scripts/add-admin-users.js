/**
 * Script to add admin users to Firestore
 * Run with: node scripts/add-admin-users.js
 */

require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

const db = getFirestore();
const auth = getAuth();

const ADMIN_EMAILS = [
  'huutu289@gmail.com',
  'iposntmk@gmail.com',
];

async function addAdminUsers() {
  console.log('Adding admin users...\n');

  for (const email of ADMIN_EMAILS) {
    try {
      // Get or create user
      let user;
      try {
        user = await auth.getUserByEmail(email);
        console.log(`✓ Found existing user: ${email} (UID: ${user.uid})`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`  Creating new user: ${email}`);
          user = await auth.createUser({
            email,
            password: email, // Using email as password - CHANGE THIS IN PRODUCTION!
            emailVerified: true,
          });
          console.log(`✓ Created user: ${email} (UID: ${user.uid})`);
        } else {
          throw error;
        }
      }

      // Set custom claims for admin role
      await auth.setCustomUserClaims(user.uid, { admin: true });
      console.log(`✓ Set admin claims for: ${email}`);

      // Create/update admin role document in Firestore
      await db.collection('admins').doc(user.uid).set({
        email: user.email,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      console.log(`✓ Added admin document for: ${email}\n`);

    } catch (error) {
      console.error(`✗ Error processing ${email}:`, error.message, '\n');
    }
  }

  console.log('Done! All admin users have been configured.');
  process.exit(0);
}

addAdminUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
