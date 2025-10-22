/**
 * Script to create an admin user in Firebase
 * Run with: node scripts/create-admin-user.js
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const readline = require('readline');

// Validate environment variables
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('\n❌ Error: Missing Firebase environment variables!');
  console.error('\nPlease ensure .env.local contains:');
  console.error('  FIREBASE_PROJECT_ID');
  console.error('  FIREBASE_CLIENT_EMAIL');
  console.error('  FIREBASE_PRIVATE_KEY');
  console.error('\nCurrent values:');
  console.error('  FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing');
  console.error('  FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ Set' : '✗ Missing');
  console.error('  FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✓ Firebase Admin initialized successfully');
} catch (error) {
  console.error('\n❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

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

    const email = await question('Enter admin email: ');
    const displayName = await question('Enter display name: ');
    const password = await question('Enter password (min 6 characters): ');

    console.log('\nCreating user...');

    const userRecord = await auth.createUser({
      email: email.trim(),
      password: password,
      displayName: displayName.trim(),
      emailVerified: true,
    });

    console.log(`✓ Created Auth user with UID: ${userRecord.uid}`);

    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      admin: true,
    });

    console.log('✓ Set custom claims (role: admin)');

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
    console.log(`\nEmail: ${email}`);
    console.log('You can now login at: http://localhost:9002/admin/login');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('\nThe email is already in use. Would you like to update the existing user to admin?');
      const update = await question('Update to admin? (y/n): ');

      if (update.toLowerCase() === 'y') {
        try {
          const email = await question('Enter the email again: ');
          const userRecord = await auth.getUserByEmail(email.trim());

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
              { merge: true }
            );

          console.log('\n✓ Updated existing user to admin');
          console.log(`✓ User UID: ${userRecord.uid}`);
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
