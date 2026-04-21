import { Command } from 'commander'
import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pkg from '../package.json' with { type: 'json' }
import {
  AVAILABLE_BRANCHES,
  DEFAULT_BRANCH,
  DEFAULT_PROJECT_PREFIX,
  STALLNING_UPSTREAM_URL,
  type TemplateBranch,
} from './constants'
import { runCreate } from './actions/run-create'
import { parseCreateContext } from './context'
import { logger } from './logger'
import { colorize } from 'consola/utils'
import { ASCII_BANNER } from './banner'

const isTemplateBranch = (value: string): value is TemplateBranch =>
  AVAILABLE_BRANCHES.some((branch) => branch === value)

const getDefaultProjectName = (template: TemplateBranch): string =>
  `${DEFAULT_PROJECT_PREFIX}-${template}`

const getOptionSource = (program: Command, optionName: string): string =>
  program.getOptionValueSource(optionName) ?? 'default'

export const createProgram = (): Command => {
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
    .option('--mode <mode>', 'Template download mode (tar or git)', 'tar')
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
        mode,
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

      logger.log(ASCII_BANNER)
      logger.start(
        `Creating new project with ${colorize('underline', colorize('bold', 'stallning'))} (${colorize('blue', 'https://github.com/Sioood/stallning')})`,
      )

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

      try {
        const context = parseCreateContext({
          projectName,
          template,
          targetPath,
          templateMode: mode,
          gitOrigin,
          upstream:
            gitOrigin && getOptionSource(program, 'upstream') === 'default' ? true : upstream,
          strictGit,
          dryRun,
          verbose,
          skipInstall,
        })

        logger.debug('Resolved create options', {
          ...context,
          force,
          upstreamRemote: context.upstream ? STALLNING_UPSTREAM_URL : undefined,
        })

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

  return program
}

export const runCli = async (argv: string[] = process.argv): Promise<void> => {
  const program = createProgram()
  await program.parseAsync(argv)
}

const isExecutedDirectly = (() => {
  if (typeof process.argv[1] !== 'string') {
    return false
  }

  try {
    const argvPath = realpathSync(process.argv[1])
    const modulePath = fileURLToPath(import.meta.url)
    return argvPath === modulePath
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href
  }
})()

if (isExecutedDirectly) {
  runCli().catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
