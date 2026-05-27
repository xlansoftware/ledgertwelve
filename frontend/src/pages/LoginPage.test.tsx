import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, beforeEach } from "vitest"
import LoginPage from "./LoginPage"
import { useUserStore } from "@/store/userStore"

describe("LoginPage", () => {
  beforeEach(() => {
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it("renders username and password inputs", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /sign in/i })
    expect(button).toBeInTheDocument()
  })

  it("does not render when already authenticated", () => {
    useUserStore.setState({
      user: "Alice",
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.queryAllByText("Sign in").length).toBe(0)
  })
})
