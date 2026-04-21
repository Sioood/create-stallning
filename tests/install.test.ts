import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installDependencies } from '../src/actions/install'
import type { CreateContext } from '../src/actions/types'

const { execaMock } = vi.hoisted(() => ({
  execaMock: vi.fn(),
}))

vi.mock('execa', () => ({
  execa: execaMock,
}))

const tempDirs: string[] = []

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-stallning-install-'))
  tempDirs.push(dir)
  return dir
}

const createContext = (
  targetPath: string,
  overrides: Partial<CreateContext> = {},
): CreateContext => ({
  projectName: 'my-project',
  template: 'minimal',
  targetPath,
  dryRun: false,
  verbose: false,
  skipInstall: false,
  upstream: false,
  strictGit: false,
  ...overrides,
})

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await fs.remove(dir)
    }
  }
  vi.clearAllMocks()
})

describe('installDependencies', () => {
  it('skips install when skipInstall is true', async () => {
    const root = await createTempDir()
    await installDependencies(createContext(root, { skipInstall: true }))
    expect(execaMock).not.toHaveBeenCalled()
  })

  it('uses pnpm when pnpm lockfile exists', async () => {
    const root = await createTempDir()
    await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9')

    await installDependencies(createContext(root))

    expect(execaMock).toHaveBeenCalledWith('pnpm', ['install'], { cwd: root, stdio: 'pipe' })
  })

  it('uses npm when package-lock exists and pnpm lockfile does not', async () => {
    const root = await createTempDir()
    await fs.writeFile(path.join(root, 'package-lock.json'), '{}')

    await installDependencies(createContext(root))

    expect(execaMock).toHaveBeenCalledWith('npm', ['install'], { cwd: root, stdio: 'pipe' })
  })

  it('does not execute install command in dry-run mode', async () => {
    const root = await createTempDir()

    await installDependencies(createContext(root, { dryRun: true }))

    expect(execaMock).not.toHaveBeenCalled()
  })
})
