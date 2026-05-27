import { Outlet } from "react-router-dom"
import Header from "@/components/layout/Header"

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}