import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, whoami } = useUserStore()
  const location = useLocation()

  useEffect(() => {
    whoami()
  }, [whoami])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
