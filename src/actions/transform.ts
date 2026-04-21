import fg from 'fast-glob'
import fs from 'fs-extra'
import { basename, dirname, extname, join } from 'node:path'
import { logger } from '../logger'
import { TEMPLATE_PLACEHOLDER } from '../constants'
import type { CreateContext } from './types'

const IGNORED_PATHS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/.output/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/test.*',
  '**/*.{test,spec}.*',
  '**/*.lock',
]

// from https://github.com/sindresorhus/binary-extensions/blob/main/binary-extensions.json
const RAW_BINARY_EXTENSIONS = [
  '3dm',
  '3ds',
  '3g2',
  '3gp',
  '7z',
  'a',
  'aac',
  'adp',
  'afdesign',
  'afphoto',
  'afpub',
  'ai',
  'aif',
  'aiff',
  'alz',
  'ape',
  'apk',
  'appimage',
  'ar',
  'arj',
  'asf',
  'au',
  'avi',
  'bak',
  'baml',
  'bh',
  'bin',
  'bk',
  'bmp',
  'btif',
  'bz2',
  'bzip2',
  'cab',
  'caf',
  'cgm',
  'class',
  'cmx',
  'cpio',
  'cr2',
  'cr3',
  'cur',
  'dat',
  'dcm',
  'deb',
  'dex',
  'djvu',
  'dll',
  'dmg',
  'dng',
  'doc',
  'docm',
  'docx',
  'dot',
  'dotm',
  'dra',
  'DS_Store',
  'dsk',
  'dts',
  'dtshd',
  'dvb',
  'dwg',
  'dxf',
  'ecelp4800',
  'ecelp7470',
  'ecelp9600',
  'egg',
  'eol',
  'eot',
  'epub',
  'exe',
  'f4v',
  'fbs',
  'fh',
  'fla',
  'flac',
  'flatpak',
  'fli',
  'flv',
  'fpx',
  'fst',
  'fvt',
  'g3',
  'gh',
  'gif',
  'graffle',
  'gz',
  'gzip',
  'h261',
  'h263',
  'h264',
  'icns',
  'ico',
  'ief',
  'img',
  'ipa',
  'iso',
  'jar',
  'jpeg',
  'jpg',
  'jpgv',
  'jpm',
  'jxr',
  'key',
  'ktx',
  'lha',
  'lib',
  'lvp',
  'lz',
  'lzh',
  'lzma',
  'lzo',
  'm3u',
  'm4a',
  'm4v',
  'mar',
  'mdi',
  'mht',
  'mid',
  'midi',
  'mj2',
  'mka',
  'mkv',
  'mmr',
  'mng',
  'mobi',
  'mov',
  'movie',
  'mp3',
  'mp4',
  'mp4a',
  'mpeg',
  'mpg',
  'mpga',
  'mxu',
  'nef',
  'npx',
  'numbers',
  'nupkg',
  'o',
  'odp',
  'ods',
  'odt',
  'oga',
  'ogg',
  'ogv',
  'otf',
  'ott',
  'pages',
  'pbm',
  'pcx',
  'pdb',
  'pdf',
  'pea',
  'pgm',
  'pic',
  'png',
  'pnm',
  'pot',
  'potm',
  'potx',
  'ppa',
  'ppam',
  'ppm',
  'pps',
  'ppsm',
  'ppsx',
  'ppt',
  'pptm',
  'pptx',
  'psd',
  'pya',
  'pyc',
  'pyo',
  'pyv',
  'qt',
  'rar',
  'ras',
  'raw',
  'resources',
  'rgb',
  'rip',
  'rlc',
  'rmf',
  'rmvb',
  'rpm',
  'rtf',
  'rz',
  's3m',
  's7z',
  'scpt',
  'sgi',
  'shar',
  'snap',
  'sil',
  'sketch',
  'slk',
  'smv',
  'snk',
  'so',
  'stl',
  'suo',
  'sub',
  'swf',
  'tar',
  'tbz',
  'tbz2',
  'tga',
  'tgz',
  'thmx',
  'tif',
  'tiff',
  'tlz',
  'ttc',
  'ttf',
  'txz',
  'udf',
  'uvh',
  'uvi',
  'uvm',
  'uvp',
  'uvs',
  'uvu',
  'viv',
  'vob',
  'war',
  'wav',
  'wax',
  'wbmp',
  'wdp',
  'weba',
  'webm',
  'webp',
  'whl',
  'wim',
  'wm',
  'wma',
  'wmv',
  'wmx',
  'woff',
  'woff2',
  'wrm',
  'wvx',
  'xbm',
  'xif',
  'xla',
  'xlam',
  'xls',
  'xlsb',
  'xlsm',
  'xlsx',
  'xlt',
  'xltm',
  'xltx',
  'xm',
  'xmind',
  'xpi',
  'xpm',
  'xwd',
  'xz',
  'z',
  'zip',
  'zipx',
  'wasm',
]

const BINARY_EXTENSIONS = new Set(
  RAW_BINARY_EXTENSIONS.map((extension) => extension.toLowerCase())
    .filter((extension) => extension !== 'ds_store')
    .map((extension) => `.${extension}`),
)

const BINARY_FILENAMES = new Set(['.ds_store'])

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

const isTextFile = (path: string): boolean => {
  if (BINARY_FILENAMES.has(basename(path).toLowerCase())) {
    return false
  }

  return !BINARY_EXTENSIONS.has(extname(path).toLowerCase())
}

export const transformTemplate = async (ctx: CreateContext): Promise<void> => {
  const entries = await fg('**/*', {
    cwd: ctx.targetPath,
    dot: true,
    onlyFiles: false,
    ignore: IGNORED_PATHS,
  })

  const fileRenameCandidates: string[] = []
  const directoryRenameCandidates: string[] = []

  for (const relativePath of entries) {
    const absolutePath = join(ctx.targetPath, relativePath)
    const stat = await fs.stat(absolutePath)

    if (relativePath.toLowerCase().includes(TEMPLATE_PLACEHOLDER)) {
      if (stat.isDirectory()) {
        directoryRenameCandidates.push(relativePath)
      } else if (stat.isFile()) {
        fileRenameCandidates.push(relativePath)
      }
    }

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

  const sortedFiles = [...fileRenameCandidates].sort(depthDescending)
  for (const relativePath of sortedFiles) {
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

  const sortedDirectories = [...directoryRenameCandidates].sort(depthDescending)
  for (const relativePath of sortedDirectories) {
    const replacedPath = replaceCaseAware(relativePath, ctx.projectName)
    if (replacedPath === relativePath) {
      continue
    }

    const oldAbsolute = join(ctx.targetPath, relativePath)
    const newAbsolute = join(ctx.targetPath, replacedPath)
    if (!(await fs.pathExists(oldAbsolute))) {
      continue
    }

    if (ctx.dryRun) {
      logger.info(`[dry-run] rename ${relativePath} -> ${replacedPath}`)
      continue
    }

    if (await fs.pathExists(newAbsolute)) {
      await fs.remove(oldAbsolute)
      continue
    }

    await fs.move(oldAbsolute, newAbsolute)
  }
}
