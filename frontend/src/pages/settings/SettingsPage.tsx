import { useAuthStore } from "@/store";
import { useTheme } from "@/components/common/theme/theme-context";
import { ThemeToggle } from "@/components/common/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { isOfflineMode } from "@/features/offline";

export default function SettingsPage() {
  const navigate = useNavigate()
  const { setTheme } = useTheme();
  const authState = useAuthStore((s) => s.state);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleModeSwitch = () => {
    if (isOfflineMode()) {
      // Switch to online mode
      localStorage.removeItem('ledger12.mode')
    } else {
      // Switch to offline mode
      localStorage.setItem('ledger12.mode', 'offline')
    }
    window.location.reload()
  };
  
  return (
    <div className="flex flex-col justify-center items-center px-4 items-stretch">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {authState.status === "authenticated"
                ? `Online — ${authState.user.email}`
                : authState.status === "local"
                  ? "Offline mode"
                  : "Not signed in"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {authState.status !== "local" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeSwitch}
            >
              {isOfflineMode() ? "Switch to Online Mode" : "Switch to Offline Mode"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Add, remove or edit the categories...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/categories")}
            >
              Edit Categories...
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Toggle dark/light mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <ThemeToggle />
              <Button variant={"link"} onClick={() => setTheme("default")}>
                Use auto
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}