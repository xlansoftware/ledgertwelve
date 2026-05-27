import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useUserStore } from "@/store/userStore"

export default function SettingsPage() {
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-semibold text-foreground">{user}</span>
        </p>
        <Button variant="destructive" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  )
}