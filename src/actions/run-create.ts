import fs from 'fs-extra'
import { existsSync } from 'node:fs'
import { logger } from '../logger'
import type { CreateContext } from './types'
import { downloadTemplate } from './download'
import { transformTemplate } from './transform'
import { setupGit } from './git'
import { installDependencies } from './install'

export const runCreate = async (ctx: CreateContext): Promise<void> => {
  if (existsSync(ctx.targetPath)) {
    if (ctx.dryRun) {
      logger.info(`[dry-run] remove existing directory ${ctx.targetPath}`)
    } else {
      await fs.remove(ctx.targetPath)
    }
  }

  logger.start('Downloading template')
  await downloadTemplate(ctx)
  logger.success('Template downloaded')

  logger.start('Transforming template files')
  await transformTemplate(ctx)
  logger.success('Template transformed')

  logger.start('Setting up git repository')
  await setupGit(ctx)
  logger.success('Git repository ready')

  logger.start('Installing dependencies')
  await installDependencies(ctx)
  logger.success('Dependencies step complete')
}
