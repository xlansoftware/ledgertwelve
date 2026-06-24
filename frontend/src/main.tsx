import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';

import './index.css'
import router from "@/routes";

import { worker } from '@/mocks/browser';
import { useAuthStore } from '@/store';
import { Toaster } from '@/components/ui/sonner';
import { SuccessOverlayProvider } from '@/components/common/success';
import { ConfirmDialogProvider } from '@/components/common/dialog/ConfirmDialogContext';
import { initializeApp } from '@/lib/init';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from '@/components/common/theme/theme-context';
import { createOfflineFactory, createOnlineFactory, seedOfflineData, setFactory } from '@/features/offline';

// ---------------------------------------------------------------------------
// Entry point — phases:
//   1. Show loading spinner immediately
//   2. Check for offline mode — skip MSW, skip session check
//   3. Otherwise start MSW worker
//   4. Check for existing session via whoami()
//   5. If authenticated, fetch reference data (books, categories, users)
//   6. Render the real app (or error screen on failure)
//   7. Unauthenticated users are redirected to /login by the auth guard
// ---------------------------------------------------------------------------

function renderApp(root: Root) {
  root.render(
    <StrictMode>
      <ThemeProvider>
        <SuccessOverlayProvider>
          <ConfirmDialogProvider>
            <RouterProvider router={router} />
            <Toaster />
          </ConfirmDialogProvider>
        </SuccessOverlayProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

function renderLoading(root: Root) {
  root.render(
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </div>,
  )
}

function renderError(root: Root, message: string) {
  root.render(
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
      <p className="text-destructive text-sm text-center max-w-sm">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
      >
        Retry
      </button>
    </div>,
  )
}

async function main() {
  const root = createRoot(document.getElementById('root')!)

  // Phase 1 — spinner
  renderLoading(root)

  // Phase 2 — Check for offline mode
  const mode = localStorage.getItem('ledger12.mode')
  if (mode === 'offline') {
    // Offline bootstrap: skip MSW, skip session check, create offline factory
    const factory = createOfflineFactory()
    setFactory(factory)
    useAuthStore.getState()._setLocal('local')

    // Seed default data (Main book and default categories) if the database is empty
    await seedOfflineData()

    try {
      await initializeApp()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load application data'
      renderError(root, message)
      return
    }

    renderApp(root)
    return
  }

  // Phase 3 — Start MSW (online mode only, unless disabled via env var)
  if (import.meta.env.VITE_DISABLE_MSW !== 'true') {
    try {
      await worker.start()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start application'
      renderError(root, message)
      return
    }
  }

  // Phase 4 — Create online factory
  const onlineFactory = createOnlineFactory()
  setFactory(onlineFactory)

  // Phase 5 — Check for existing session
  try {
    await useAuthStore.getState().checkSession()
  } catch {
    // Not authenticated — will redirect to /login via auth guard
  }

  // Phase 6 — If authenticated, fetch reference data
  const authState = useAuthStore.getState().state
  if (authState.status === 'authenticated' || authState.status === 'local') {
    try {
      await initializeApp()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load application data'
      renderError(root, message)
      return
    }
  }

  // Phase 7 — render the app
  renderApp(root)
}

main()