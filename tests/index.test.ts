import { expect, test } from 'vitest'
import { AVAILABLE_BRANCHES } from '../src/constants'

test('AVAILABLE_BRANCHES contains supported templates', () => {
  expect(AVAILABLE_BRANCHES).toEqual(['minimal', 'nuxt'])
})
