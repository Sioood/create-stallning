import fg from 'fast-glob'
import fs from 'fs-extra'
import { dirname, extname, join } from 'node:path'
import { logger } from '../logger'
import { TEMPLATE_PLACEHOLDER } from '../constants'
import type { CreateContext } from './types'

const IGNORED_PATHS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/.output/**',
  '**/.nuxt/**',
]

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.zip',
  '.gz',
  '.tar',
  '.mp4',
  '.mp3',
])

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')

const replaceCaseAware = (input: string, projectName: string): string => {
  const pascalName = toPascalCase(projectName)
  const upperName = projectName.toUpperCase()

  return input
    .replace(/STALLNING/g, upperName)
    .replace(/Stallning/g, pascalName)
    .replace(/stallning/g, projectName)
}

const depthDescending = (a: string, b: string): number => b.split('/').length - a.split('/').length

const isTextFile = (path: string): boolean => !BINARY_EXTENSIONS.has(extname(path).toLowerCase())

export const transformTemplate = async (ctx: CreateContext): Promise<void> => {
  const entries = await fg('**/*', {
    cwd: ctx.targetPath,
    dot: true,
    onlyFiles: false,
    ignore: IGNORED_PATHS,
  })

  for (const relativePath of entries) {
    const absolutePath = join(ctx.targetPath, relativePath)
    const stat = await fs.stat(absolutePath)

    if (!stat.isFile() || !isTextFile(relativePath)) {
      continue
    }

    const content = await fs.readFile(absolutePath, 'utf8')
    const replacedContent = replaceCaseAware(content, ctx.projectName)

    if (content === replacedContent) {
      continue
    }

    if (ctx.dryRun) {
      logger.info(`[dry-run] replace placeholder in ${relativePath}`)
      continue
    }

    await fs.writeFile(absolutePath, replacedContent, 'utf8')
  }

  const sortedEntries = [...entries].sort(depthDescending)
  for (const relativePath of sortedEntries) {
    if (!relativePath.toLowerCase().includes(TEMPLATE_PLACEHOLDER)) {
      continue
    }

    const replacedPath = replaceCaseAware(relativePath, ctx.projectName)
    if (replacedPath === relativePath) {
      continue
    }

    if (ctx.dryRun) {
      logger.info(`[dry-run] rename ${relativePath} -> ${replacedPath}`)
      continue
    }

    const oldAbsolute = join(ctx.targetPath, relativePath)
    const newAbsolute = join(ctx.targetPath, replacedPath)
    await fs.ensureDir(dirname(newAbsolute))
    await fs.move(oldAbsolute, newAbsolute, { overwrite: true })
  }
}
