<div align="center">
  <h1><b>create-stallning</b></h1>
  <span>CLI to scaffold a new project from <a href="https://github.com/Sioood/stallning">Ställning</a> boilerplate templates (`minimal`, `nuxt`).</span>

  <img alt="image" src="https://github.com/user-attachments/assets/8331cc84-2fcc-48f4-93ce-a35b7dead2ea" style="width: 100%" />
</div>

## Requirements

- Node.js `v25.8.0` or newer
- pnpm

## Quick Start

Use the package in create mode:

```bash
pnpm create stallning@latest my-app
```

Or run the CLI binary directly:

```bash
pnpx create-stallning@latest my-app
```

## Usage

```bash
create-stallning [project-name] [options]
```

### Main Options

- `-t, --template <template>`: template branch to use (`minimal`, `nuxt`)
- `--mode <mode>`: template download mode (`tar` default, `git` for SSH git clone)
- `-o, --out-dir <path>`: output directory (default: `project-name`)
- `--git-origin <url>`: origin remote URL to configure
- `--upstream`: add Stallning template as upstream remote
- `--strict-git`: fail if initial git push fails
- `--skip-install`: skip dependency installation
- `--force`: overwrite target directory if it already exists
- `--dry-run`: simulate all actions without writing files or running side effects
- `-y, --yes`: skip prompts and use defaults
- `-v, --verbose`: print debug logs

### Behavior Notes

- If project name is missing, default is `new-stallning-{template}`.
- `--mode tar` is faster and default (GitHub tarball fetch).
- `--mode git` uses git under the hood (SSH) and is better for private repos with SSH access.
- If `--git-origin` is set and `--upstream` is not explicitly provided, upstream is enabled automatically.
- On non-strict mode, a failed initial `git push` is reported as warning and creation continues.

## Examples

Create a minimal project:

```bash
pnpm create stallning my-app --template minimal
```

Create a Nuxt variant and configure git remotes:

```bash
pnpm create stallning my-app --template nuxt --git-origin https://github.com/acme/my-app.git --upstream
```

Use git mode for private templates over SSH:

```bash
pnpm create stallning my-app --template minimal --mode git
```

Dry run without modifying disk:

```bash
pnpm create stallning --template minimal --dry-run --yes
```

## Development

Install dependencies:

```bash
pnpm install
```

Run quality checks:

```bash
pnpm run verify
pnpm run knip
pnpm run build
```

Run tests:

```bash
pnpm run test:run
```

Run locally:

```bash
pnpm run build
node dist/cli.mjs --help
```

## Quality & Hooks

- `pre-commit`: `lint-staged` (format + lint staged files)
- `commit-msg`: `commitlint`
- `pre-push`: `git fetch --all --prune` + `pnpm run verify`

## Versioning & Release

This project uses Changesets with commit-based generation.

Useful commands:

```bash
pnpm run changeset:gen --dry-run
pnpm run changeset:gen
pnpm run changeset:version
pnpm run changeset:publish
```

GitHub Actions:

- `.github/workflows/ci.yml`: lint, typecheck, tests, build, knip
- `.github/workflows/release.yml`: generates changesets, opens release PR, publishes to npm

Required repository secret for publishing:

- `NPM_TOKEN`

## Troubleshooting

- If you see engine warnings, switch to the project Node version:
  - `nvm use` (uses `.nvmrc`)
- If initial push fails:
  - rerun manually in generated project:
    - `git push -u origin main`
- If directory already exists:
  - use `--force` or choose another output directory.
