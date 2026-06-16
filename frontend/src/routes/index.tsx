// src/routes/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Home from "../pages/Home";
import About from "../pages/About";
import NotFound from "../pages/NotFound";

const router = createBrowserRouter([
  {
    path: "/",
    // Using 'Component' is preferred with the Data Router API [citation:6]
    Component: App, 
    children: [
      {
        // This will be the default child route for the homepage
        index: true, 
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
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