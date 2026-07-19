import { describe, expect, it } from 'vitest'
import { isMissingEdgeFunction } from './edgeFunctionError'

describe('isMissingEdgeFunction', () => {
  it('allows the compatibility path only for an explicit 404 response', () => {
    expect(isMissingEdgeFunction({ context: { status: 404 } })).toBe(true)
  })

  it('fails closed for network and server failures', () => {
    expect(isMissingEdgeFunction({ name: 'FunctionsFetchError', message: 'Failed to send a request' })).toBe(false)
    expect(isMissingEdgeFunction({ context: { status: 500 }, message: 'Server error' })).toBe(false)
    expect(isMissingEdgeFunction(new Error('Not found'))).toBe(false)
  })
})
