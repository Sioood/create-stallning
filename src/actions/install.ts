import fs from 'fs-extra'
import { execa } from 'execa'
import { join } from 'node:path'
import { logger } from '../logger'
import type { CreateContext } from './types'

type PackageManager = 'pnpm' | 'yarn' | 'npm'

const detectPackageManager = async (targetPath: string): Promise<PackageManager> => {
  if (await fs.pathExists(join(targetPath, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (await fs.pathExists(join(targetPath, 'yarn.lock'))) {
    return 'yarn'
  }
  if (await fs.pathExists(join(targetPath, 'package-lock.json'))) {
    return 'npm'
  }
  return 'pnpm'
}

export const installDependencies = async (ctx: CreateContext): Promise<void> => {
  if (ctx.skipInstall) {
    logger.info('Skipping dependency installation')
    return
  }

  const packageManager = await detectPackageManager(ctx.targetPath)
  if (ctx.dryRun) {
    logger.info(`[dry-run] ${packageManager} install`)
    return
  }

  await execa(packageManager, ['install'], {
    cwd: ctx.targetPath,
    stdio: ctx.verbose ? 'inherit' : 'pipe',
  })
}
