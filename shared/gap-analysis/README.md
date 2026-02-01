# Shared Gap Analysis

This directory contains shared gap analysis logic used by all regulation apps.

## Structure

- Gap analysis generation algorithms
- Compliance calculation logic
- Risk assessment utilities

## Usage

Both DORA and Chilean Privacy apps use the same gap analysis logic from `lib/services/` and `app/api/gap-analysis/route.ts`.

## Future Enhancements

- Regulation-specific gap analysis rules
- Custom compliance thresholds per regulation
- Multi-regulation gap analysis
