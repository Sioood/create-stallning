import type { AVAILABLE_BRANCHES } from '../constants'

export type TemplateBranch = (typeof AVAILABLE_BRANCHES)[number]

export type CreateContext = {
  projectName: string
  template: TemplateBranch
  targetPath: string
  dryRun: boolean
  verbose: boolean
  skipInstall: boolean
  gitOrigin?: string
  upstream: boolean
  strictGit: boolean
}
