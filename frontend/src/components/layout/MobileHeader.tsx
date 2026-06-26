import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { BarChart2, Book, ClipboardList, Plus, Settings } from 'lucide-react';

function TabButton({
  path,
  label,
  icon: Icon,
  currentPath,
  navigate,
}: {
  path: string;
  label: string;
  icon: LucideIcon;
  currentPath: string;
  navigate: (path: string) => void;
}) {
  const isActive = currentPath === path;
  return (
    <button
      aria-label={`${label} Screen`}
      onClick={() => navigate(path)}
      className={cn(
        "flex flex-col items-center justify-center",
        isActive ? "text-primary border bg-muted" : "text-muted-foreground"
      )}
    >
      <Icon size={20} />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tint = null;

  const tabs = [
    { path: "/books", label: "Books", icon: Book },
    { path: "/", label: "Add", icon: Plus },
    { path: "/history", label: "History", icon: ClipboardList },
    { path: "/insight", label: "Insight", icon: BarChart2 },
    { path: "/settings", label: "Settings", icon: Settings },
  ] as const;

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
      <div className="grid grid-cols-5 h-full">
        {tabs.map(({ path, label, icon }) => (
          <TabButton
            key={path}
            path={path}
            label={label}
            icon={icon}
            currentPath={currentPath}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}