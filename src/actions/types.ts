import type { TemplateBranch } from '../constants'

export type CreateContext = {
  projectName: string
  template: TemplateBranch
  targetPath: string
  templateMode: 'tar' | 'git'
  dryRun: boolean
  verbose: boolean
  skipInstall: boolean
  gitOrigin?: string
  upstream: boolean
  strictGit: boolean
}
