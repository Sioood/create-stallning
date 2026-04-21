import readChangeset from '@changesets/read'
import type { Changeset } from '@changesets/types'
import writeChangeset from '@changesets/write'
import { getPackagesSync } from '@manypkg/get-packages'
import { execSync } from 'child_process'
import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'

export interface PkgJson {
  name?: string
  version?: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  bundledDependencies?: string[]
  bin?: string | Record<string, string>
  scripts?: Record<string, string>
  engines?: Record<string, string>
  files?: string[]
  main?: string
  browser?: string
  types?: string
  typings?: string
  module?: string
  unpkg?: string
  sideEffects?: boolean
  workspaces?: string[]
}

export interface ManyPkgPackage {
  packageJson: PkgJson
  dir: string
}

export interface ManyPkgPackages {
  packages: ManyPkgPackage[]
  root: ManyPkgPackage
}

interface Commit {
  commitHash: string
  commitMessage: string
}

interface ConventionalMessagesToCommits {
  changelogMessage: string
  commitHashes: string[]
}

type ReleaseType = 'major' | 'minor' | 'patch'

const conventionalTypePattern = /^([a-z]+)(?:\([^)]+\))?(!)?:/

const RELEASE_RULES: Record<string, ReleaseType | null> = {
  feat: 'minor',
  feature: 'minor',
  fix: 'patch',
  perf: 'patch',
  revert: 'patch',
  refactor: 'patch',
  build: 'patch',
  docs: null,
  test: null,
  ci: null,
  chore: null,
  style: null,
}

export const isBreakingChange = (commit: string) => {
  if (commit.includes('BREAKING CHANGE:')) {
    return true
  }

  const match = commit.match(conventionalTypePattern)
  return Boolean(match?.[2])
}

export const isConventionalCommit = (commit: string) => {
  return conventionalTypePattern.test(commit)
}

export const getCommitType = (commit: string): string | null => {
  const match = commit.match(conventionalTypePattern)
  if (!match) {
    return null
  }
  return match[1]
}

export const getReleaseTypeForCommit = (commit: string): ReleaseType | null => {
  if (isBreakingChange(commit)) {
    return 'major'
  }

  const commitType = getCommitType(commit)
  if (!commitType) {
    return null
  }

  return RELEASE_RULES[commitType] ?? null
}

/* Attempts to associate non-conventional commits to the nearest conventional commit */
export const associateCommitsToConventionalCommitMessages = (
  commits: Commit[],
): ConventionalMessagesToCommits[] => {
  return commits.reduce((acc, curr) => {
    if (!acc.length) {
      return [
        {
          changelogMessage: curr.commitMessage,
          commitHashes: [curr.commitHash],
        },
      ]
    }

    if (isConventionalCommit(curr.commitMessage)) {
      if (isConventionalCommit(acc[acc.length - 1].changelogMessage)) {
        return [
          ...acc,
          {
            changelogMessage: curr.commitMessage,
            commitHashes: [curr.commitHash],
          },
        ]
      } else {
        return [
          ...acc.slice(0, acc.length - 1),
          {
            changelogMessage: curr.commitMessage,
            commitHashes: [...acc[acc.length - 1].commitHashes, curr.commitHash],
          },
        ]
      }
    } else {
      return [
        ...acc.slice(0, acc.length - 1),
        {
          ...acc[acc.length - 1],
          commitHashes: [...acc[acc.length - 1].commitHashes, curr.commitHash],
        },
      ]
    }
  }, [] as ConventionalMessagesToCommits[])
}

export const getFilesChangedSince = (opts: { from: string; to: string }) => {
  const output = execSync(`git diff --name-only ${opts.from}~1...${opts.to}`).toString().trim()
  if (!output) {
    return []
  }
  return output.split('\n')
}

export const getRepoRoot = () => {
  return execSync('git rev-parse --show-toplevel').toString().trim().replace(/\n|\r/g, '')
}

