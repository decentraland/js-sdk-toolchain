import path from 'path'

/**
 * Records which project files were last written by the editor itself — the
 * `--data-layer` autosave (`main.composite`, `entity-names.ts`, imported assets) and
 * the bundle rebuild those writes trigger (`bin/index.js`, `main.crdt`) — so the
 * hot-reload notifier can tell them apart from a code change made in an IDE.
 *
 * Why this exists: the inspector already applies its own edits to the running scene
 * live, so a SCENE_UPDATE for the files it just saved makes the editor reload the
 * whole scene for nothing. The editor cannot filter that on its side: the message
 * carries no file name, and only this process knows a rebuild was caused by its own
 * autosave. See `file-watch-notifier.ts` for the consumer.
 *
 * Marks expire so a hand edit of a marked file long after the autosave is still
 * reported. The TTL only has to outlive the watcher latency between a write and its
 * chokidar event; it is generous because the rebuild runs in between for outputs.
 */
export type EditorWriteTracker = {
  /** Record that the editor wrote (or removed) `absolutePath`, or the directory it names. */
  markEditorWrite(absolutePath: string): void
  /**
   * Record the outputs a rebuild is about to write. They inherit the editor origin
   * only when every file that triggered the rebuild was an editor write; a rebuild
   * caused by any other change (an IDE save) is a real code change and clears any
   * earlier editor mark on those outputs.
   */
  markRebuildOutputs(triggerPaths: string[], outputPaths: string[]): void
  /** Was `absolutePath` (or a directory containing it) last written by the editor, within the TTL? */
  isEditorWrite(absolutePath: string): boolean
}

export const EDITOR_WRITE_TTL_MS = 10_000

export function createEditorWriteTracker(options: { ttlMs?: number; now?: () => number } = {}): EditorWriteTracker {
  const ttlMs = options.ttlMs ?? EDITOR_WRITE_TTL_MS
  const now = options.now ?? Date.now
  const markedAt = new Map<string, number>()

  const normalize = (absolutePath: string) => path.normalize(absolutePath)

  const isFresh = (candidate: string, at: number) => {
    const marked = markedAt.get(candidate)
    return marked !== undefined && at - marked < ttlMs
  }

  const markEditorWrite = (absolutePath: string) => {
    markedAt.set(normalize(absolutePath), now())
  }

  const isEditorWrite = (absolutePath: string) => {
    const at = now()
    let candidate = normalize(absolutePath)
    while (true) {
      if (isFresh(candidate, at)) return true
      const parent = path.dirname(candidate)
      if (parent === candidate) return false
      candidate = parent
    }
  }

  return {
    markEditorWrite,
    isEditorWrite,
    markRebuildOutputs(triggerPaths, outputPaths) {
      const editorTriggered = triggerPaths.length > 0 && triggerPaths.every(isEditorWrite)
      for (const outputPath of outputPaths) {
        if (editorTriggered) markEditorWrite(outputPath)
        else markedAt.delete(normalize(outputPath))
      }
    }
  }
}
