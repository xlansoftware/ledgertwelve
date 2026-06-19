// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import NotFoundPage from "../pages/NotFoundPage";
import HistoryPage from "@/pages/history/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import AddPage from "@/pages/add/AddPage";
import BookPage from "@/pages/books/BookPage";
import CreateBookPage from "@/pages/books/CreateBookPage";
import EditBookPage from "@/pages/books/EditBookPage";
import EditTransactionPage from "@/pages/edit-transaction/EditTransactionPage";
import InisghtPage from "@/pages/insight/InisghtPage";

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
        children: [
          { index: true, element: <BookPage /> },
          { path: "new", element: <CreateBookPage /> },
          
        ],
      },
      { 
        path: "edit-book/:bookId", 
        element: <EditBookPage /> 
      },
      {
        path: "edit-transaction/:transactionId",
        element: <EditTransactionPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "insight",
        element: <InisghtPage />,
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