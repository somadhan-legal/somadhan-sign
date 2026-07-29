export interface WalkthroughState {
  activeStep: number
  userPaused: boolean
  cycleRevision: number
}

export type WalkthroughAction =
  | { type: 'advance'; stepCount: number }
  | { type: 'select'; step: number }
  | { type: 'toggle-pause' }

export const initialWalkthroughState: WalkthroughState = {
  activeStep: 0,
  userPaused: false,
  cycleRevision: 0,
}

export function walkthroughReducer(
  state: WalkthroughState,
  action: WalkthroughAction,
): WalkthroughState {
  if (action.type === 'advance') {
    return {
      ...state,
      activeStep: (state.activeStep + 1) % action.stepCount,
    }
  }

  if (action.type === 'select') {
    return {
      activeStep: action.step,
      userPaused: false,
      cycleRevision: state.cycleRevision + 1,
    }
  }

  return {
    ...state,
    userPaused: !state.userPaused,
  }
}
