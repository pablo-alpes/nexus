# Shared Rule Engine

This directory contains the shared rule engine logic used by all regulation apps.

## Structure

- Core rule engine logic
- Question-to-requirement mapping
- Control matching algorithms
- NLP similarity calculations

## Usage

Both DORA and Chilean Privacy apps use the same rule engine from `lib/services/precomputed-mappings.ts` and `lib/services/rule-engine.ts`.

## Future Enhancements

- Regulation-agnostic rule engine
- Support for multiple ISO standards (27001, 27701, etc.)
- Custom rule configuration per regulation
