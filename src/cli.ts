import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import pkg from '../package.json' with { type: 'json' }
import {
  AVAILABLE_BRANCHES,
  DEFAULT_BRANCH,
  DEFAULT_PROJECT_PREFIX,
  STALLNING_UPSTREAM_URL,
} from './constants'
import { runCreate } from './actions/run-create'
import type { CreateContext } from './actions/types'
import { logger } from './logger'

type TemplateBranch = (typeof AVAILABLE_BRANCHES)[number]

const isTemplateBranch = (value: string): value is TemplateBranch =>
  AVAILABLE_BRANCHES.some((branch) => branch === value)

const getDefaultProjectName = (template: TemplateBranch): string =>
  `${DEFAULT_PROJECT_PREFIX}-${template}`

const getOptionSource = (program: Command, optionName: string): string =>
  program.getOptionValueSource(optionName) ?? 'default'

const parseGitOrigin = (value: string): URL => {
  try {
    return new URL(value)
  } catch {
    throw new Error(`Invalid --git-origin URL: "${value}"`)
  }
}

const program = new Command()

program
  .name('create-stallning')
  .description(pkg.description)
  .version(pkg.version)
  .argument('[project-name]', 'Name of the new project')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .option(
    '-t, --template <template>',
    `Template branch to use (${AVAILABLE_BRANCHES.join(', ')})`,
    DEFAULT_BRANCH,
  )
  .option('-o, --out-dir <path>', 'Target directory (default: project name)')
  .option('--git-origin <url>', 'Set origin remote URL')
  .option('--upstream', 'Add stallning template as upstream remote', false)
  .option('--strict-git', 'Fail when git push fails', false)
  .option('--force', 'Overwrite when target directory already exists', false)
  .option('--dry-run', 'Preview changes without applying them', false)
  .option('-v, --verbose', 'Show detailed progress', false)
  .option('--skip-install', 'Skip dependency installation', false)
  .addHelpText(
    'after',
    `
Examples:
  pnpm create stallning my-app
  pnpm create stallning my-app --template nuxt --git-origin https://github.com/acme/my-app.git
  pnpm create stallning --template minimal --dry-run --yes
`,
  )
  .action(async (projectName, options) => {
    let {
      yes,
      template,
      outDir,
      gitOrigin,
      upstream,
      strictGit,
      force,
      dryRun,
      verbose,
      skipInstall,
    } = options

    logger.level = verbose ? 4 : 3

    if (verbose) {
      logger.debug('Verbose mode enabled')
    }

    logger.start('Creating new project with stallning')

    const templateSource = getOptionSource(program, 'template')
    if (!yes && templateSource === 'default') {
      template = await logger.prompt('Which template do you want to use?', {
        type: 'select',
        options: [...AVAILABLE_BRANCHES],
        initial: DEFAULT_BRANCH,
      })
    }

    if (!isTemplateBranch(template)) {
      logger.error(
        `Invalid template "${template}". Allowed values: ${AVAILABLE_BRANCHES.join(', ')}`,
      )
      process.exit(1)
    }

    if (!projectName) {
      const defaultProjectName = getDefaultProjectName(template)
      if (yes) {
        projectName = defaultProjectName
      } else {
        projectName = await logger.prompt('Project name', {
          type: 'text',
          placeholder: defaultProjectName,
          default: defaultProjectName,
        })
      }
    }

    projectName = String(projectName).trim()
    if (!projectName) {
      logger.error('Project name cannot be empty')
      process.exit(1)
    }

    if (!outDir) {
      outDir = projectName
    }

    const targetPath = resolve(outDir)
    if (existsSync(targetPath) && !force) {
      if (yes) {
        logger.error(
          `Target directory "${outDir}" already exists. Use --force to overwrite in non-interactive mode.`,
        )
        process.exit(1)
      }

      const shouldOverwrite = await logger.prompt(
        `Directory "${outDir}" already exists. Overwrite it?`,
        {
          type: 'confirm',
          default: false,
        },
      )

      if (!shouldOverwrite) {
        logger.info('Operation cancelled by user')
        process.exit(0)
      }
    }

    if (!yes && getOptionSource(program, 'skipInstall') === 'default') {
      const shouldInstall = await logger.prompt('Do you want to install dependencies?', {
        type: 'confirm',
        default: true,
      })
      skipInstall = !shouldInstall
    }

    if (!yes && !gitOrigin) {
      const shouldSetOrigin = await logger.prompt('Do you want to set an origin remote now?', {
        type: 'confirm',
        default: false,
      })

      if (shouldSetOrigin) {
        gitOrigin = await logger.prompt('Origin remote URL', {
          type: 'text',
          placeholder: 'https://github.com/owner/repository.git',
        })
      }
    }

    if (gitOrigin) {
      const originUrl = parseGitOrigin(gitOrigin)
      gitOrigin = originUrl.toString()
      if (getOptionSource(program, 'upstream') === 'default') {
        upstream = true
      }
    }

    const context: CreateContext = {
      projectName,
      template,
      targetPath,
      gitOrigin,
      upstream,
      strictGit,
      dryRun,
      verbose,
      skipInstall,
    }

    logger.debug('Resolved create options', {
      ...context,
      force,
      upstreamRemote: upstream ? STALLNING_UPSTREAM_URL : undefined,
    })

    try {
      await runCreate(context)
      logger.success(
        dryRun
          ? 'Dry run complete. No files were modified.'
          : `Project "${projectName}" created at ${targetPath}`,
      )
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })
  .parseAsync(process.argv)
