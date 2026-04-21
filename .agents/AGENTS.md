# AGENTS.md

## Project Overview

- Project: `create-stallning`
- Type: TypeScript CLI scaffold generator
- Goal: initialize a project from Stallning boilerplate branches (`minimal`, `nuxt`)
- Distribution target: `pnpm create stallning` via package `create-stallning`
- Runtime baseline: Node.js `>=25.8.0`

## Product Behavior (Source of Truth)

- Template source repository is fixed to Stallning template repository.
- Users choose a template branch (`minimal` or `nuxt`).
- Default project name when missing: `new-stallning-{template}`.
- CLI supports dry-run mode and should print planned actions clearly.
- Git flow supports:
  - setting `origin` from user URL
  - optional `upstream` to Stallning template repo
  - optional strict behavior on git push failures

## Toolchain & Commands

- Install dependencies: `pnpm install`
- Dev build watch: `pnpm dev`
- Build: `pnpm build`
- Tests (watch): `pnpm test`
- Tests (CI mode): `pnpm test:run`
- Lint: `pnpm lint`
- Format: `pnpm fmt`
- Typecheck: `pnpm typecheck`
- Full validation: `pnpm verify`
- Unused code/deps: `pnpm knip`
- Changesets:
  - interactive: `pnpm changeset`
  - generate from commits: `pnpm changeset:gen`
  - version bumping: `pnpm changeset:version`
  - publish: `pnpm changeset:publish`

## Commit & Hook Rules

- Conventional Commits are mandatory and enforced by `commitlint`.
- Preferred commit style:
  - include an appropriate scope (for example `global`, `config`)
  - use gitmoji + conventional type for readability
- Husky hooks:
  - `pre-commit`: `pnpm lint-staged`
  - `commit-msg`: commitlint validation
  - `pre-push`: `git fetch --all --prune` then `pnpm run verify`

## Coding Standards

- Language: TypeScript strict mode.
- Source files should remain TypeScript-only (`src` should not contain generated `.js` or `.d.ts`).
- Prefer simple, explicit logic over clever abstractions (KISS).
- Avoid duplication where reusable extraction improves clarity (DRY).
- Do not use `any`; use `unknown` when a type is truly unknown.
- Avoid recursion; use iterative approaches.
- Use optional chaining where appropriate.
- No commented-out code, unused variables, or dead abstractions in final output.

## CLI Design Rules (Agent-Focused)

- Non-interactive-first:
  - every required input should be expressible with flags
  - prompts are fallback only when information is missing
- `--help` should include concrete examples.
- Errors must be actionable and include next command hints.
- Dry-run must not mutate disk or git state.
- Success output should provide practical next steps.

## Implementation Sequence

1. Keep project tooling and quality gates green.
2. Implement CLI contract and option resolution.
3. Implement download action (template retrieval).
4. Implement transform engine:
   - content replacement
   - file/folder renaming
   - exclusions for binary and generated files
5. Implement git initialization/remotes/push behavior.
6. Implement dependency installation action.
7. Add/expand tests for each action.
8. Refine changeset generation and release automation.

## Safety Guardrails

- Never use destructive git commands unless explicitly requested.
- Never force-push to protected branches.
- Do not commit secrets or credentials.
- If uncertain between multiple implementation choices, prefer explicit flags and safe defaults.

## PR/Commit Readiness Checklist

- `pnpm run fmt`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test:run`
- `pnpm run build`
- `pnpm run knip` (for cleanup passes)
- Update docs/help text when CLI behavior changes.
