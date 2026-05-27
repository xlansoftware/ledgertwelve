import { useLocation, useNavigate } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const navItems = [
  { path: "/", label: "Home" },
  { path: "/add", label: "Add" },
  { path: "/history", label: "History" },
  { path: "/trends", label: "Trends" },
  { path: "/settings", label: "Settings" },
] as const

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header className="border-b">
      <div className="mx-auto flex items-center gap-4 px-4 py-2 md:justify-between">
        {/* Branding — hidden on mobile */}
        <span className="hidden font-heading text-sm font-semibold md:inline">
          ledger12
        </span>

        {/* Navigation tabs — full-width on mobile */}
        <Tabs
          value={location.pathname}
          onValueChange={(value) => navigate(value)}
          className="w-full md:w-auto"
        >
          <TabsList variant="line" className="w-full md:w-auto">
            {navItems.map((item) => (
              <TabsTrigger
                key={item.path}
                value={item.path}
                className="flex-1 md:flex-none"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </header>
  )
}