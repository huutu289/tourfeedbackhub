const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupNavigation() {
  console.log('🚀 Setting up navigation menus...\n');

  // Header Menu Items for EN
  const headerItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      type: 'internal',
      order: 10,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'tours',
      label: 'Tours',
      href: '/tours',
      type: 'internal',
      order: 20,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'stories',
      label: 'Stories',
      href: '/stories',
      type: 'internal',
      order: 30,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'reviews',
      label: 'Reviews',
      href: '/reviews',
      type: 'internal',
      order: 40,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'blog',
      label: 'Blog',
      href: '/blog',
      type: 'internal',
      order: 50,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'diaries',
      label: 'Diaries',
      href: '/finished-tours',
      type: 'internal',
      order: 60,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'about',
      label: 'About',
      href: '/about',
      type: 'internal',
      order: 70,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    },
    {
      id: 'contact',
      label: 'Contact',
      href: '/contact',
      type: 'internal',
      order: 80,
      parentId: null,
      target: '_self',
      visibleFor: ['guest', 'user', 'admin']
    }
  ];

  // Footer Menu Items for EN
  const footerItems = [
    {
      id: 'categories',
      label: 'Categories',
      href: '/blog/categories',
      type: 'internal',
      order: 10,
      parentId: null,
      target: '_self',
      area: 'links'
    },
    {
      id: 'submit-review',
      label: 'Submit Review',
      href: '/reviews/new',
      type: 'internal',
      order: 20,
      parentId: null,
      target: '_self',
      area: 'cta'
    },
    {
      id: 'feedback',
      label: 'Feedback',
      href: '/feedback',
      type: 'internal',
      order: 30,
      parentId: null,
      target: '_self',
      area: 'links'
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      href: '/privacy',
      type: 'internal',
      order: 40,
      parentId: null,
      target: '_self',
      area: 'legal'
    },
    {
      id: 'terms',
      label: 'Terms of Service',
      href: '/terms',
      type: 'internal',
      order: 50,
      parentId: null,
      target: '_self',
      area: 'legal'
    }
  ];

  try {
    // Create/Update Header Menu
    const headerMenuRef = db.collection('navigationMenus').doc('header-en');
    await headerMenuRef.set({
      key: 'header',
      locale: 'en',
      title: 'Header EN',
      published: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Created header menu document');

    // Add header items
    const batch1 = db.batch();
    for (const item of headerItems) {
      const itemRef = headerMenuRef.collection('items').doc(item.id);
      batch1.set(itemRef, {
        ...item,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch1.commit();
    console.log(`✅ Added ${headerItems.length} header menu items`);

    // Create/Update Footer Menu
    const footerMenuRef = db.collection('navigationMenus').doc('footer-en');
    await footerMenuRef.set({
      key: 'footer',
      locale: 'en',
      title: 'Footer EN',
      published: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Created footer menu document');

    // Add footer items
    const batch2 = db.batch();
    for (const item of footerItems) {
      const itemRef = footerMenuRef.collection('items').doc(item.id);
      batch2.set(itemRef, {
        ...item,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch2.commit();
    console.log(`✅ Added ${footerItems.length} footer menu items`);

    console.log('\n🎉 Navigation setup completed successfully!');
    console.log('\nHeader Menu Items:');
    headerItems.forEach(item => console.log(`  - ${item.label} (${item.href})`));
    console.log('\nFooter Menu Items:');
    footerItems.forEach(item => console.log(`  - ${item.label} (${item.href})`));

  } catch (error) {
    console.error('❌ Error setting up navigation:', error);
    process.exit(1);
  }
}

setupNavigation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
