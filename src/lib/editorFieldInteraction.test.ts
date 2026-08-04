import { describe, expect, it } from 'vitest'
import {
  editorFieldInteractionReducer,
  initialEditorFieldInteractionState,
} from './editorFieldInteraction'

describe('editorFieldInteractionReducer', () => {
  it('keeps the active tool armed and selects each newly placed field', () => {
    const armed = editorFieldInteractionReducer(initialEditorFieldInteractionState, {
      type: 'choose-field-tool',
      fieldType: 'signature',
    })
    const firstPlacement = editorFieldInteractionReducer(armed, {
      type: 'place-field',
      fieldId: 'field-1',
    })
    const secondPlacement = editorFieldInteractionReducer(firstPlacement, {
      type: 'place-field',
      fieldId: 'field-2',
    })

    expect(firstPlacement).toEqual({ selectedFieldId: 'field-1', activeFieldType: 'signature' })
    expect(secondPlacement).toEqual({ selectedFieldId: 'field-2', activeFieldType: 'signature' })
  })

  it('selects an existing field without disarming the active tool', () => {
    const state = editorFieldInteractionReducer(
      { selectedFieldId: 'field-1', activeFieldType: 'date' },
      { type: 'select-field', fieldId: 'field-2' },
    )

    expect(state).toEqual({ selectedFieldId: 'field-2', activeFieldType: 'date' })
  })

  it('clears only the inspector on blank space and exits placement only with the pointer tool', () => {
    const selected = { selectedFieldId: 'field-1', activeFieldType: 'checkbox' as const }

    expect(editorFieldInteractionReducer(selected, { type: 'clear-selection' })).toEqual({
      selectedFieldId: null,
      activeFieldType: 'checkbox',
    })
    expect(editorFieldInteractionReducer(selected, { type: 'choose-pointer-tool' })).toEqual({
      selectedFieldId: 'field-1',
      activeFieldType: null,
    })
  })
})
