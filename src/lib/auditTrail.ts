import type { AuditTrailEntry } from '@/types/database'

export const appendUniqueAuditEntry = (
  auditTrail: AuditTrailEntry[],
  entry: AuditTrailEntry,
) => auditTrail.some((candidate) => candidate.id === entry.id)
  ? auditTrail.map((candidate) => candidate.id === entry.id ? entry : candidate)
  : [...auditTrail, entry]
