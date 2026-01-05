# System Architecture

## Overview

WhatsApp Gateway SaaS is a multi-tenant, provider-agnostic WhatsApp messaging platform with OAuth authentication.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Membership System                    │
│                         (OAuth Provider)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ OAuth 2.0 Flow
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WhatsApp Gateway SaaS                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Presentation Layer                     │  │
│  │  ┌────────────────┐          ┌────────────────┐          │  │
│  │  │   Dashboard    │          │   REST API     │          │  │
│  │  │   (EJS+CSS)    │          │   (Express)    │          │  │
│  │  └────────────────┘          └────────────────┘          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Middleware Layer                        │  │
│  │  • OAuth Verification  • API Key Auth  • Rate Limiting    │  │
│  │  • Validation  • Error Handling  • Workspace Context      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Business Logic Layer                    │  │
│  │  • WorkspaceService  • AccountService                     │  │
│  │  • MessageService  • WebhookService  • EventHandler       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Provider Abstraction Layer                   │  │
│  │                 (WhatsAppProvider Interface)              │  │
│  └──────────────┬────────────────────┬─────────────────────┘  │
│                 │                     │                          │
│      ┌──────────▼──────────┐   ┌────▼──────────┐             │
│      │  Baileys Provider   │   │ Official API  │ (Phase 3)   │
│      │    (Phase 1)        │   │  Provider     │             │
│      └──────────┬──────────┘   └────┬──────────┘             │
│                 │                     │                          │
└─────────────────┼─────────────────────┼──────────────────────────┘
                  │                     │
                  ▼                     ▼
         ┌─────────────────┐   ┌──────────────────┐
         │   WhatsApp Web  │   │  Meta Cloud API  │
         │   (Unofficial)  │   │    (Official)    │
         └─────────────────┘   └──────────────────┘
                  │                     │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼───────────┐
                  │   MySQL Database     │
                  │  • workspaces        │
                  │  • workspace_users   │
                  │  • whatsapp_accounts │
                  │  • message_logs      │
                  │  • api_keys          │
                  │  • webhook_configs   │
                  │  • rate_limits       │
                  └──────────────────────┘
```

## Layer Responsibilities

### Presentation Layer

**Dashboard (EJS + Tailwind CSS)**
- User interface for workspace management
- Account connection with QR display
- Message logs and statistics
- API key management

**REST API (Express.js)**
- RESTful endpoints for programmatic access
- JSON request/response format
- OAuth and API key authentication

### Middleware Layer

**OAuth Middleware**
- Verifies OAuth tokens from membership system
- Extracts user information
- Auto-creates workspace on first login

**API Key Middleware**
- Validates API keys for server-to-server auth
- Hashes keys for comparison (SHA-256)
- Updates last used timestamp

**Rate Limiter**
- Enforces per-workspace rate limits
- Based on subscription tier
- Per-minute window tracking

**Validator**
- Input validation using express-validator
- Phone number format validation (E.164)
- Request payload validation

**Error Handler**
- Global error catching
- Standardized error responses
- Environment-aware error details

**Workspace Context**
- Resolves workspace from user/API key
- Attaches workspace to request object
- Enforces workspace isolation

### Business Logic Layer

**WorkspaceService**
- Workspace creation and management
- Subscription tier management
- Device limit enforcement
- Workspace statistics

**AccountService**
- WhatsApp account lifecycle
- Provider initialization
- QR code management
- Connection monitoring

**MessageService**
- Message sending (text, media)
- Message logging
- Status tracking
- Message statistics

**WebhookService**
- Webhook configuration
- Payload delivery with signatures
- Failure handling and retry
- Auto-disable after failures

**EventHandlerService**
- Centralized event processing
- Event normalization
- Database logging
- Webhook triggering

### Provider Abstraction Layer

**WhatsAppProvider Interface**
- Defines provider contract
- Methods: initialize, sendText, sendMedia, getStatus, disconnect, setupEventListeners
- Returns normalized responses

**BaileysProvider**
- Implements provider interface for Baileys
- QR-based connection
- Session management
- Event normalization

**OfficialProvider (Phase 3)**
- Will implement same interface
- Credential-based connection
- Meta webhook handling
- Same normalized output

## Data Flow

### User Login Flow

```
1. User clicks "Login" → Redirect to OAuth server
2. OAuth server authenticates user
3. Redirect back with authorization code
4. Exchange code for access token
5. Introspect token to get user info
6. Find or create workspace for user
7. Create workspace_user mapping
8. Store tokens in session
9. Redirect to dashboard
```

### Message Sending Flow

```
1. Client makes API request (OAuth token or API key)
2. Authentication middleware validates credentials
3. Workspace context middleware resolves workspace
4. Rate limiter checks limits
5. Validator validates request payload
6. Controller calls MessageService
7. MessageService gets account and provider
8. Provider sends message to WhatsApp
9. MessageService logs to database
10. Response returned to client
```

### Incoming Message Flow

```
1. WhatsApp sends message to Baileys socket
2. Baileys emits raw message event
3. Event normalizer transforms to standard format
4. Event handler processes normalized event
5. Message logged to database
6. Webhook service delivers to customer URL
7. Webhook signature verified by customer
```

## Security Architecture

### Authentication Flow

```
External OAuth Provider (Trusted)
         │
         │ OAuth Access Token (JWT or Opaque)
         │
         ▼
   OAuth Middleware
   • Introspect token with OAuth server
   • Verify token is active
   • Extract user claims
   • NO password validation
   • NO user registration
         │
         ▼
   Workspace Context
   • Map user to workspace
   • Enforce workspace isolation
   • Check workspace is active
         │
         ▼
   Application Logic
