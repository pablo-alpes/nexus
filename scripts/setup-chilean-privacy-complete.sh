#!/bin/bash

# Complete setup script for Chilean Privacy
# This script sets up everything needed for Chilean Privacy:
# 1. Imports requirements
# 2. Creates controls from ISO 27701
# 3. Adds ISO 27002 controls
# 4. Maps requirements to controls
# 5. Precomputes question→requirement mappings

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo -e "\n${BLUE}🚀 Starting Complete Chilean Privacy Setup...${NC}\n"
echo "This will set up:"
echo "  1. Requirements (from Chilean Privacy Law)"
echo "  2. Controls (from ISO 27701 and ISO 27002)"
echo "  3. Requirement→Control mappings"
echo "  4. Question→Requirement mappings (NLP-based)"
echo ""

# Function to run a step
run_step() {
    local step_num=$1
    local description=$2
    local command=$3
    
    echo -e "\n${BLUE}$(printf '=%.0s' {1..60})${NC}"
    echo -e "${BLUE}📦 Step $step_num: $description${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}\n"
    
    if eval "$command"; then
        echo -e "\n${GREEN}✅ Step $step_num: $description - Complete${NC}\n"
        return 0
    else
        echo -e "\n${RED}❌ Step $step_num: $description - Failed${NC}\n"
        return 1
    fi
}

# Track success/failure
SUCCESS_COUNT=0
FAILED_STEPS=()

# Step 1: Import requirements
if run_step "1" "Importing Chilean Privacy requirements" "npx tsx scripts/import-chilean-privacy-requirements.js"; then
    ((SUCCESS_COUNT++))
else
    FAILED_STEPS+=("Step 1: Importing requirements")
fi

# Step 2: Create controls from ISO 27701
if run_step "2" "Creating controls from ISO 27701" "npx tsx scripts/create-chilean-privacy-controls.js"; then
    ((SUCCESS_COUNT++))
else
    FAILED_STEPS+=("Step 2: Creating controls")
fi

# Step 3: Add ISO 27002 controls
if run_step "3" "Adding ISO 27002 controls" "npx tsx scripts/add-iso27002-controls-chilean-privacy.js"; then
    ((SUCCESS_COUNT++))
else
    FAILED_STEPS+=("Step 3: Adding ISO 27002 controls")
fi

# Step 4: Map requirements to controls
if run_step "4" "Mapping requirements to controls" "npx tsx scripts/map-chilean-privacy-requirements-to-controls.js"; then
    ((SUCCESS_COUNT++))
else
    FAILED_STEPS+=("Step 4: Mapping requirements to controls")
fi

# Step 5: Precompute question→requirement mappings
if run_step "5" "Precomputing question→requirement mappings" "npm run precompute:mappings:privacy"; then
    ((SUCCESS_COUNT++))
else
    FAILED_STEPS+=("Step 5: Precomputing mappings")
fi

# Summary
echo -e "\n${BLUE}$(printf '=%.0s' {1..60})${NC}"
echo -e "${BLUE}📊 Setup Summary${NC}"
echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
echo -e "${GREEN}✅ Completed: $SUCCESS_COUNT/5 steps${NC}"

if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ Failed steps:${NC}"
    for step in "${FAILED_STEPS[@]}"; do
        echo -e "   ${RED}- $step${NC}"
    done
    echo -e "\n${YELLOW}⚠️  Some steps failed. Please review the errors above.${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ All steps completed successfully!${NC}"
    echo -e "\n${GREEN}🎉 Chilean Privacy setup is complete!${NC}"
    echo "   You can now:"
    echo "   - Answer the questionnaire"
    echo "   - Generate gap analysis"
    echo "   - View applicable controls"
    echo ""
    exit 0
fi
