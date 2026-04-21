import { Command } from 'commander'
import pkg from '../package.json' with { type: 'json' }
import { AVAILABLE_BRANCHES } from './constants'
import { logger } from './logger'

const program = new Command()

program
  .name('create-stallning')
  .description(pkg.description)
  .version(pkg.version)
  .argument('[project-name]', 'Name of the new project')
  .option('-y, --yes', 'Answer yes to all prompts', false)
  .option(
    '-t, --template <template>',
    `Branch to clone and use as template (${AVAILABLE_BRANCHES.join(', ')})`,
    AVAILABLE_BRANCHES[0],
  )
  .option('--dry-run', 'Preview changes without applying them', false)
  .option('-v, --verbose', 'Show detailed progress', false)
  .option('--skip-install', 'Skip dependency installation', false)
  .action(async (projectName, { yes, template, skipInstall, verbose, ...options }) => {
    logger.level = verbose ? 4 : 3

    if (verbose) {
      logger.debug('Verbose mode enabled')
    }

    logger.start('🚀 Creating new project with stallning')

    if (!yes) {
      template = await logger.prompt('Which template do you want to use?', {
        type: 'select',
        options: [...AVAILABLE_BRANCHES],
        initial: AVAILABLE_BRANCHES[0],
      })

      skipInstall = await logger.prompt('Do you want to install dependencies?', {
        type: 'confirm',
        default: !skipInstall,
      })
    }

    // TODO: rename (files, folders...)
    // TODO: replace (replace 'stallning' with project name inside files)

    // TODO: git (clone branch, set remote upstream)

    if (!skipInstall) {
      // TODO: install dependencies
    }

    logger.debug('create-stallning', { ...options, projectName, template, skipInstall })
  })
  .parseAsync(process.argv)
