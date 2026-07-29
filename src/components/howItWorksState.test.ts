import { describe, expect, it } from 'vitest'
import { initialWalkthroughState, walkthroughReducer } from './howItWorksState'

describe('landing walkthrough progression', () => {
  it('uses a manually selected step as a fresh autoplay starting point', () => {
    const pausedState = {
      activeStep: 1,
      userPaused: true,
      cycleRevision: 4,
    }

    expect(walkthroughReducer(pausedState, { type: 'select', step: 2 })).toEqual({
      activeStep: 2,
      userPaused: false,
      cycleRevision: 5,
    })
  })

  it('restarts autoplay even when the active step is selected again', () => {
    const state = walkthroughReducer(initialWalkthroughState, { type: 'select', step: 0 })

    expect(state.activeStep).toBe(0)
    expect(state.userPaused).toBe(false)
    expect(state.cycleRevision).toBe(1)
  })

  it('continues through the sequence and wraps after the final step', () => {
    const finalStepState = {
      activeStep: 3,
      userPaused: false,
      cycleRevision: 0,
    }

    expect(walkthroughReducer(finalStepState, { type: 'advance', stepCount: 4 }).activeStep).toBe(0)
  })
})
