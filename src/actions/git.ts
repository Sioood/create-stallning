import { execa } from 'execa'
import { logger } from '../logger'
import { STALLNING_UPSTREAM_URL } from '../constants'
import type { CreateContext } from './types'

const runGit = async (ctx: CreateContext, args: string[]): Promise<void> => {
  if (ctx.dryRun) {
    logger.info(`[dry-run] git ${args.join(' ')}`)
    return
  }

  await execa('git', args, { cwd: ctx.targetPath })
}

export const setupGit = async (ctx: CreateContext): Promise<void> => {
  await runGit(ctx, ['init'])
  await runGit(ctx, ['add', '-A'])
  await runGit(ctx, ['commit', '-m', 'init project from stallning template'])

  if (ctx.gitOrigin) {
    await runGit(ctx, ['remote', 'add', 'origin', ctx.gitOrigin])
  }

  if (ctx.upstream) {
    await runGit(ctx, ['remote', 'add', 'upstream', STALLNING_UPSTREAM_URL])
  }

  if (!ctx.gitOrigin) {
    return
  }

  await runGit(ctx, ['branch', '-M', 'main'])

  try {
    await runGit(ctx, ['push', '-u', 'origin', 'main'])
  } catch (error) {
    if (ctx.strictGit) {
      throw error
    }
    logger.warn('Initial git push failed. You can push manually later.')
  }
}
