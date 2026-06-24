// ---------------------------------------------------------------------------
// SharePage — manage global shares (users shared with all owned books)
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore, useUsersStore } from "@/store"
import { useConfirmDialog } from "@/components/common/dialog/ConfirmDialogContext"

export default function SharePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) =>
    s.state.status === "authenticated" ? s.state.user : null,
  )
  const { users, isLoading, error, fetchUsers, addGlobalShare, clearError } =
    useUsersStore()
  const { confirm } = useConfirmDialog()

  const [email, setEmail] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  // Fetch fresh data on mount
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Derive shared users (everyone except the current user)
  const sharedUsers = currentUser
    ? users.filter((u) => u.id !== currentUser.id)
    : []

  const handleAdd = async () => {
    if (!email.trim()) return
    setIsAdding(true)
    setAddError(null)
    clearError()
    try {
      await addGlobalShare(email.trim())
      setEmail("")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add share"
      setAddError(message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = (userId: string, userEmail: string) => {
    confirm({
      title: "Remove shared user?",
      description: `Are you sure you want to remove ${userEmail} from all your books? They will lose access immediately.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      onConfirm: async () => {
        setRemovingIds((prev) => new Set(prev).add(userId))
        try {
          await useUsersStore.getState().removeGlobalShare(userId)
        } catch {
          // Error is set in the store
        } finally {
          setRemovingIds((prev) => {
            const next = new Set(prev)
            next.delete(userId)
            return next
          })
        }
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd()
    }
  }

  const displayError = addError || error

  return (
    <div className="flex flex-col px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shared Users</h1>
        <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
          Back to Settings
        </Button>
      </div>

      {/* Shared users list */}
      <Card>
        <CardHeader>
          <CardTitle>Users with access</CardTitle>
          <CardDescription>
            {sharedUsers.length === 0
              ? "No shared users yet. Invite someone by entering their email below."
              : `${sharedUsers.length} user(s) have access to all your books.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && sharedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sharedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shared users yet. Invite someone by entering their email below.
            </p>
          ) : (
            <ul className="space-y-2">
              {sharedUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm">{u.email}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={removingIds.has(u.id)}
                    onClick={() => handleRemove(u.id, u.email)}
                  >
                    {removingIds.has(u.id) ? "Removing..." : "Remove"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add share form */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Add a user</CardTitle>
          <CardDescription>
            Enter the email of a registered user to grant them edit access to all
            your books.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="share-email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="share-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setAddError(null)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isAdding}
                />
                <Button onClick={handleAdd} disabled={isAdding || !email.trim()}>
                  {isAdding ? "Adding..." : "Add Share"}
                </Button>
              </div>
            </div>
            {displayError && (
              <p className="text-sm text-destructive">{displayError}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
