import { Routes, Route, Navigate } from "react-router-dom"
import { AuthGate } from "@/components/auth/AuthGate"
import AppLayout from "@/components/layout/AppLayout"
import HomePage from "@/pages/HomePage"
import LoginPage from "@/pages/LoginPage"
import AddTransactionPage from "@/pages/AddTransactionPage"
import HistoryPage from "@/pages/HistoryPage"
import TrendsPage from "@/pages/TrendsPage"
import SettingsPage from "@/pages/SettingsPage"

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/add" element={<AddTransactionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}
