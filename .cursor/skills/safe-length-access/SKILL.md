---
name: safe-length-access
description: >-
  Avoids runtime errors from reading `.length` on undefined/null in TypeScript
  and React. Use when accessing `.length`, iterating arrays from APIs or
  Supabase, optional props/state, `map`/`filter`/`slice`, column counts, or
  when the user reports "Cannot read properties of undefined (reading
  'length')".
---

# Safe `.length` and array usage

## Cause

`someValue.length` throws when `someValue` is `undefined` or `null`. Common sources: optional API fields, empty Supabase relations, initial state before fetch, and props typed as `T[] | undefined`.

## Rules (apply before `.length` or array methods)

1. **Optional chaining**: `items?.length ?? 0` when you only need a count and tolerate missing data.
2. **Normalize once**: `const list = items ?? []` then use `list.length`, `list.map`, etc.
3. **Unknown shape**: `Array.isArray(x) ? x.length : 0` when the value might not be an array.
4. **Function params / destructuring**: default empty array — `function Row({ rows = [] }: { rows?: Row[] })` not `rows.length` on possibly undefined.
5. **Records / objects**: `Object.keys(obj ?? {}).length` — not `Object.keys(obj)` when `obj` may be undefined.

## Patterns to prefer

- `(data?.items ?? []).map(...)` instead of `data.items.map(...)` when `items` is optional.
- `rows?.length ?? 0` for display counts.
- After async fetch, guard render: `if (!data) return null` or use empty defaults before mapping children.

## Quick review checklist

- [ ] Every `.length` or `.map`/`.filter`/`.slice` is on a value guaranteed to be an array, **or** guarded with `?? []`, `?.`, or `Array.isArray`.
- [ ] No `x.length` when `x` is typed `T | undefined` without a default or optional chain.
