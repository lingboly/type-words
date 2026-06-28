# Testing

Tests are split by feedback speed and failure scope. Unit tests protect business rules, UI component tests protect rendered states and semantics, and Playwright system tests protect real navigation and responsive behavior.

## Commands

- `npm run test:unit`: run pure logic and Pinia store tests.
- `npm run test:ui`: run Vue component/UI tests in Happy DOM.
- `npm test`: run unit and component/UI groups.
- `npm run test:system`: run desktop and mobile Playwright system tests.
- `npm run test:all`: run every automated test group.
- `npm run build-tsc`: type-check and create a production build.

The repository deployment workflow uses pnpm, so the same scripts can also be run with `pnpm <script>` when pnpm is available.

## Locations and conventions

- Unit: `src/__tests__/unit/**/*.test.ts`
- Component/UI: `src/__tests__/ui/**/*.test.ts`
- System/UI: `tests/system/**/*.spec.ts`
- UI coverage map: `docs/UI_TEST_CASES.md`

Tests should assert user-visible behavior or state transitions. Avoid assertions that only prove an object exists. Bug fixes require a regression case reproducing the original condition.
