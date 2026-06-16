// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import NotFound from "../pages/NotFound";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    // Using 'Component' is preferred with the Data Router API [citation:6]
    Component: App, 
    children: [
      {
        // This will be the default child route for the homepage
        index: true, 
        element: <HomePage />,
      },
      {
        path: "history",
        element: <HistoryPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
  {
    // Catch-all route for a 404 page
    path: "*",
    element: <NotFound />,
  },
]);

export default router;