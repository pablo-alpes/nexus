# Shared Asset Management

This directory contains shared asset management logic used by all regulation apps.

## Structure

- Asset model and schemas
- Asset criticality calculations
- Asset-to-control mapping

## Usage

Both DORA and Chilean Privacy apps use the same asset management from `models/Asset.ts` and `app/api/assets/route.ts`.

## Future Enhancements

- Regulation-specific asset types
- Custom criticality levels per regulation
- Asset compliance tracking per regulation
