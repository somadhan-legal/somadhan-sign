export type SignedSignerRecoveryAction =
  | 'show-finished'
  | 'retry-completion-check'
  | 'retry-finalization'

export function getSignedSignerRecoveryAction(
  documentStatus: string,
  allSignersSigned: boolean,
  completionCheckFailed: boolean,
): SignedSignerRecoveryAction {
  if (documentStatus === 'completed') return 'show-finished'
  if (completionCheckFailed) return 'retry-completion-check'
  return allSignersSigned ? 'retry-finalization' : 'show-finished'
}
