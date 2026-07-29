export type SigningFieldState = 'required' | 'current' | 'completed' | 'other'

export function getSigningFieldState(
  isAssignedToActiveSigner: boolean,
  isCompleted: boolean,
  isCurrent: boolean,
): SigningFieldState {
  if (!isAssignedToActiveSigner) return 'other'
  if (isCompleted) return 'completed'
  return isCurrent ? 'current' : 'required'
}
