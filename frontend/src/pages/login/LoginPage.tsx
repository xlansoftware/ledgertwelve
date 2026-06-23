// ---------------------------------------------------------------------------
// Login Page — standalone, no Header / app chrome
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store"
import { login as apiLogin } from "@/services/authService"
import { ApiError } from "@/services/api"
import { Loader2 } from "lucide-react"
import { initializeApp } from "@/lib/init"
import { isOfflineMode } from "@/features/offline"

export default function LoginPage() {
  const navigate = useNavigate()
  const _setAuthenticated = useAuthStore((s) => s._setAuthenticated)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      return
    }

    setLoading(true)
    try {
      const user = await apiLogin({ email: email.trim(), password })
      _setAuthenticated(user)
      await initializeApp()
      navigate("/", { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password")
      } else {
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOfflineMode = () => {
    localStorage.setItem('ledger12.mode', 'offline')
    window.location.reload()
    window.location.href = "/"
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">ledger12</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleOfflineMode}
              disabled={loading}
            >
              {isOfflineMode() ? "Restart in Online Mode" : "Use App Offline"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}