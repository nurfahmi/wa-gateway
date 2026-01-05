const express = require('express');
const router = express.Router();
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * OAuth Configuration Diagnostic Endpoint
 * Helps debug OAuth redirect issues
 * Access: http://localhost:4000/auth/debug
 */
router.get('/debug', (req, res) => {
  const oauthConfig = config.oauth;
  const appConfig = config.app;
  
  // Build expected redirect URL
  const expectedRedirectUri = oauthConfig.redirectUri;
  const currentUrl = `${req.protocol}://${req.get('host')}`;
  const callbackPath = '/auth/callback';
  const expectedCallbackUrl = `${currentUrl}${callbackPath}`;
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    currentAppUrl: currentUrl,
    appPort: appConfig.port,
    oauth: {
      serverUrl: oauthConfig.serverUrl || 'NOT SET',
      clientId: oauthConfig.clientId ? oauthConfig.clientId.substring(0, 10) + '...' : 'NOT SET',
      clientSecret: oauthConfig.clientSecret ? '***SET***' : 'NOT SET',
      redirectUri: expectedRedirectUri || 'NOT SET',
      redirectUriMatches: expectedRedirectUri === expectedCallbackUrl
    },
    expectedCallbackUrl: expectedCallbackUrl,
    session: {
      hasSession: !!req.session,
      sessionId: req.session?.id || 'none',
      hasOAuthState: !!req.session?.oauthState,
      oauthState: req.session?.oauthState ? req.session.oauthState.substring(0, 10) + '...' : 'none'
    },
    issues: []
  };

  // Check for issues
  if (!oauthConfig.serverUrl) {
    diagnostics.issues.push('❌ AUTH_SERVER_URL is not set');
  }
  if (!oauthConfig.clientId) {
    diagnostics.issues.push('❌ OAUTH_CLIENT_ID is not set');
  }
  if (!oauthConfig.clientSecret) {
    diagnostics.issues.push('❌ OAUTH_CLIENT_SECRET is not set');
  }
  if (!oauthConfig.redirectUri) {
    diagnostics.issues.push('❌ OAUTH_REDIRECT_URI is not set');
  } else if (oauthConfig.redirectUri !== expectedCallbackUrl) {
    diagnostics.issues.push(`⚠️  OAUTH_REDIRECT_URI mismatch!`);
    diagnostics.issues.push(`   Configured: ${oauthConfig.redirectUri}`);
    diagnostics.issues.push(`   Expected:   ${expectedCallbackUrl}`);
    diagnostics.issues.push(`   Fix: Update OAUTH_REDIRECT_URI in .env to match exactly`);
  }

  // Render diagnostic page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Configuration Diagnostics</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }
        .issue { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .error { background: #fee; border-left: 4px solid #f00; }
        .warning { background: #ffe; border-left: 4px solid #fa0; }
        .success { background: #efe; border-left: 4px solid #0a0; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 2px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔍 OAuth Configuration Diagnostics</h1>
        
        <div class="section">
          <h2>Current Configuration</h2>
          <pre>${JSON.stringify(diagnostics, null, 2)}</pre>
        </div>

        ${diagnostics.issues.length > 0 ? `
          <div class="section">
            <h2>⚠️ Issues Found</h2>
            ${diagnostics.issues.map(issue => `
              <div class="issue ${issue.startsWith('❌') ? 'error' : 'warning'}">${issue}</div>
            `).join('')}
          </div>
        ` : `
          <div class="section">
            <div class="issue success">✅ Configuration looks good!</div>
          </div>
        `}

        <div class="section">
          <h2>📋 Checklist for OAuth Provider</h2>
          <p>Make sure your OAuth provider has these settings:</p>
          <ul>
            <li><strong>Redirect URI:</strong> <code>${expectedCallbackUrl}</code></li>
            <li><strong>Client ID:</strong> <code>${oauthConfig.clientId || 'NOT SET'}</code></li>
            <li><strong>Client Secret:</strong> <code>*** (configured)</code></li>
            <li><strong>Scopes:</strong> <code>profile email subscriptions</code></li>
          </ul>
        </div>

        <div class="section">
          <h2>🧪 Test Links</h2>
          <p><a href="/auth/login">Test OAuth Login</a></p>
          <p><a href="/">Go Home</a></p>
        </div>

        <div class="section">
          <h2>📝 Next Steps</h2>
          <ol>
            <li>Verify <code>OAUTH_REDIRECT_URI</code> in your <code>.env</code> file matches: <code>${expectedCallbackUrl}</code></li>
            <li>Verify the same redirect URI is registered in your OAuth provider</li>
            <li>Check that your OAuth provider is accessible from this server</li>
            <li>Check server logs for detailed error messages</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;

