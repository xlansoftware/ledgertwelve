import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';

import './index.css'
import router from "./routes";

import { worker } from './mocks/browser';
import { login } from './services';
import { Toaster } from './components/ui/sonner';
import { SuccessOverlayProvider } from './components/common/success';
import { ConfirmDialogProvider } from './components/common/dialog/ConfirmDialogContext';
import { initializeApp } from './lib/init';
import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Entry point — phases:
//   1. Show loading spinner immediately
//   2. Start MSW worker, log in
//   3. Fetch reference data (books, categories, users)
//   4. Render the real app (or an error screen on failure)
// ---------------------------------------------------------------------------

function renderApp(root: Root) {
  root.render(
    <StrictMode>
      <SuccessOverlayProvider>
        <ConfirmDialogProvider>
          <RouterProvider router={router} />
          <Toaster />
        </ConfirmDialogProvider>
      </SuccessOverlayProvider>
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

  // Phase 2 — MSW + login
  try {
    await worker.start()
    await login({ email: 'john@example.com', password: 'secret-password' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start application'
    renderError(root, message)
    return
  }

  // Phase 3 — fetch reference data
  try {
    await initializeApp()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load application data'
    renderError(root, message)
    return
  }

  // Phase 4 — render the app
  renderApp(root)
}

main()