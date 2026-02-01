# Separate Websites Setup

This document describes how to run the two separate websites for DORA and Chilean Privacy.

## Architecture

Two completely separate websites:
- **DORA Compliance**: Port 3000 (default)
- **Chilean Privacy**: Port 3001

No shared home page, no regulation selector tabs - each is a standalone application.

## Running the Websites

### Option 1: Run Both Simultaneously (Different Terminals)

**Terminal 1 - DORA:**
```bash
npm run dev:dora
# Runs on http://localhost:3000
```

**Terminal 2 - Chilean Privacy:**
```bash
npm run dev:privacy
# Runs on http://localhost:3001
```

### Option 2: Run One at a Time

```bash
# DORA only
npm run dev:dora

# Or Chilean Privacy only
npm run dev:privacy
```

## Website Structure

### DORA Compliance Website
- **URL**: `http://localhost:3000`
- **Home**: `/` (DORA-focused, no regulation selector)
- **Dashboard**: `/dashboard`
- **Branding**: Primary colors (primary-600, primary-700)
- **Name**: Nexus Cloud

### Chilean Privacy Website
- **URL**: `http://localhost:3001`
- **Home**: `/chile-privacy` (or root if accessed via port 3001)
- **Dashboard**: `/chile-privacy/dashboard` (to be created)
- **Branding**: Blue colors (blue-600, blue-700)
- **Name**: Nexus Privacy

## Key Differences

### No Shared Elements
- ❌ No regulation selector component
- ❌ No central home page
- ❌ No tabs for switching regulations
- ✅ Each website is completely independent
- ✅ Separate branding and messaging
- ✅ Separate navigation

### Shared Backend
- ✅ Same API routes (regulation-aware via query params)
- ✅ Same database/models
- ✅ Same business logic
- ✅ Same rule engine (regulation-aware)

## API Usage

Both websites use the same API, but with different regulation parameters:

**DORA:**
```javascript
fetch('/api/dashboard/kpis?regulation=DORA')
```

**Chilean Privacy:**
```javascript
fetch('/api/dashboard/kpis?regulation=CHILEAN_PRIVACY')
```

## Setup Commands

### DORA Setup
```bash
npm run setup
npm run setup:questionnaire
npm run precompute:mappings
```

### Chilean Privacy Setup
```bash
npm run setup:chilean-privacy
npm run precompute:mappings:privacy
```

## Development Workflow

1. **Start DORA website**: `npm run dev:dora` (port 3000)
2. **Start Chilean Privacy website**: `npm run dev:privacy` (port 3001)
3. **Access separately**:
   - DORA: http://localhost:3000
   - Chilean Privacy: http://localhost:3001

## Production Deployment

For production, you can:
1. Deploy as separate Next.js apps
2. Use different domains/subdomains
3. Use reverse proxy to route to different ports
4. Deploy to separate servers

## Notes

- Both websites share the same codebase
- They use the same database and models
- The separation is at the UI/routing level
- API routes are regulation-aware
- Models support both regulations (DORARequirement + Requirement)
