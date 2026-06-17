// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import NotFoundPage from "../pages/NotFoundPage";
import HistoryPage from "@/pages/history/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import AddPage from "@/pages/add/AddPage";
import BookPage from "@/pages/books/BookPage";

const router = createBrowserRouter([
  {
    path: "/",
    // Using 'Component' is preferred with the Data Router API
    Component: App, 
    children: [
      {
        // This will be the default child route for the homepage
        index: true, 
        element: <AddPage />,
      },
      {
        path: "history",
        element: <HistoryPage />,
      },
      {
        path: "books",
        element: <BookPage />,
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
    element: <NotFoundPage />,
  },
]);

export default router;