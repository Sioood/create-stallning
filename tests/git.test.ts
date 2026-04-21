import { afterEach, describe, expect, it, vi } from 'vitest'
import { setupGit } from '../src/actions/git'
import { STALLNING_UPSTREAM_URL } from '../src/constants'
import type { CreateContext } from '../src/actions/types'

const { execaMock } = vi.hoisted(() => ({
  execaMock: vi.fn(),
}))

vi.mock('execa', () => ({
  execa: execaMock,
}))

const createContext = (overrides: Partial<CreateContext> = {}): CreateContext => ({
  projectName: 'my-project',
  template: 'minimal',
  targetPath: '/tmp/my-project',
  dryRun: false,
  verbose: false,
  skipInstall: true,
  gitOrigin: 'https://github.com/acme/my-project.git',
  upstream: true,
  strictGit: false,
  ...overrides,
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('setupGit', () => {
  it('runs git initialization flow with origin and upstream', async () => {
    execaMock.mockResolvedValue({ stdout: '' })

    await setupGit(createContext())

    expect(execaMock).toHaveBeenCalledWith('git', ['init'], { cwd: '/tmp/my-project' })
    expect(execaMock).toHaveBeenCalledWith(
      'git',
      ['remote', 'add', 'origin', 'https://github.com/acme/my-project.git'],
      {
        cwd: '/tmp/my-project',
      },
    )
    expect(execaMock).toHaveBeenCalledWith(
      'git',
      ['remote', 'add', 'upstream', STALLNING_UPSTREAM_URL],
      {
        cwd: '/tmp/my-project',
      },
    )
    expect(execaMock).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'main'], {
      cwd: '/tmp/my-project',
    })
  })

  it('falls back to remote set-url when remote already exists', async () => {
    execaMock.mockImplementation((_command, args) => {
      if (args[0] === 'remote' && args[1] === 'add') {
        return Promise.reject(new Error('remote exists'))
      }
      return Promise.resolve({ stdout: '' })
    })

    await setupGit(createContext())

    expect(execaMock).toHaveBeenCalledWith(
      'git',
      ['remote', 'set-url', 'origin', 'https://github.com/acme/my-project.git'],
      {
        cwd: '/tmp/my-project',
      },
    )
    expect(execaMock).toHaveBeenCalledWith(
      'git',
      ['remote', 'set-url', 'upstream', STALLNING_UPSTREAM_URL],
      {
        cwd: '/tmp/my-project',
      },
    )
  })

  it('does not execute git commands during dry-run', async () => {
    execaMock.mockResolvedValue({ stdout: '' })

    await setupGit(createContext({ dryRun: true }))

    expect(execaMock).not.toHaveBeenCalled()
  })

  it('throws when strictGit is enabled and push fails', async () => {
    execaMock.mockImplementation((_command, args) => {
      if (args[0] === 'push') {
        return Promise.reject(new Error('push failed'))
      }
      return Promise.resolve({ stdout: '' })
    })

    await expect(setupGit(createContext({ strictGit: true }))).rejects.toThrow('push failed')
  })
})