export const conventionalMessagesWithCommitsToChangesets = (
  conventionalMessagesToCommits: ConventionalMessagesToCommits[],
  options: { ignoredFiles?: (string | RegExp)[]; packages: ManyPkgPackage[] },
) => {
  const { ignoredFiles = [], packages } = options
  const repoRoot = getRepoRoot()

  return conventionalMessagesToCommits
    .map((entry) => {
      const releaseType = getReleaseTypeForCommit(entry.changelogMessage)
      if (!releaseType) {
        return null
      }

      const filesChanged = getFilesChangedSince({
        from: entry.commitHashes[0],
        to: entry.commitHashes[entry.commitHashes.length - 1],
      }).filter((file) => {
        return ignoredFiles.every((ignoredPattern) => !file.match(ignoredPattern))
      })

      const packagesChanged = packages.filter((pkg) => {
        const pkgDir = `${pkg.dir.replace(`${repoRoot}/`, '')}/`
        return filesChanged.some((file) => file.match(pkgDir))
      })

      const packageNames = packagesChanged
        .map((pkg) => pkg.packageJson.name)
        .filter((name): name is string => Boolean(name))

      console.log(`${entry.commitHashes.at(-1)} packagesChanged`, packageNames)

      if (packagesChanged.length === 0) {
        return null
      }

      return {
        releases: packageNames.map((name) => ({
          name,
          type: releaseType,
        })),
        summary: entry.changelogMessage,
      }
    })
    .filter(Boolean) as Changeset[]
}

export const gitFetch = (branch: string) => {
  execSync(`git fetch origin ${branch}`)
}

export const getCurrentBranch = () => {
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim().replace(/\n|\r/g, '')
}

// This could be running on the main branch or on a branch that was created from the main branch.
// If this is running on the main branch, we want to get all commits since the last release.
// If this is running on a branch that was created from the main branch, we want to get all commits since the branch was created.
export const getCommitsSinceRef = (branch: string) => {
  gitFetch(branch)
  const currentBranch = getCurrentBranch()
  let sinceRef = `origin/${branch}`
  if (currentBranch === branch) {
    try {
      sinceRef = execSync('git describe --tags --abbrev=0').toString().trim().replace(/\n|\r/g, '')
    } catch {
      console.log(
        "No git tags found, using repo's first commit for automated change detection. Note: this may take a while.",
      )
      sinceRef = execSync('git rev-list --max-parents=0 HEAD')
        .toString()
        .trim()
        .replace(/\n|\r/g, '')
    }
  }
  return execSync(`git rev-list --ancestry-path ${sinceRef}...HEAD`)
    .toString()
    .split('\n')
    .filter(Boolean)
    .reverse()
}

const compareChangeSet = (a: Changeset, b: Changeset): boolean => {
  return a.summary === b.summary && JSON.stringify(a.releases) === JSON.stringify(b.releases)
}

export const difference = (a: Changeset[], b: Changeset[]): Changeset[] => {
  return a.filter((changeA) => !b.some((changeB) => compareChangeSet(changeA, changeB)))
}

const CHANGESET_CONFIG_LOCATION = path.join('.changeset', 'config.json')

const conventionalCommitChangeset = async (
  cwd: string = process.cwd(),
  options: { ignoredFiles?: (string | RegExp)[]; dryRun?: boolean } = {},
) => {
  const packages = getPackagesSync(cwd).packages.filter(
    (pkg) => !pkg.packageJson.private && Boolean(pkg.packageJson.version),
  )
  const changesetConfig = JSON.parse(
    fs.readFileSync(path.join(cwd, CHANGESET_CONFIG_LOCATION)).toString(),
  )
  const { baseBranch = 'main' } = changesetConfig

  const commitsSinceBase = getCommitsSinceRef(baseBranch)

  const commitsWithMessages = commitsSinceBase.map((commitHash) => ({
    commitHash,
    commitMessage: execSync(`git log -n 1 --pretty=format:%s ${commitHash}`).toString(),
  }))

  const changelogMessagesWithAssociatedCommits =
    associateCommitsToConventionalCommitMessages(commitsWithMessages)

  const changesets = conventionalMessagesWithCommitsToChangesets(
    changelogMessagesWithAssociatedCommits,
    {
      ignoredFiles: options.ignoredFiles,
      packages,
    },
  )

  const currentChangesets = await readChangeset(cwd)

  const newChangesets =
    currentChangesets.length === 0 ? changesets : difference(changesets, currentChangesets)

  if (newChangesets.length === 0) {
    console.log('No new changesets detected from commit history.')
    return
  }

  if (options.dryRun) {
    console.log(`Dry run: ${newChangesets.length} changeset(s) would be created.`)
    for (const changeset of newChangesets) {
      console.log(`- ${changeset.summary}`)
    }
    return
  }

  for (const changeset of newChangesets) {
    writeChangeset(changeset, cwd)
  }
}

export const runChangesets = async (options: { dryRun?: boolean }) => {
  await conventionalCommitChangeset(process.cwd(), {
    ignoredFiles: [],
    dryRun: options.dryRun,
  })
}

const run = () => {
  const program = new Command('changesets')
    .option('--dry-run', 'Print proposed changesets without writing files', false)
    .action(async (options) => {
      await runChangesets({ dryRun: options.dryRun })
    })

  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}

run()
