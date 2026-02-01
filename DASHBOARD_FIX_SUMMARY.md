# Dashboard Regulation-Aware Fix

## Issue
The dashboard was pointing to DORA for the Chilean Privacy case, showing DORA pillars instead of Chilean Privacy pillars.

## Solution
Updated the dashboard to:
1. **Detect regulation from route** - Uses `usePathname()` to detect if route contains "chile-privacy"
2. **Pass regulation parameter** - API call now includes `?regulation=CHILEAN_PRIVACY` or `?regulation=DORA`
3. **Dynamic pillars** - Uses pillars from API response instead of hardcoded DORA pillars
4. **Route-aware navigation** - All links adapt based on regulation (e.g., `/chile-privacy/dashboard/questionnaire`)

## Changes Made

### 1. Dashboard Page (`app/dashboard/page.tsx`)
- Added `usePathname()` to detect current route
- Added regulation detection logic
- Updated `loadKPIs()` to pass regulation parameter
- Updated pillar display to use dynamic pillars from API
- Updated all navigation links to be regulation-aware
- Added Chilean Privacy default pillars as fallback

### 2. API Route (`app/api/dashboard/kpis/route.ts`)
- Already updated to accept `regulation` parameter
- Returns dynamic pillars based on regulation
- Returns pillar names in both English and Spanish

### 3. Chilean Privacy Dashboard Route
- Created `/app/chile-privacy/dashboard/page.tsx` that reuses the main dashboard component
- The dashboard component automatically detects the route and uses the correct regulation

## How It Works

### Route Detection
```typescript
const pathname = usePathname();
const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
```

### API Call
```typescript
const response = await apiRequest<KPIData>(`/dashboard/kpis?regulation=${regulationType}`);
```

### Dynamic Pillars
- API returns `pillars` array with pillar info (name, nameEs)
- Dashboard uses these pillars for display
- Falls back to default pillars if API doesn't return them

## Testing

### DORA Dashboard
- Route: `/dashboard`
- Should show 5 DORA pillars
- API call: `/dashboard/kpis?regulation=DORA`

### Chilean Privacy Dashboard
- Route: `/chile-privacy/dashboard`
- Should show 8 Chilean Privacy pillars
- API call: `/dashboard/kpis?regulation=CHILEAN_PRIVACY`
- Pillar names in Spanish if language is set to Spanish

## Next Steps

1. Test both dashboards to ensure correct pillars are shown
2. Verify API returns correct pillars for each regulation
3. Ensure gap analyses are filtered by regulation
4. Update other dashboard pages (questionnaire, gap-analysis, etc.) to be regulation-aware
