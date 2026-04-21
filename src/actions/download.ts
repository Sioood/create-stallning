import fs from 'fs-extra'
// @ts-expect-error tiged does not ship TypeScript declarations
import tiged from 'tiged'
import { logger } from '../logger'
import { TEMPLATE_REPO_SLUG } from '../constants'
import type { CreateContext } from './types'

export const downloadTemplate = async (ctx: CreateContext): Promise<void> => {
  const source = `${TEMPLATE_REPO_SLUG}#${ctx.template}`

  if (ctx.dryRun) {
    logger.info(
      `[dry-run] download template ${source} into ${ctx.targetPath} using mode=${ctx.templateMode}`,
    )
    return
  }

  await fs.ensureDir(ctx.targetPath)

  const emitter = tiged(source, {
    disableCache: true,
    force: true,
    verbose: ctx.verbose,
    mode: ctx.templateMode,
  })

  if (ctx.verbose) {
    emitter.on('info', (entry: unknown) => {
      const message =
        typeof entry === 'object' &&
        entry !== null &&
        'message' in entry &&
        typeof entry.message === 'string'
          ? entry.message
          : 'received info event'
      logger.debug(`[tiged] ${message}`)
    })
  }

  await emitter.clone(ctx.targetPath)
}
