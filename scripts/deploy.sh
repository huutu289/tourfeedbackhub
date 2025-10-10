#!/bin/bash

###############################################################################
# TourFeedbackHub Deployment Script
#
# This script automates the deployment process to Firebase
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --all              Deploy everything (default)
#   --functions        Deploy only Cloud Functions
#   --hosting          Deploy only Hosting (Next.js)
#   --rules            Deploy only Firestore and Storage rules
#   --firestore        Deploy only Firestore rules
#   --storage          Deploy only Storage rules
#   --help             Show this help message
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI not found"
        echo "Install it with: npm install -g firebase-tools"
        exit 1
    fi
    print_success "Firebase CLI found: $(firebase --version)"
}

# Check if logged in to Firebase
check_firebase_auth() {
    if ! firebase projects:list &> /dev/null; then
        print_error "Not logged in to Firebase"
        echo "Run: firebase login"
        exit 1
    fi
    print_success "Logged in to Firebase"
}

# Build Next.js
build_nextjs() {
    print_header "Building Next.js Application"

    print_info "Installing dependencies..."
    npm install

    print_info "Building Next.js for production..."
    NODE_ENV=production npm run build

    print_success "Next.js build completed"
}

# Build Cloud Functions
build_functions() {
    print_header "Building Cloud Functions"

    cd "$PROJECT_ROOT/functions"

    print_info "Installing function dependencies..."
    npm install

    print_info "Compiling TypeScript..."
    npm run build

    cd "$PROJECT_ROOT"
    print_success "Cloud Functions build completed"
}

# Deploy Firestore rules
deploy_firestore_rules() {
    print_header "Deploying Firestore Rules"

    print_info "Deploying firestore.rules..."
    firebase deploy --only firestore:rules

    print_success "Firestore rules deployed"
}

# Deploy Storage rules
deploy_storage_rules() {
    print_header "Deploying Storage Rules"

    print_info "Deploying storage.rules..."
    firebase deploy --only storage:rules

    print_success "Storage rules deployed"
}

# Deploy Cloud Functions
deploy_functions() {
    print_header "Deploying Cloud Functions"

    build_functions

    print_info "Deploying functions..."
    firebase deploy --only functions

    print_success "Cloud Functions deployed"

    # Print function URLs
    echo ""
    print_info "Function URLs:"
    echo "  feedback-submit: https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/feedback-submit"
    echo "  feedback-upload-complete: https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/feedback-upload-complete"
    echo "  admin-feedback-approve: https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/admin-feedback-approve"
    echo "  admin-feedback-reject: https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/admin-feedback-reject"
}

# Deploy Hosting
deploy_hosting() {
    print_header "Deploying Firebase Hosting"

    build_nextjs

    print_info "Deploying to Firebase Hosting..."
    firebase deploy --only hosting

    print_success "Hosting deployed"

    # Print hosting URL
    echo ""
    print_info "Your site is live at:"
    echo "  https://tourfeedbackhub-474704.web.app"
    echo "  https://tourfeedbackhub-474704.firebaseapp.com"
}

# Deploy all
deploy_all() {
    print_header "Deploying Everything"

    build_functions
    build_nextjs

    print_info "Deploying all Firebase services..."
    firebase deploy

    print_success "Full deployment completed!"

    echo ""
    print_info "Deployment Summary:"
    echo "  ✓ Firestore Rules"
    echo "  ✓ Storage Rules"
    echo "  ✓ Cloud Functions"
    echo "  ✓ Hosting"
    echo ""
    echo "Your site is live at: https://tourfeedbackhub-474704.web.app"
}

# Show help
show_help() {
    cat << EOF
TourFeedbackHub Deployment Script

Usage:
  ./scripts/deploy.sh [options]

Options:
  --all              Deploy everything (default)
  --functions        Deploy only Cloud Functions
  --hosting          Deploy only Hosting (Next.js)
  --rules            Deploy only Firestore and Storage rules
  --firestore        Deploy only Firestore rules
  --storage          Deploy only Storage rules
  --help             Show this help message

Examples:
  ./scripts/deploy.sh                    # Deploy everything
  ./scripts/deploy.sh --functions        # Deploy only functions
  ./scripts/deploy.sh --hosting          # Deploy only hosting
  ./scripts/deploy.sh --rules            # Deploy only security rules

EOF
}

# Pre-deployment checks
pre_deployment_checks() {
    print_header "Pre-deployment Checks"

    check_firebase_cli
    check_firebase_auth

    # Check for .env.local
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found"
        print_info "Make sure to configure environment variables before deploying"
    else
        print_success ".env.local found"
    fi

    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required (current: $(node -v))"
        exit 1
    fi
    print_success "Node.js version: $(node -v)"

    echo ""
}

# Main script
main() {
    print_header "TourFeedbackHub Deployment"
    echo ""

    # Default to deploy all
    DEPLOY_TARGET="all"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                DEPLOY_TARGET="all"
                shift
                ;;
            --functions)
                DEPLOY_TARGET="functions"
                shift
                ;;
            --hosting)
                DEPLOY_TARGET="hosting"
                shift
                ;;
            --rules)
                DEPLOY_TARGET="rules"
                shift
                ;;
            --firestore)
                DEPLOY_TARGET="firestore"
                shift
                ;;
            --storage)
                DEPLOY_TARGET="storage"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Run pre-deployment checks
    pre_deployment_checks

    # Execute deployment based on target
    case $DEPLOY_TARGET in
        all)
            deploy_all
            ;;
        functions)
            deploy_functions
            ;;
        hosting)
            deploy_hosting
            ;;
        rules)
            deploy_firestore_rules
            deploy_storage_rules
            ;;
        firestore)
            deploy_firestore_rules
            ;;
        storage)
            deploy_storage_rules
            ;;
    esac

    echo ""
    print_success "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"
