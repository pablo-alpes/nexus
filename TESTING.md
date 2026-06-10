# Nexus Cloud – Testing

## Quick run

```bash
npm test          # Run Jest tests once
npm run test:ci   # Run with coverage (CI)
npm run check     # Runs test:ci (fast verification)
npm run check:full # Lint + build + test (full verification)
```

## Test suite

Tests use **local file storage** (no MongoDB). Data is written to `data/test-db/` (see `jest.setup.js`).

| Area | Path | What’s tested |
|------|------|----------------|
| Regulations | `__tests__/lib/regulations.test.ts` | `getRegulationConfig`, `getRegulationModules`, `getAllRegulations` |
| Regulations API | `__tests__/api/regulations-modules.test.ts` | `GET /api/regulations/modules` |
| Auth | `__tests__/api/auth.test.ts` | Register (validation, success, duplicate), Login (validation, wrong password, success) |
| User profile | `__tests__/api/user-profile.test.ts` | `GET/PATCH /api/user/profile` (auth, preferredRegulation, enabledRegulations) |

## Verify script

```bash
./scripts/verify-build-and-tests.sh           # Tests only
./scripts/verify-build-and-tests.sh --lint    # + lint
./scripts/verify-build-and-tests.sh --build   # + Next.js build
./scripts/verify-build-and-tests.sh --docker  # + Docker build
./scripts/verify-build-and-tests.sh --lint --build --docker  # All
```

Make the script executable once: `chmod +x scripts/verify-build-and-tests.sh`

## Note on build

`npm run build` may still report TypeScript errors in some pages (e.g. rule-engine, remediation). The application runs; fixing remaining types is recommended. `npm run check` (tests only) is the main gate for CI.
