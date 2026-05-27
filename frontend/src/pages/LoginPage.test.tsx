import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import LoginPage from "./LoginPage"

describe("LoginPage", () => {
  it("renders the login heading", () => {
    render(<LoginPage />)

    expect(screen.getByRole("heading", { name: /^login$/i })).toBeInTheDocument()
  })

  it("renders a sign in button", () => {
    render(<LoginPage />)

    const button = screen.getByRole("button", { name: /sign in/i })
    expect(button).toBeInTheDocument()
  })
})