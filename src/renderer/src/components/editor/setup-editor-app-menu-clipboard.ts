import type { editor } from 'monaco-editor'
import {
  APP_MENU_SELECTION_ACTION_EVENT,
  type AppMenuSelectionAction
} from '@/lib/app-menu-selection-actions'

/**
 * The macOS app menu binds Copy / Select All to Command+C / Command+A, so the key
 * is consumed before the renderer sees it. Monaco then gets no key to copy with,
 * and the native first-responder fallback does nothing for a web editor — Command+C
 * in a file was a no-op. Claim the app-menu action for the editor that owns text
 * focus and service it from Monaco's own model.
 */
export function setupEditorAppMenuClipboard(editorInstance: editor.IStandaloneCodeEditor): void {
  const onSelectionAction = (event: Event): void => {
    const action = (event as CustomEvent<AppMenuSelectionAction>).detail
    if (action !== 'copy' && action !== 'select-all') {
      return
    }
    // Why: several editors can be mounted (split panes, diff halves); only the one
    // holding the caret may claim the action, the rest let the fallback run.
    if (!editorInstance.hasTextFocus()) {
      return
    }
    const model = editorInstance.getModel()
    if (!model) {
      return
    }
    event.preventDefault()
    if (action === 'select-all') {
      editorInstance.setSelection(model.getFullModelRange())
      return
    }
    const selections = editorInstance.getSelections()
    if (!selections?.length) {
      return
    }
    // Why: the app's own clipboard IPC, because Monaco's clipboard service cannot
    // rely on a user gesture behind a menu accelerator.
    const text = selections
      .slice()
      .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn)
      .map((selection) => model.getValueInRange(selection))
      .join(model.getEOL())
    void window.api.ui.writeClipboardText(text)
  }

  window.addEventListener(APP_MENU_SELECTION_ACTION_EVENT, onSelectionAction)
  editorInstance.onDidDispose(() => {
    window.removeEventListener(APP_MENU_SELECTION_ACTION_EVENT, onSelectionAction)
  })
}
