import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreateContext } from '../src/actions/types'

const {
  existsSyncMock,
  removeMock,
  downloadTemplateMock,
  transformTemplateMock,
  setupGitMock,
  installDependenciesMock,
  loggerMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  removeMock: vi.fn(),
  downloadTemplateMock: vi.fn(),
  transformTemplateMock: vi.fn(),
  setupGitMock: vi.fn(),
  installDependenciesMock: vi.fn(),
  loggerMock: {
    start: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}))

vi.mock('fs-extra', () => ({
  default: {
    remove: removeMock,
  },
  remove: removeMock,
}))

vi.mock('../src/actions/download', () => ({
  downloadTemplate: downloadTemplateMock,
}))

vi.mock('../src/actions/transform', () => ({
  transformTemplate: transformTemplateMock,
}))

vi.mock('../src/actions/git', () => ({
  setupGit: setupGitMock,
}))

vi.mock('../src/actions/install', () => ({
  installDependencies: installDependenciesMock,
}))

vi.mock('../src/logger', () => ({
  logger: loggerMock,
}))

import { runCreate } from '../src/actions/run-create'

const createContext = (overrides: Partial<CreateContext> = {}): CreateContext => ({
  projectName: 'my-project',
  template: 'minimal',
  targetPath: '/tmp/my-project',
  dryRun: false,
  verbose: false,
  skipInstall: false,
  upstream: false,
  strictGit: false,
  ...overrides,
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('runCreate', () => {
  it('runs actions in expected order', async () => {
    existsSyncMock.mockReturnValue(false)

    await runCreate(createContext())

    expect(downloadTemplateMock).toHaveBeenCalledOnce()
    expect(transformTemplateMock).toHaveBeenCalledOnce()
    expect(setupGitMock).toHaveBeenCalledOnce()
    expect(installDependenciesMock).toHaveBeenCalledOnce()

    const order = [
      downloadTemplateMock.mock.invocationCallOrder[0],
      transformTemplateMock.mock.invocationCallOrder[0],
      setupGitMock.mock.invocationCallOrder[0],
      installDependenciesMock.mock.invocationCallOrder[0],
    ]

    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('removes existing target directory before generation', async () => {
    existsSyncMock.mockReturnValue(true)

    await runCreate(createContext())

    expect(removeMock).toHaveBeenCalledWith('/tmp/my-project')
  })

  it('does not remove existing target directory during dry-run', async () => {
    existsSyncMock.mockReturnValue(true)

    await runCreate(createContext({ dryRun: true }))

    expect(removeMock).not.toHaveBeenCalled()
    expect(loggerMock.info).toHaveBeenCalledWith(
      '[dry-run] remove existing directory /tmp/my-project',
    )
  })
})
