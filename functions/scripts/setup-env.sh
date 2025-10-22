#!/bin/bash

echo "=========================================="
echo "  Firebase Environment Setup Helper"
echo "=========================================="
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
  echo "⚠️  .env.local already exists!"
  read -p "Do you want to overwrite it? (y/N): " overwrite
  if [[ ! $overwrite =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

echo "This script will help you create .env.local with Firebase credentials."
echo ""
echo "You'll need:"
echo "  1. Your Firebase service account JSON file"
echo "  2. Your Firebase web app config"
echo ""
read -p "Do you have these ready? (y/N): " ready

if [[ ! $ready =~ ^[Yy]$ ]]; then
  echo ""
  echo "Please get your credentials first:"
  echo ""
  echo "Service Account (for server-side):"
  echo "  → https://console.firebase.google.com/project/tourfeedbackhub-474704/settings/serviceaccounts/adminsdk"
  echo "  → Click 'Generate new private key'"
  echo ""
  echo "Web App Config (for client-side):"
  echo "  → https://console.firebase.google.com/project/tourfeedbackhub-474704/settings/general"
  echo "  → Scroll to 'Your apps' → Web app → Config"
  echo ""
  exit 0
fi

echo ""
read -p "Enter path to service account JSON file (or press Enter to input manually): " json_file

if [ -n "$json_file" ] && [ -f "$json_file" ]; then
  # Extract from JSON
  PROJECT_ID=$(grep -o '"project_id": *"[^"]*"' "$json_file" | cut -d'"' -f4)
  CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$json_file" | cut -d'"' -f4)
  PRIVATE_KEY=$(grep -o '"private_key": *"[^"]*"' "$json_file" | cut -d'"' -f4)
  
  echo "✓ Extracted from JSON file"
else
  # Manual input
  echo ""
  echo "Manual entry mode:"
  read -p "FIREBASE_PROJECT_ID: " PROJECT_ID
  read -p "FIREBASE_CLIENT_EMAIL: " CLIENT_EMAIL
  echo "FIREBASE_PRIVATE_KEY (paste the entire key including BEGIN/END lines, then press Ctrl+D):"
  PRIVATE_KEY=$(cat)
fi

# Web app config
echo ""
echo "Now enter your web app config values:"
read -p "NEXT_PUBLIC_FIREBASE_API_KEY: " API_KEY
read -p "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: " SENDER_ID
read -p "NEXT_PUBLIC_FIREBASE_APP_ID: " APP_ID

# Create .env.local
cat > .env.local << ENV_EOF
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$APP_ID

# Firebase Admin SDK
FIREBASE_PROJECT_ID=$PROJECT_ID
FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL
FIREBASE_PRIVATE_KEY="$PRIVATE_KEY"
FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.appspot.com

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:9002
SITE_URL=http://localhost:9002
ENV_EOF

echo ""
echo "✅ Created .env.local successfully!"
echo ""
echo "You can now run:"
echo "  node scripts/create-admin-user.js"
echo ""
