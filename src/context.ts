import { z } from 'zod'
import { AVAILABLE_BRANCHES } from './constants'
import type { CreateContext } from './actions/types'

const PROJECT_NAME_REGEX = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/

const createContextSchema = z.object({
  projectName: z
    .string()
    .min(1, 'projectName is required')
    .max(214, 'projectName is too long')
    .regex(PROJECT_NAME_REGEX, 'projectName must follow npm package naming conventions'),
  template: z.enum(AVAILABLE_BRANCHES),
  targetPath: z.string().min(1, 'targetPath is required'),
  dryRun: z.boolean(),
  verbose: z.boolean(),
  skipInstall: z.boolean(),
  gitOrigin: z.string().url().optional(),
  upstream: z.boolean(),
  strictGit: z.boolean(),
})

export const parseCreateContext = (input: unknown): Readonly<CreateContext> => {
  const result = createContextSchema.safeParse(input)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid create context: ${details}`)
  }

  return Object.freeze(result.data)
}
