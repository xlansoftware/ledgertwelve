import { Routes, Route, Navigate } from "react-router-dom"
import { AuthGate } from "@/components/auth/AuthGate"
import HomePage from "@/pages/HomePage"
import LoginPage from "@/pages/LoginPage"

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}
