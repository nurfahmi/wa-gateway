#!/bin/bash

# Test script for sending messages (text, image, file) via WhatsApp Gateway API
# This script uses dev-login for authentication and tests message sending endpoints

BASE_URL="http://localhost:3000"
COOKIE_JAR="cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}WhatsApp Gateway Message Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Clean up cookie jar
rm -f "$COOKIE_JAR"

# Step 1: Login via dev-login
echo -e "${YELLOW}Step 1: Logging in via dev-login...${NC}"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -L -b "$COOKIE_JAR" "$BASE_URL/dev-login" -v 2>&1)
LOGIN_STATUS=$?

# Check if login was successful (should redirect to dashboard)
if [ $LOGIN_STATUS -eq 0 ]; then
    # Check if we got redirected (302) or got dashboard page (200)
    if echo "$LOGIN_RESPONSE" | grep -q "dashboard\|Dashboard" || echo "$LOGIN_RESPONSE" | grep -q "302\|Location"; then
        echo -e "${GREEN}✓ Login successful${NC}"
    else
        echo -e "${YELLOW}⚠ Login response unclear, but continuing...${NC}"
    fi
else
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi

# Show cookies for debugging
echo -e "${YELLOW}Cookies saved:${NC}"
cat "$COOKIE_JAR" | grep -v "^#" | grep -v "^$" || echo "  (no cookies found)"
echo ""

# Step 2: Get connected devices/sessions
echo -e "${YELLOW}Step 2: Fetching connected devices...${NC}"
DEVICES_RESPONSE=$(curl -s -b "$COOKIE_JAR" -L "$BASE_URL/api/whatsapp/sessions" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json")
echo "$DEVICES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DEVICES_RESPONSE"
echo ""

# Extract account ID from response (if available)
ACCOUNT_ID=$(echo "$DEVICES_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', [{}])[0].get('id', ''))" 2>/dev/null)

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" == "None" ]; then
    echo -e "${RED}✗ No connected devices found. Please connect a device first.${NC}"
    echo -e "${YELLOW}You can connect a device by:${NC}"
    echo "  1. Visit $BASE_URL/dashboard"
    echo "  2. Go to Accounts section"
    echo "  3. Create and connect a new device"
    exit 1
fi

echo -e "${GREEN}✓ Found device with ID: $ACCOUNT_ID${NC}"
echo ""

# Get recipient phone number (default or from argument)
RECIPIENT="${1:-+6281234567890}"  # Default test number, or use first argument
echo -e "${YELLOW}Using recipient: $RECIPIENT${NC}"
echo -e "${YELLOW}(You can pass a different number as first argument: ./test-messages.sh +6281234567890)${NC}"
echo ""

# Step 3: Test sending text message
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 1: Sending Text Message${NC}"
echo -e "${BLUE}========================================${NC}"
TEXT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -L -X POST "$BASE_URL/api/whatsapp/messages/send" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"accountId\": $ACCOUNT_ID,
    \"recipient\": \"$RECIPIENT\",
    \"message\": \"Hello! This is a test text message from WhatsApp Gateway API at $(date +'%Y-%m-%d %H:%M:%S')\"
  }")

echo "$TEXT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TEXT_RESPONSE"

if echo "$TEXT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Text message sent successfully${NC}"
else
    echo -e "${RED}✗ Text message failed${NC}"
fi
echo ""

# Wait a bit between messages
sleep 2

# Step 4: Test sending image message
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 2: Sending Image Message${NC}"
echo -e "${BLUE}========================================${NC}"

# Create a simple test image (1x1 pixel PNG) if it doesn't exist
TEST_IMAGE="test-image.png"
if [ ! -f "$TEST_IMAGE" ]; then
    echo -e "${YELLOW}Creating test image...${NC}"
    # Create a simple colored image using ImageMagick or Python
    if command -v convert &> /dev/null; then
        convert -size 200x200 xc:blue "$TEST_IMAGE"
    elif command -v python3 &> /dev/null; then
        python3 << 'EOF'
from PIL import Image
img = Image.new('RGB', (200, 200), color='blue')
img.save('test-image.png')
EOF
    else
        echo -e "${RED}✗ Cannot create test image. Please install ImageMagick or Pillow (Python)${NC}"
        echo -e "${YELLOW}Skipping image test...${NC}"
        TEST_IMAGE=""
    fi
fi

if [ -n "$TEST_IMAGE" ] && [ -f "$TEST_IMAGE" ]; then
    IMAGE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -L -X POST "$BASE_URL/api/whatsapp/messages/send/image" \
      -H "Accept: application/json" \
      -F "accountId=$ACCOUNT_ID" \
      -F "recipient=$RECIPIENT" \
      -F "file=@$TEST_IMAGE" \
      -F "caption=This is a test image sent via WhatsApp Gateway API")

    echo "$IMAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$IMAGE_RESPONSE"

    if echo "$IMAGE_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Image message sent successfully${NC}"
    else
        echo -e "${RED}✗ Image message failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping image test (no test image available)${NC}"
fi
echo ""

# Wait a bit between messages
sleep 2

# Step 5: Test sending document/file message
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test 3: Sending Document/File Message${NC}"
echo -e "${BLUE}========================================${NC}"

# Create a simple test document
TEST_DOC="test-document.txt"
echo "This is a test document sent via WhatsApp Gateway API" > "$TEST_DOC"
echo "Sent at: $(date)" >> "$TEST_DOC"

DOC_RESPONSE=$(curl -s -b "$COOKIE_JAR" -L -X POST "$BASE_URL/api/whatsapp/messages/send/document" \
  -H "Accept: application/json" \
  -F "accountId=$ACCOUNT_ID" \
  -F "recipient=$RECIPIENT" \
  -F "file=@$TEST_DOC" \
  -F "fileName=test-document.txt")

echo "$DOC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DOC_RESPONSE"

if echo "$DOC_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Document message sent successfully${NC}"
else
    echo -e "${RED}✗ Document message failed${NC}"
fi
echo ""

# Cleanup test files
rm -f "$TEST_DOC"
if [ -f "$TEST_IMAGE" ] && [ "$TEST_IMAGE" == "test-image.png" ]; then
    # Only remove if we created it (not if user had their own)
    rm -f "$TEST_IMAGE"
fi

# Step 6: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Device ID: ${GREEN}$ACCOUNT_ID${NC}"
echo -e "Recipient: ${GREEN}$RECIPIENT${NC}"
echo -e "Base URL: ${GREEN}$BASE_URL${NC}"
echo ""
echo -e "${YELLOW}To test with a different recipient:${NC}"
echo "  ./test-messages.sh +6281234567890"
echo ""
echo -e "${YELLOW}To check message logs:${NC}"
echo "  curl -b $COOKIE_JAR '$BASE_URL/api/whatsapp/messages?limit=10'"
echo ""

# Clean up cookie jar
rm -f "$COOKIE_JAR"

echo -e "${GREEN}Testing completed!${NC}"

