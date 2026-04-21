export const AVAILABLE_BRANCHES = ['minimal', 'nuxt'] as const
export type TemplateBranch = (typeof AVAILABLE_BRANCHES)[number]

export const DEFAULT_BRANCH = AVAILABLE_BRANCHES[0]
export const DEFAULT_PROJECT_PREFIX = 'new-stallning'
export const TEMPLATE_PLACEHOLDER = 'stallning'
export const TEMPLATE_REPO_SLUG = 'Sioood/stallning'
export const STALLNING_UPSTREAM_URL = 'https://github.com/Sioood/stallning.git'
