import { describe, expect, it } from 'vitest'
import { parseCreateContext } from '../src/context'

describe('parseCreateContext', () => {
  it('parses a valid context', () => {
    const context = parseCreateContext({
      projectName: 'my-project',
      template: 'minimal',
      targetPath: '/tmp/my-project',
      templateMode: 'tar',
      dryRun: false,
      verbose: false,
      skipInstall: true,
      upstream: false,
      strictGit: false,
    })

    expect(context.projectName).toBe('my-project')
    expect(context.template).toBe('minimal')
  })

  it('rejects invalid template', () => {
    expect(() =>
      parseCreateContext({
        projectName: 'my-project',
        template: 'unknown',
        targetPath: '/tmp/my-project',
        templateMode: 'tar',
        dryRun: false,
        verbose: false,
        skipInstall: true,
        upstream: false,
        strictGit: false,
      }),
    ).toThrow('Invalid create context')
  })

  it('rejects invalid gitOrigin URL', () => {
    expect(() =>
      parseCreateContext({
        projectName: 'my-project',
        template: 'minimal',
        targetPath: '/tmp/my-project',
        templateMode: 'tar',
        dryRun: false,
        verbose: false,
        skipInstall: true,
        gitOrigin: 'not-a-url',
        upstream: false,
        strictGit: false,
      }),
    ).toThrow('Invalid create context')
  })

  it('returns a frozen context object', () => {
    const context = parseCreateContext({
      projectName: 'my-project',
      template: 'minimal',
      targetPath: '/tmp/my-project',
      templateMode: 'tar',
      dryRun: false,
      verbose: false,
      skipInstall: true,
      upstream: false,
      strictGit: false,
    })

    expect(Object.isFrozen(context)).toBe(true)
  })
})
