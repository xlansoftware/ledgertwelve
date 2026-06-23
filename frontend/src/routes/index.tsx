// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import NotFoundPage from "../pages/NotFoundPage";
import LoginPage from "../pages/login/LoginPage";
import HistoryPage from "@/pages/history/HistoryPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import AddPage from "@/pages/add/AddPage";
import BookPage from "@/pages/book/BookPage";
import CreateBookPage from "@/pages/book-create/CreateBookPage";
import EditBookPage from "@/pages/book-edit/EditBookPage";
import EditTransactionPage from "@/pages/edit-transaction/EditTransactionPage";
import InisghtPage from "@/pages/insight/InisghtPage";
import InsightDailyPage from "@/pages/insight-daily/InsightDailyPage";
import InsightMonthlyPage from "@/pages/insight-monthly/InsightMonthlyPage";
import CategoriesPage from "@/pages/category/CategoriesPage";

const router = createBrowserRouter([
  {
    // Login sits as a sibling to the root layout — no Header / app chrome
    path: "/login",
    element: <LoginPage />,
  },
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
        path: "categories",
        element: <CategoriesPage />,
      },
      {
        path: "insight",
        children: [
          { index: true, element: <InisghtPage /> },
          { path: "daily", element: <InsightDailyPage /> },
          { path: "monthly", element: <InsightMonthlyPage /> },
        ],
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