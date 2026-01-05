#!/usr/bin/env node
/**
 * Test script for sending messages (text, image, file) via WhatsApp Gateway API
 * Uses dev-login for authentication and tests message sending endpoints
 * 
 * Usage: node test_messages_node.js [recipient_phone_number]
 * Example: node test_messages_node.js +6281234567890
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const recipient = process.argv[2] || '+6281234567890';

// Colors for terminal output
const Colors = {
  GREEN: '\033[0;32m',
  RED: '\033[0;31m',
  YELLOW: '\033[1;33m',
  BLUE: '\033[0;34m',
  CYAN: '\033[0;36m',
  NC: '\033[0m'
};

function printHeader(text) {
  console.log(`\n${Colors.BLUE}${'='.repeat(50)}${Colors.NC}`);
  console.log(`${Colors.BLUE}${text}${Colors.NC}`);
  console.log(`${Colors.BLUE}${'='.repeat(50)}${Colors.NC}\n`);
}

function printSuccess(text) {
  console.log(`${Colors.GREEN}✓ ${text}${Colors.NC}`);
}

function printError(text) {
  console.log(`${Colors.RED}✗ ${text}${Colors.NC}`);
}

function printInfo(text) {
  console.log(`${Colors.YELLOW}ℹ ${text}${Colors.NC}`);
}

function printStep(text) {
  console.log(`${Colors.CYAN}→ ${text}${Colors.NC}`);
}

// Simple HTTP client with cookie support
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
    this.parsedUrl = new URL(baseUrl);
  }

  parseCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    headers.forEach(header => {
      const parts = header.split(';')[0].split('=');
      if (parts.length === 2) {
        this.cookies[parts[0].trim()] = parts[1].trim();
      }
    });
  }

  getCookieHeader() {
    return Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers = {
        'User-Agent': 'WhatsApp-Gateway-Test-Script/1.0',
        ...options.headers
      };

      // Add cookies if available
      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        ...options.httpOptions
      };

      const req = client.request(requestOptions, (res) => {
        // Parse cookies from response
        if (res.headers['set-cookie']) {
          this.parseCookies(res.headers['set-cookie']);
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data,
              isHtml: true
            });
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }

      req.end();
    });
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, options) {
    return this.request('POST', path, { ...options, method: 'POST' });
  }
}

async function devLogin(client) {
  printStep('Logging in via dev-login...');
  try {
    const response = await client.get('/dev-login', {
      headers: {
        'Accept': 'text/html,application/json'
      },
      httpOptions: {
        maxRedirects: 5
      }
    });

    if (response.statusCode === 200 || response.statusCode === 302) {
      printSuccess('Login successful');
      return true;
    } else {
      printError(`Login failed with status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    printError(`Login error: ${error.message}`);
    return false;
  }
}

async function getDevices(client) {
  printStep('Fetching connected devices...');
  try {
    const response = await client.get('/api/whatsapp/sessions', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.success && response.data.data) {
      const devices = response.data.data;
      if (devices.length > 0) {
        const device = devices[0];
        const accountId = device.id;
        const accountName = device.name || 'Unknown';
        const accountStatus = device.status || 'Unknown';
        printSuccess(`Found device: ${accountName} (ID: ${accountId}, Status: ${accountStatus})`);
        return [accountId, device];
      } else {
        printError('No devices found in response');
        return [null, null];
      }
    } else {
      printError('No connected devices found');
      if (response.data.error) {
        printError(`Error: ${response.data.error}`);
      }
      return [null, null];
    }
  } catch (error) {
    printError(`Error fetching devices: ${error.message}`);
    return [null, null];
  }
}

async function sendTextMessage(client, accountId, recipient) {
  printStep(`Sending text message to ${recipient}...`);
  try {
    const response = await client.post('/api/whatsapp/messages/send', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        accountId: accountId,
        recipient: recipient,
        message: `Hello! This is a test text message from WhatsApp Gateway API at ${new Date().toISOString()}`
      }
    });

    console.log(JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.success) {
      printSuccess('Text message sent successfully');
      return true;
    } else {
      printError(`Text message failed: ${response.data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    printError(`Error sending text message: ${error.message}`);
    return false;
  }
}

async function sendImageMessage(client, accountId, recipient) {
  printStep(`Sending image message to ${recipient}...`);
  printInfo('Note: Image upload requires multipart/form-data which is complex in Node.js');
  printInfo('Please use the bash script (test-messages.sh) or Python script (test_messages.py) for image/file testing');
  return false;
}

async function sendDocumentMessage(client, accountId, recipient) {
  printStep(`Sending document message to ${recipient}...`);
  printInfo('Note: Document upload requires multipart/form-data which is complex in Node.js');
  printInfo('Please use the bash script (test-messages.sh) or Python script (test_messages.py) for image/file testing');
  return false;
}

async function main() {
  printHeader('WhatsApp Gateway Message Testing');

  const client = new HttpClient(BASE_URL);

  // Login
  if (!await devLogin(client)) {
    printError('Failed to login. Make sure dev-login is enabled (NODE_ENV=development)');
    process.exit(1);
  }

  // Get devices
  const [accountId, deviceInfo] = await getDevices(client);
  if (!accountId) {
    printError('No connected devices found');
    printInfo('Please connect a device first:');
    printInfo(`  1. Visit ${BASE_URL}/dashboard`);
    printInfo('  2. Go to Accounts section');
    printInfo('  3. Create and connect a new device');
    process.exit(1);
  }

  printInfo(`Using recipient: ${recipient}`);
  printInfo('(You can pass a different number as argument: node test_messages_node.js +6281234567890)');

  const results = [];

  // Test 1: Text message
  printHeader('Test 1: Sending Text Message');
  results.push(['Text Message', await sendTextMessage(client, accountId, recipient)]);

  // Wait a bit between messages
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Image message (skipped - use bash/Python script)
  printHeader('Test 2: Sending Image Message');
  results.push(['Image Message', await sendImageMessage(client, accountId, recipient)]);

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Document message (skipped - use bash/Python script)
  printHeader('Test 3: Sending Document Message');
  results.push(['Document Message', await sendDocumentMessage(client, accountId, recipient)]);

  // Summary
  printHeader('Test Summary');
  console.log(`Device ID: ${Colors.GREEN}${accountId}${Colors.NC}`);
  console.log(`Device Name: ${Colors.GREEN}${deviceInfo?.name || 'Unknown'}${Colors.NC}`);
  console.log(`Device Status: ${Colors.GREEN}${deviceInfo?.status || 'Unknown'}${Colors.NC}`);
  console.log(`Recipient: ${Colors.GREEN}${recipient}${Colors.NC}`);
  console.log(`Base URL: ${Colors.GREEN}${BASE_URL}${Colors.NC}`);
  console.log();

  console.log('Results:');
  results.forEach(([testName, success]) => {
    const status = success ? `${Colors.GREEN}✓ PASSED${Colors.NC}` : `${Colors.YELLOW}⚠ SKIPPED${Colors.NC}`;
    console.log(`  ${testName}: ${status}`);
  });

  console.log();
  printInfo('For image and file testing, use:');
  printInfo('  - Bash: ./test-messages.sh');
  printInfo('  - Python: python3 test_messages.py (requires: pip install requests pillow)');

  // Exit with error if text message failed
  if (!results[0][1]) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    printError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { HttpClient, devLogin, getDevices, sendTextMessage };

