import type { FieldType } from '@/lib/fieldPlacement'

export interface EditorFieldInteractionState {
  selectedFieldId: string | null
  activeFieldType: FieldType | null
}

export type EditorFieldInteractionAction =
  | { type: 'choose-field-tool'; fieldType: FieldType }
  | { type: 'choose-pointer-tool' }
  | { type: 'place-field'; fieldId: string }
  | { type: 'select-field'; fieldId: string }
  | { type: 'clear-selection' }
  | { type: 'remove-field'; fieldId: string }
  | { type: 'reset' }

export const initialEditorFieldInteractionState: EditorFieldInteractionState = {
  selectedFieldId: null,
  activeFieldType: null,
}

/**
 * Keeps field selection and placement mode independent. This lets an author
 * inspect the field they just placed while the same tool remains ready for
 * repeated placement elsewhere in the document.
 */
export function editorFieldInteractionReducer(
  state: EditorFieldInteractionState,
  action: EditorFieldInteractionAction,
): EditorFieldInteractionState {
  switch (action.type) {
    case 'choose-field-tool':
      return { selectedFieldId: null, activeFieldType: action.fieldType }
    case 'choose-pointer-tool':
      return { ...state, activeFieldType: null }
    case 'place-field':
    case 'select-field':
      return { ...state, selectedFieldId: action.fieldId }
    case 'clear-selection':
      return { ...state, selectedFieldId: null }
    case 'remove-field':
      return state.selectedFieldId === action.fieldId
        ? { ...state, selectedFieldId: null }
        : state
    case 'reset':
      return initialEditorFieldInteractionState
  }
}
