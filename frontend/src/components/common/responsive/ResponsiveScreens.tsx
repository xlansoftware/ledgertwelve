import useMultiScreen from "@/hooks/useMultiScreen";
import { type ReactElement } from "react";

interface ResponsiveScreensProps {
  screens: ReactElement[];
}

export default function ResponsiveScreens({ screens }: ResponsiveScreensProps) {
  useMultiScreen(screens.length > 1);
  return (
    <div className="pl-4 pr-4 relative h-full flex flex-row items-start gap-4">
      {screens.map((screen, index) => (
        <div
          key={index}
          className="relative flex-1 overflow-y-auto h-[calc(100dvh-100px)]"
        >
          {screen}
        </div>
      ))}
    </div>
  );
}
