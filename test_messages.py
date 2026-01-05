#!/usr/bin/env python3
"""
Test script for sending messages (text, image, file) via WhatsApp Gateway API
Uses dev-login for authentication and tests message sending endpoints
"""

import requests
import json
import sys
import os
from datetime import datetime
from io import BytesIO
from PIL import Image

BASE_URL = "http://localhost:3000"
SESSION = requests.Session()

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*50}{Colors.NC}")
    print(f"{Colors.BLUE}{text}{Colors.NC}")
    print(f"{Colors.BLUE}{'='*50}{Colors.NC}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.NC}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.NC}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ {text}{Colors.NC}")

def print_step(text):
    print(f"{Colors.CYAN}→ {text}{Colors.NC}")

def check_server():
    """Check if server is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            return True
    except:
        pass
    return False

def dev_login():
    """Login via dev-login endpoint"""
    print_step("Logging in via dev-login...")
    try:
        response = SESSION.get(f"{BASE_URL}/dev-login", allow_redirects=True, timeout=10)
        if response.status_code in [200, 302]:
            print_success("Login successful")
            return True
        else:
            print_error(f"Login failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return False

def get_devices():
    """Get connected devices/sessions"""
    print_step("Fetching connected devices...")
    try:
        response = SESSION.get(f"{BASE_URL}/api/whatsapp/sessions", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2))
            
            if data.get('success') and data.get('data'):
                devices = data['data']
                if len(devices) > 0:
                    account_id = devices[0].get('id')
                    account_name = devices[0].get('name', 'Unknown')
                    account_status = devices[0].get('status', 'Unknown')
                    print_success(f"Found device: {account_name} (ID: {account_id}, Status: {account_status})")
                    return account_id, devices[0]
                else:
                    print_error("No devices found in response")
                    return None, None
            else:
                print_error("No connected devices found")
                return None, None
        else:
            print_error(f"Failed to get devices: {response.status_code}")
            print(response.text)
            return None, None
    except Exception as e:
        print_error(f"Error fetching devices: {str(e)}")
        return None, None

def send_text_message(account_id, recipient):
    """Send a text message"""
    print_step(f"Sending text message to {recipient}...")
    try:
        payload = {
            "accountId": account_id,
            "recipient": recipient,
            "message": f"Hello! This is a test text message from WhatsApp Gateway API at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        }
        response = SESSION.post(
            f"{BASE_URL}/api/whatsapp/messages/send",
            json=payload,
            timeout=30
        )
        
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_success("Text message sent successfully")
                return True
            else:
                print_error(f"Text message failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print_error(f"Text message failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error sending text message: {str(e)}")
        return False

def create_test_image():
    """Create a simple test image"""
    try:
        img = Image.new('RGB', (200, 200), color='blue')
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes, 'test-image.png'
    except Exception as e:
        print_error(f"Cannot create test image: {str(e)}")
        return None, None

def send_image_message(account_id, recipient):
    """Send an image message"""
    print_step(f"Sending image message to {recipient}...")
    try:
        img_bytes, filename = create_test_image()
        if not img_bytes:
            print_info("Skipping image test (could not create test image)")
            return False
        
        files = {
            'file': (filename, img_bytes, 'image/png')
        }
        data = {
            'accountId': account_id,
            'recipient': recipient,
            'caption': 'This is a test image sent via WhatsApp Gateway API'
        }
        
        response = SESSION.post(
            f"{BASE_URL}/api/whatsapp/messages/send/image",
            files=files,
            data=data,
            timeout=30
        )
        
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_success("Image message sent successfully")
                return True
            else:
                print_error(f"Image message failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print_error(f"Image message failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error sending image message: {str(e)}")
        return False

def create_test_document():
    """Create a simple test document"""
    content = f"""This is a test document sent via WhatsApp Gateway API
Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This document is used to test the file/document sending functionality.
"""
    return BytesIO(content.encode('utf-8')), 'test-document.txt'

def send_document_message(account_id, recipient):
    """Send a document/file message"""
    print_step(f"Sending document message to {recipient}...")
    try:
        doc_bytes, filename = create_test_document()
        
        files = {
            'file': (filename, doc_bytes, 'text/plain')
        }
        data = {
            'accountId': account_id,
            'recipient': recipient,
            'fileName': filename
        }
        
        response = SESSION.post(
            f"{BASE_URL}/api/whatsapp/messages/send/document",
            files=files,
            data=data,
            timeout=30
        )
        
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_success("Document message sent successfully")
                return True
            else:
                print_error(f"Document message failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print_error(f"Document message failed with status {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print_error(f"Error sending document message: {str(e)}")
        return False

def main():
    recipient = sys.argv[1] if len(sys.argv) > 1 else "+6281234567890"
    
    print_header("WhatsApp Gateway Message Testing")
    
    # Check server
    print_step("Checking if server is running...")
    if not check_server():
        print_error("Server is not running or not accessible")
        print_info(f"Please start the server first: npm run dev")
        sys.exit(1)
    print_success("Server is running")
    
    # Login
    if not dev_login():
        print_error("Failed to login. Make sure dev-login is enabled (NODE_ENV=development)")
        sys.exit(1)
    
    # Get devices
    account_id, device_info = get_devices()
    if not account_id:
        print_error("No connected devices found")
        print_info("Please connect a device first:")
        print_info(f"  1. Visit {BASE_URL}/dashboard")
        print_info("  2. Go to Accounts section")
        print_info("  3. Create and connect a new device")
        sys.exit(1)
    
    print_info(f"Using recipient: {recipient}")
    print_info("(You can pass a different number as argument: python3 test_messages.py +6281234567890)")
    
    results = []
    
    # Test 1: Text message
    print_header("Test 1: Sending Text Message")
    results.append(("Text Message", send_text_message(account_id, recipient)))
    
    import time
    time.sleep(2)
    
    # Test 2: Image message
    print_header("Test 2: Sending Image Message")
    results.append(("Image Message", send_image_message(account_id, recipient)))
    
    time.sleep(2)
    
    # Test 3: Document message
    print_header("Test 3: Sending Document Message")
    results.append(("Document Message", send_document_message(account_id, recipient)))
    
    # Summary
    print_header("Test Summary")
    print(f"Device ID: {Colors.GREEN}{account_id}{Colors.NC}")
    print(f"Device Name: {Colors.GREEN}{device_info.get('name', 'Unknown')}{Colors.NC}")
    print(f"Device Status: {Colors.GREEN}{device_info.get('status', 'Unknown')}{Colors.NC}")
    print(f"Recipient: {Colors.GREEN}{recipient}{Colors.NC}")
    print(f"Base URL: {Colors.GREEN}{BASE_URL}{Colors.NC}")
    print()
    
    print("Results:")
    for test_name, success in results:
        status = f"{Colors.GREEN}✓ PASSED{Colors.NC}" if success else f"{Colors.RED}✗ FAILED{Colors.NC}"
        print(f"  {test_name}: {status}")
    
    print()
    print_info("To check message logs:")
    print(f"  curl -b cookies.txt '{BASE_URL}/api/whatsapp/messages?limit=10'")
    
    # Exit with error if any test failed
    if not all(result[1] for result in results):
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)