```

### API Key Flow

```
Client Application
         │
         │ X-API-Key: gw_live_abc123...
         │
         ▼
   API Key Middleware
   • Hash provided key (SHA-256)
   • Lookup hash in database
   • Verify key is active
   • Check expiration
         │
         ▼
   Workspace Context
   • Get workspace from key
   • Check workspace is active
         │
         ▼
   Application Logic
```

### Webhook Security

```
Gateway generates webhook payload
         │
         ▼
HMAC-SHA256 signature generated
         │
         ▼
HTTP POST to customer URL
Headers:
  - X-Webhook-Signature
  - X-Webhook-Event
         │
         ▼
Customer verifies signature
         │
         ▼
Process webhook payload
```

## Database Architecture

### Schema Design Principles

1. **Multi-Tenancy:** All tables include `workspace_id` for isolation
2. **Foreign Keys:** Maintain referential integrity
3. **Indexes:** Optimize query performance
4. **Timestamps:** Track creation and updates
5. **JSON Fields:** Store provider-specific config

### Key Relationships

```
workspaces (1) ──→ (N) workspace_users
workspaces (1) ──→ (N) whatsapp_accounts  
workspaces (1) ──→ (N) message_logs
workspaces (1) ──→ (N) api_keys
workspaces (1) ──→ (1) webhook_configs

whatsapp_accounts (1) ──→ (N) message_logs
```

## Scalability Considerations

### Horizontal Scaling

- **Stateless API:** No server-side state (except sessions)
- **PM2 Cluster Mode:** Multiple Node.js processes
- **Load Balancer:** Nginx distributes traffic
- **Database Connection Pool:** Reuse connections

### Vertical Scaling

- **Database Indexes:** Fast queries at scale
- **Message Log Retention:** Auto-cleanup old messages
- **Rate Limiting:** Protect resources
- **Efficient Queries:** Pagination, filtering

### Provider Isolation

- **No Shared State:** Each provider instance independent
- **Session Per Account:** Baileys sessions isolated
- **Async Operations:** Non-blocking I/O

## Performance Optimization

1. **Database Connection Pooling**
2. **Index Optimization**
3. **Message Log Pagination**
4. **Static Asset Caching**
5. **Nginx Reverse Proxy**
6. **PM2 Cluster Mode**
7. **Async/Await Pattern**

## Monitoring & Observability

1. **Health Check Endpoint:** `/health`
2. **Winston Logging:** Structured logs
3. **PM2 Monitoring:** Process metrics
4. **Database Queries:** Slow query log
5. **Rate Limit Headers:** Client visibility
6. **Error Tracking:** Centralized logging

## Future Enhancements (Phase 2 & 3)

### Phase 2: Core Hardening
- Bull queue for message reliability
- Advanced analytics dashboard
- Multi-user workspace management
- Message scheduling

### Phase 3: Official WhatsApp API
- OfficialProvider implementation
- Template message support
- Business verification
- Higher rate limits

### Phase 4: Advanced Features
- AI auto-reply
- Contact management
- Campaign builder
- Analytics & reporting

