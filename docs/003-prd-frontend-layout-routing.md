# PRD: Frontend Layout & Routing

**Status:** done
**Date:** 2026-05-27

---

## Summary

Add a responsive application shell (header + layout route) and wire five pages into React Router. All pages are placeholders — just a heading proving the route works. Functional implementations (forms, tables, charts) are out of scope.

---

## Route Map

| Page | Path | Component | Auth required |
|---|---|---|---|
| Home (existing, kept as-is) | `/` | `HomePage` | Yes |
| Add Transaction | `/add` | `AddTransactionPage` | Yes |
| History | `/history` | `HistoryPage` | Yes |
| Trends | `/trends` | `TrendsPage` | Yes |
| Settings | `/settings` | `SettingsPage` | Yes |
| Login (existing, unchanged) | `/login` | `LoginPage` | No |
| Catch-all | `*` | Redirect to `/` | — |

---

## Component Tree (after changes)

```
<BrowserRouter>
  <App>
    <AuthGate>                         ← unchanged, handles loading + redirect to /login
      <Routes>
        <Route path="/login" element={<LoginPage />} />   ← outside layout, unchanged
        <Route element={<AppLayout />}>                    ← NEW layout route
          <Route index element={<HomePage />} />           ← moved inside layout
          <Route path="/add" element={<AddTransactionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  </App>
</BrowserRouter>
```

---

## New Files

| File | Purpose |
|---|---|
| `src/components/layout/AppLayout.tsx` | Layout route shell — renders `<Header />` + `<Outlet />` |
| `src/components/layout/Header.tsx` | Responsive header with shadcn Tabs for navigation |
| `src/pages/AddTransactionPage.tsx` | Placeholder — renders `<h1>Add Transaction</h1>` |
| `src/pages/HistoryPage.tsx` | Placeholder — renders `<h1>History</h1>` |
| `src/pages/TrendsPage.tsx` | Placeholder — renders `<h1>Trends</h1>` |
| `src/pages/SettingsPage.tsx` | Shows current username and a Logout button |

## Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add layout route, import new pages |
| `src/components/ui/tabs.tsx` | Added via `npx shadcn@latest add tabs` |

---

## Header Design

### Desktop (≥768px / `md:`)
- **Left:** "ledger12" branding text
- **Center:** shadcn `Tabs` component with 5 tabs: Home | Add | History | Trends | Settings
- Active tab highlighted (shadcn `Tabs` handles this natively)

### Mobile (<768px)
- **Branding hidden**
- **Tabs full-width, compact:** Home | Add | History | Trends | Settings

### Active tab
- Synced to the current route using `useLocation()` from react-router-dom
- The shadcn `Tabs` `value` prop is set to the current path (e.g., `"/history"`)

---

## Settings Page

- Reads `user` from `useUserStore`
- Displays: "Signed in as **{user}**"
- Logout button calls `useUserStore.logout()` — store already handles redirect to `/login` via `AuthGate` re-evaluating `isAuthenticated`

---

## Dependencies / Prerequisites

- `npx shadcn@latest add tabs` must be run before starting (adds `src/components/ui/tabs.tsx`)
- No new npm packages required

---

## Out of Scope

- Functional transaction form (Add)
- Transaction list/table (History)
- Charts/dashboard (Trends)
- Tests for any new page or component
- Mobile hamburger/drawer navigation (tabs fit in one row for now)

---

## Design Decisions (from grilling session)

1. Keep existing `HomePage` as lightweight landing page (not replaced).
2. Layout route pattern — `AppLayout` renders `Header` + `Outlet`.
3. Responsive header: branding visible on desktop, hidden on mobile; tabs always visible.
4. Five nav items as shadcn `Tabs` — Home, Add, History, Trends, Settings.
5. Active tab highlighted via shadcn `Tabs` `value` prop synced to route.
6. Logout button lives on Settings page, not in header.
7. Placeholder pages = heading only (no forms/tables/charts).
8. No tests in scope.