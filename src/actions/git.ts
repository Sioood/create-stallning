import { execa } from 'execa'
import { logger } from '../logger'
import { STALLNING_UPSTREAM_URL } from '../constants'
import type { CreateContext } from './types'

const runGit = async (ctx: CreateContext, args: string[]): Promise<void> => {
  logger.debug(`git ${args.join(' ')}`)

  if (ctx.dryRun) {
    logger.info(`[dry-run] git ${args.join(' ')}`)
    return
  }

  await execa('git', args, { cwd: ctx.targetPath })
}

const upsertRemote = async (ctx: CreateContext, name: string, url: string): Promise<void> => {
  try {
    await runGit(ctx, ['remote', 'add', name, url])
  } catch {
    await runGit(ctx, ['remote', 'set-url', name, url])
  }
}

export const setupGit = async (ctx: CreateContext): Promise<void> => {
  await runGit(ctx, ['init'])
  await runGit(ctx, ['add', '-A'])
  await runGit(ctx, ['commit', '-m', 'init project from stallning template'])

  if (ctx.gitOrigin) {
    await upsertRemote(ctx, 'origin', ctx.gitOrigin)
  }

  if (ctx.upstream) {
    await upsertRemote(ctx, 'upstream', STALLNING_UPSTREAM_URL)
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
