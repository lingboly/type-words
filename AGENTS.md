# Repository Guidelines

## Project Structure & Module Organization

TypeWords is a Vue 3, TypeScript, and Vite application. Application code lives in `src/`: route-level views are grouped by feature under `src/pages/`, reusable UI is in `src/components/`, Pinia state is in `src/stores/`, and shared behavior belongs in `src/hooks/`, `src/utils/`, or `src/libs/`. API wrappers and environment constants are under `src/apis/` and `src/config/`. Static source assets belong in `src/assets/`; files copied unchanged at build time belong in `public/`. Unit tests live in `src/__tests__/`. Build and deployment helpers are in `scripts/`, while GitHub Actions workflows are in `.github/workflows/`.

## Build, Test, and Development Commands

Use pnpm to match the deployment workflow and committed `pnpm-lock.yaml`.

- `pnpm install` installs dependencies.
- `pnpm dev` starts Vite on port 3000 and exposes it on the local network.
- `pnpm build` creates `dist/` and generates the sitemap.
- `pnpm build-nocdn` creates the Vite production bundle without the sitemap step; CI uses this command.
- `pnpm build-tsc` type-checks with `vue-tsc` before building.
- `pnpm exec vitest run` runs the unit suite once; `pnpm exec vitest` enables watch mode. The current `test` package script is empty.
- `pnpm preview` serves the built application locally.

## Coding Style & Naming Conventions

Follow nearby code: two-space indentation, single quotes in newer TypeScript, and `<script setup lang="ts">` for Vue components. Use PascalCase for components and type-like symbols (`CatCard.vue`, `CatStatus`), camelCase for functions and variables, and `useXxx` for composables. Prefer the `@/` alias for imports from `src/`. No repository-wide formatter or linter is configured, so keep changes focused and preserve the style of edited files. Write code comments and documentation in English.

## Testing Guidelines

Vitest runs in `happy-dom` and discovers `src/__tests__/**/*.test.ts`. Name files after the behavior or module under test, for example `cat-store.test.ts`. Add focused tests for state transitions, edge cases, and pure business logic. Run `pnpm exec vitest run` and `pnpm build-tsc` before opening a pull request.

## Commit & Pull Request Guidelines

Use Conventional Commit subjects, such as `feat: add practice summary` or `fix: preserve article progress`; `pnpm commit` provides the Commitizen prompt. Keep commits narrowly scoped. Pull requests should explain the user-visible change, list verification commands, link relevant issues, and include screenshots or recordings for UI changes. Call out configuration, persistence, or deployment impacts explicitly.
