import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

import { Book, ClipboardList, Plus, Settings } from 'lucide-react';

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tint = "#ff0000";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 z-10 w-full h-16 bg-background border-t md:hidden"
      )}
      style={
        tint
          ? {
            backgroundColor: `color-mix(in oklab, ${tint} 10%, var(--background))`,
          }
          : {}
      }
    >
      <div className="grid grid-cols-4 h-full">
        <button
          aria-label="Books Screen"
          onClick={() => navigate("/books")}
          className={`flex flex-col items-center justify-center ${currentPath === "/books" ? "text-primary" : "text-muted-foreground"
            }`}
        >
          <Book size={20} />
          <span className="text-xs mt-1">Books</span>
        </button>

        <button
          aria-label="Add Screen"
          onClick={() => navigate("/")}
          className={`flex flex-col items-center justify-center ${currentPath === "/" ? "text-primary" : "text-muted-foreground"
            }`}
        >
          <Plus size={20} />
          <span className="text-xs mt-1">Add</span>
        </button>

        <button
          aria-label="History Screen"
          onClick={() => navigate("/history")}
          className={`flex flex-col items-center justify-center ${currentPath === "/history"
              ? "text-primary"
              : "text-muted-foreground"
            }`}
        >
          <ClipboardList size={20} />
          <span className="text-xs mt-1">History</span>
        </button>

        {/* <button
          aria-label="Insights Screen"
          onClick={() => navigate("/insights")}
          className={`flex flex-col items-center justify-center ${currentPath === "/insights"
              ? "text-primary"
              : "text-muted-foreground"
            }`}
        >
          <BarChart2 size={20} />
          <span className="text-xs mt-1">Insights</span>
        </button> */}

        <button
          aria-label="Settings Screen"
          onClick={() => navigate("/settings")}
          className={`flex flex-col items-center justify-center ${currentPath === "/settings"
              ? "text-primary"
              : "text-muted-foreground"
            }`}
        >
          <Settings size={20} />
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
}