// ---------------------------------------------------------------------------
// useImportStore — Zustand cross-page state for the import workflow
// ---------------------------------------------------------------------------

import { create } from "zustand"
import type { ImportEntityType, ImportResult } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete"

export interface ParsedFileInfo {
  fileName: string
  parsedColumns: string[]
  parsedRows: Record<string, string>[]
  sheetNames: string[] | null
  selectedSheet: string | null
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface ImportState {
  /** Current step in the import workflow */
  step: ImportStep
  /** The type of data being imported */
  entityType: ImportEntityType | null
  /** Fallback target book for transactions */
  bookId: string | null
  /** Whether to clear existing data before importing */
  clearExisting: boolean
  /** Whether to invert (multiply by -1) the amount column when importing */
  invertAmount: boolean
  /** Parsed file info */
  fileInfo: ParsedFileInfo | null
  /** Source column → target field mapping (null = ignored) */
  mapping: Record<string, string | null>
  /** Converted rows (target field keys, typed values) */
  convertedRows: Record<string, unknown>[]
  /** Server/offline preview/import result */
  importResult: ImportResult | null
  /** Parsed backup JSON data (backup restore only) */
  backupData: Record<string, unknown> | null
  /** Whether the user wants to resume a previous session */
  showResumePrompt: boolean
  /** Error message for the current step */
  error: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface ImportActions {
  setStep: (step: ImportStep) => void
  setEntityType: (entityType: ImportEntityType | null) => void
  setBookId: (bookId: string | null) => void
  setClearExisting: (clear: boolean) => void
  setInvertAmount: (invert: boolean) => void
  setFileInfo: (info: ParsedFileInfo | null) => void
  setMapping: (mapping: Record<string, string | null>) => void
  setConvertedRows: (rows: Record<string, unknown>[]) => void
  setImportResult: (result: ImportResult | null) => void
  setBackupData: (data: Record<string, unknown> | null) => void
  setError: (error: string | null) => void
  showResume: () => void
  hideResume: () => void
  /** Check if there's a session to resume */
  hasSession: () => boolean
  /** Reset everything — starts fresh */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: ImportState = {
  step: "upload",
  entityType: null,
  bookId: null,
  clearExisting: false,
  invertAmount: false,
  fileInfo: null,
  mapping: {},
  convertedRows: [],
  importResult: null,
  backupData: null,
  showResumePrompt: false,
  error: null,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useImportStore = create<ImportState & ImportActions>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setEntityType: (entityType) => set({ entityType: entityType as ImportEntityType | null }),

  setBookId: (bookId) => set({ bookId }),

  setClearExisting: (clear) => set({ clearExisting: clear }),

  setInvertAmount: (invert) => set({ invertAmount: invert }),

  setFileInfo: (info) => set({ fileInfo: info, error: null }),

  setMapping: (mapping) => set({ mapping }),

  setConvertedRows: (rows) => set({ convertedRows: rows }),

  setImportResult: (result) => set({ importResult: result }),

  setBackupData: (data) => set({ backupData: data }),

  setError: (error) => set({ error }),

  showResume: () => set({ showResumePrompt: true }),

  hideResume: () => set({ showResumePrompt: false }),

  hasSession: () => {
    const state = get()
    return (
      state.entityType !== null ||
      state.fileInfo !== null ||
      state.step !== "upload"
    )
  },

  reset: () => set(initialState),
}))
