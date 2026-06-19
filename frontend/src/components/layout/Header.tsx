import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import MobileHeader from "./MobileHeader";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const tint = "#ff0000";
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return (
    <header
      className={cn(
        "sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
      style={
        tint
          ? {
            backgroundColor: `color-mix(in oklab, ${tint} 10%, var(--background))`,
          }
          : {}
      }
    >
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <h1 className="text-xl font-semibold">Ledger Twelve</h1>
        </div>

        {!isMobile && (
          <Tabs
            value={currentPath}
            className="ml-auto"
            onValueChange={(value: string) => navigate(value)}
          >
            <TabsList>
              <TabsTrigger aria-label="Books Screen" value="/books">Books</TabsTrigger>
              <TabsTrigger aria-label="Add Screen" value="/">Add</TabsTrigger>
              <TabsTrigger aria-label="History Screen" value="/history">History</TabsTrigger>
              <TabsTrigger aria-label="Settings Screen" value="/settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {isMobile && (
          <MobileHeader />
        )}
      </div>
    </header>
  );
}