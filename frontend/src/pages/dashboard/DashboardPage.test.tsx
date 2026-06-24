// ---------------------------------------------------------------------------
// Component tests — DashboardPage
// ---------------------------------------------------------------------------

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock child pages as simple test-id markers so tests focus on layout
vi.mock("@/pages/add/AddPage", () => ({
  default: () => <div data-testid="add-page">AddPage</div>,
}));

vi.mock("@/pages/history/HistoryPage", () => ({
  default: () => <div data-testid="history-page">HistoryPage</div>,
}));

vi.mock("@/pages/insight-daily/InsightDailyPage", () => ({
  default: () => <div data-testid="insight-daily-page">InsightDailyPage</div>,
}));

// Mock ResponsiveScreens to expose its screen count via data attribute
vi.mock("@/components/common/responsive/ResponsiveScreens", () => ({
  default: ({ screens }: { screens: React.ReactElement[] }) => (
    <div data-testid="responsive-screens" data-screen-count={screens.length}>
      {screens.map((screen, i) => (
        <div key={i} data-testid={`screen-${i}`}>
          {screen}
        </div>
      ))}
    </div>
  ),
}));

// Mock useMediaQuery — controlled via mockUseMediaQuery helper
const mockUseMediaQuery = vi.fn();
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPage", () => {
  it("renders only AddPage when single screen (≤640px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 640px)") return true;
      if (query === "(max-width: 920px)") return true;
      return false;
    });

    render(<DashboardPage />);

    expect(screen.getByTestId("add-page")).toBeInTheDocument();
    expect(screen.queryByTestId("responsive-screens")).not.toBeInTheDocument();
  });

  it("renders ResponsiveScreens with 2 screens when double (>640px, ≤920px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 640px)") return false;
      if (query === "(max-width: 920px)") return true;
      return false;
    });

    render(<DashboardPage />);

    const screens = screen.getByTestId("responsive-screens");
    expect(screens).toBeInTheDocument();
    expect(screens).toHaveAttribute("data-screen-count", "2");
    expect(screen.getByTestId("add-page")).toBeInTheDocument();
    expect(screen.getByTestId("history-page")).toBeInTheDocument();
    expect(screen.queryByTestId("insight-daily-page")).not.toBeInTheDocument();
  });

  it("renders ResponsiveScreens with 3 screens when wide (>920px)", () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === "(max-width: 640px)") return false;
      if (query === "(max-width: 920px)") return false;
      return false;
    });

    render(<DashboardPage />);

    const screens = screen.getByTestId("responsive-screens");
    expect(screens).toBeInTheDocument();
    expect(screens).toHaveAttribute("data-screen-count", "3");
    expect(screen.getByTestId("add-page")).toBeInTheDocument();
    expect(screen.getByTestId("history-page")).toBeInTheDocument();
    expect(screen.getByTestId("insight-daily-page")).toBeInTheDocument();
  });
});
