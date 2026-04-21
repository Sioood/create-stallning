import fs from 'fs-extra'
import fg from 'fast-glob'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { transformTemplate } from '../src/actions/transform'
import type { CreateContext } from '../src/actions/types'

const tempDirs: string[] = []

const createContext = (targetPath: string, dryRun = false): CreateContext => ({
  projectName: 'my-project',
  template: 'minimal',
  targetPath,
  dryRun,
  verbose: false,
  skipInstall: true,
  upstream: false,
  strictGit: false,
})

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-stallning-transform-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await fs.remove(dir)
    }
  }
})

describe('transformTemplate', () => {
  it('replaces placeholder content and renames nested files', async () => {
    const root = await createTempDir()
    await fs.ensureDir(path.join(root, 'src', 'stallning'))
    await fs.writeFile(
      path.join(root, 'src', 'stallning', 'StallningService.ts'),
      'export const name = "stallning"',
    )
    await fs.writeFile(path.join(root, 'README.md'), '# Stallning')

    await transformTemplate(createContext(root))

    const renamedFiles = await fg('**/*MyProjectService.ts', { cwd: root, dot: true })
    expect(renamedFiles.length).toBe(1)
    expect(renamedFiles[0]?.includes('stallning')).toBe(false)

    const transformedContent = await fs.readFile(path.join(root, renamedFiles[0] as string), 'utf8')
    expect(transformedContent).toContain('my-project')

    const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8')
    expect(readme).toContain('# MyProject')
    expect(readme).not.toContain('Stallning')
  })

  it('keeps ignored test files unchanged', async () => {
    const root = await createTempDir()
    const testFile = path.join(root, 'utils', 'test.ts')
    await fs.ensureDir(path.dirname(testFile))
    await fs.writeFile(testFile, 'const title = "stallning"')

    await transformTemplate(createContext(root))

    const content = await fs.readFile(testFile, 'utf8')
    expect(content).toBe('const title = "stallning"')
  })

  it('does not mutate files in dry-run mode', async () => {
    const root = await createTempDir()
    const file = path.join(root, 'stallning.ts')
    await fs.writeFile(file, 'const project = "stallning"')

    await transformTemplate(createContext(root, true))

    expect(await fs.pathExists(file)).toBe(true)
    const content = await fs.readFile(file, 'utf8')
    expect(content).toBe('const project = "stallning"')
  })
})
