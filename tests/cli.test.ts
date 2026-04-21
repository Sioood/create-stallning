import { afterEach, describe, expect, it, vi } from 'vitest'

const { existsSyncMock, runCreateMock, loggerMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  runCreateMock: vi.fn(),
  loggerMock: {
    level: 3,
    debug: vi.fn(),
    start: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    prompt: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}))

vi.mock('../src/actions/run-create', () => ({
  runCreate: runCreateMock,
}))

vi.mock('../src/logger', () => ({
  logger: loggerMock,
}))

import { createProgram } from '../src/cli'

afterEach(() => {
  vi.clearAllMocks()
})

describe('cli argument parsing', () => {
  it('does not prompt in non-interactive mode with --yes --dry-run', async () => {
    existsSyncMock.mockReturnValue(false)
    runCreateMock.mockResolvedValue(undefined)

    const program = createProgram()
    await program.parseAsync([
      'node',
      'create-stallning',
      '--yes',
      '--dry-run',
      '--out-dir',
      '/tmp/create-stallning-cli-test',
    ])

    expect(loggerMock.prompt).not.toHaveBeenCalled()
    expect(runCreateMock).toHaveBeenCalledTimes(1)
    expect(runCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        projectName: 'new-stallning-minimal',
        template: 'minimal',
      }),
    )
  })
})
