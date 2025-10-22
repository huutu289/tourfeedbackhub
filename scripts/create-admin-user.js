/**
 * Script to create an admin user in Firebase
 * Run with: node scripts/create-admin-user.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const readline = require('readline');

// Validate environment variables
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('\n❌ Error: Missing required environment variables!');
  console.error('\nPlease ensure .env.local file exists with:');
  console.error('  - FIREBASE_PROJECT_ID');
  console.error('  - FIREBASE_CLIENT_EMAIL');
  console.error('  - FIREBASE_PRIVATE_KEY');
  console.error('\nSee QUICK_START.md for setup instructions.\n');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  try {
    console.log('\n=== Create Admin User for Tour Insights Hub CMS ===\n');

    // Get user details
    const email = await question('Enter admin email: ');
    const displayName = await question('Enter display name: ');
    const password = await question('Enter password (min 6 characters): ');

    console.log('\nCreating user...');

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email.trim(),
      password: password,
      displayName: displayName.trim(),
      emailVerified: true, // Auto-verify admin
    });

    console.log(`✓ Created Auth user with UID: ${userRecord.uid}`);

    // Set custom claims for admin role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      admin: true,
    });

    console.log('✓ Set custom claims (role: admin)');

    // Create Firestore user document
    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email: email.trim(),
        displayName: displayName.trim(),
        role: 'admin',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✓ Created Firestore user document');

    console.log('\n🎉 Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login at: http://localhost:9002/admin/login');
    console.log('or your production URL/admin/login');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.log('\nThe email is already in use. Would you like to update the existing user to admin?');
      const update = await question('Update to admin? (y/n): ');

      if (update.toLowerCase() === 'y') {
        try {
          const userRecord = await auth.getUserByEmail(email);

          await auth.setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            admin: true,
          });

          await db
            .collection('users')
            .doc(userRecord.uid)
            .set(
              {
                role: 'admin',
                status: 'active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true}
            );

          console.log('\n✓ Updated existing user to admin');
        } catch (updateError) {
          console.error('Error updating user:', updateError.message);
        }
      }
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdminUser();
