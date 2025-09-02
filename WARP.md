# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Testing
```bash
# Run all tests
npm test

# Run tests in CI mode with coverage
npm run test:ci

# Run tests in watch mode  
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run feature-specific tests
npm run test:auth        # Auth feature tests
npm run test:dashboard   # Dashboard feature tests
npm run test:shared      # Shared utilities tests
npm run test:ai-agent    # AI agent tests
```

### Cron Job Testing
```bash
# Test availability rollover cron job locally
npx ts-node app/api/cron/availability-rollover/test-cron.ts

# Test cron endpoint manually
curl -X GET http://localhost:3000/api/cron/availability-rollover \
  -H "Authorization: Bearer your_cron_secret_here"
```

## Architecture Overview

### Project Structure
This is a **Next.js 15** application using the **App Router** with feature-based organization:

- **`app/`** - Next.js App Router pages and API routes
  - Uses App Router for routing, layouts, and server components
  - API routes in `/api/` including voice webhooks and cron jobs
  - Auth pages with Supabase integration

- **`features/`** - Feature modules organized by domain
  - **`auth/`** - Authentication components and logic
  - **`dashboard/`** - User dashboard functionality  
  - **`scheduling/`** - Availability management and booking logic
  - **`agent/`** - AI agent with voice capabilities (Twilio + Google AI)
  - **`shared/`** - Shared components, utilities, and database layer

### Key Technologies
- **Next.js 15** with App Router and React 19
- **Supabase** for authentication and database
- **TypeScript** with strict type checking
- **Tailwind CSS** + **shadcn/ui** components
- **Google Generative AI** (Gemini) for LLM capabilities
- **Twilio** for voice calling functionality
- **AssemblyAI** for speech-to-text
- **Cartesia** for text-to-speech
- **Jest** + **React Testing Library** for testing

### Database Architecture
Multi-client Supabase setup via `DatabaseClientFactory`:
- **Admin Client**: Full database access (tests, admin operations)
- **Server Client**: Server-side with user authentication  
- **Browser Client**: Client-side with user authentication
- Automatic client type detection based on environment

### AI Agent System
The AI agent combines multiple services:
- **LLM**: Google Gemini 1.5 Flash for conversation processing
- **Voice**: Twilio for phone calls with TwiML responses
- **Speech Processing**: Handles inbound calls, processes speech with AI, responds with synthesized speech
- **Availability Management**: Complex scheduling system with timezone-aware availability rollover

### Feature Module Pattern
Each feature exports components and types through index files:
- Clean separation between client and server code
- Explicit exports to avoid server/client conflicts
- Feature-specific test organization matching module structure

## Key Configuration Files

### Environment Variables Required
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services  
GOOGLE_AI_API_KEY=your_google_ai_key

# Voice Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
NGROK_URL=your_ngrok_url_for_webhooks

# Cron Security
CRON_SECRET=secure_random_string
```

### Testing Configuration
- **Jest** configured with jsdom environment
- Module name mapping for `@/features/...` and `@/app/...` paths
- Coverage collection from features and app directories
- Separate test environments via `.env.test`
- Sequential test execution for database tests (`maxWorkers: 1`)

### Path Resolution
TypeScript paths configured for clean imports:
- `@/features/*` → `features/*`
- `@/app/*` → `app/*` 
- `@/*` → `*` (root)

## Development Patterns

### Feature Organization
When adding new features:
1. Create feature directory under `features/`
2. Include `index.ts` with explicit exports
3. Organize components, types, and utilities within feature
4. Add feature-specific test script to package.json
5. Follow the established client/server separation patterns

### Database Queries
Use `DatabaseClientFactory.getClient()` for automatic client selection:
```typescript
// Auto-detects appropriate client type
const client = await DatabaseClientFactory.getClient();

// Or specify client type explicitly
const adminClient = await DatabaseClientFactory.getAdminClient();
```

### API Routes
Voice webhook endpoints follow TwiML response patterns:
- `/api/voice/twilio-webhook` - Handles incoming calls
- `/api/voice/twilio-speech` - Processes speech input with AI
- Include proper error handling and XML content-type headers

### Availability System
The scheduling system uses:
- UTC timestamps for all date/time storage
- Timezone-aware business logic via `DateUtils`
- Automated rollover via cron job ensuring 30-day availability window
- Complex availability aggregation across multiple providers

## Cron Jobs

### Availability Rollover
- **Schedule**: Every hour (`0 * * * *`)
- **Purpose**: Maintain 30-day rolling availability window per business
- **Security**: Requires `CRON_SECRET` in Authorization header
- **Endpoint**: `/api/cron/availability-rollover`
- **Configuration**: Managed via `vercel.json`

The rollover system finds businesses at midnight in their timezone and ensures availability slots are properly maintained with old dates cleaned up and future dates generated.
