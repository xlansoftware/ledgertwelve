import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-context";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(
      (theme === "default" ? resolvedTheme : theme) === "dark"
        ? "light"
        : "dark"
    );
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {(theme === "default" ? resolvedTheme : theme) === "dark" ? (
        <Sun />
      ) : (
        <Moon />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
