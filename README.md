# create-stallning

CLI to scaffold a project from the Stallning boilerplate templates.

## Requirements

- Node.js `v25.8.0` or newer
- pnpm

## Current status

The command interface is bootstrapped and ready for incremental implementation.
Core actions (download, transform, git, install) will be added step by step.

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Run the CLI locally

```bash
pnpm build
node dist/cli.mjs --help
```
