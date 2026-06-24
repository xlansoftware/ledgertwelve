// ---------------------------------------------------------------------------
// DashboardPage — responsive dashboard composing up to three pages
// based on viewport width:
//   ≤ 640px   → AddPage only
//   ≤ 920px   → AddPage + HistoryPage in ResponsiveScreens
//   > 920px   → AddPage + HistoryPage + InsightDailyPage in ResponsiveScreens
// ---------------------------------------------------------------------------

import { useMediaQuery } from "@/hooks/use-media-query";
import ResponsiveScreens from "@/components/common/responsive/ResponsiveScreens";
import AddPage from "@/pages/add/AddPage";
import HistoryPage from "@/pages/history/HistoryPage";
import InsightDailyPage from "@/pages/insight-daily/InsightDailyPage";

export default function DashboardPage() {
  const isSingleScreen = useMediaQuery("(max-width: 640px)");
  const isDoubleScreen = useMediaQuery("(max-width: 920px)");

  // Check narrowest breakpoint first so it takes precedence
  if (isSingleScreen) {
    return <AddPage />;
  }

  if (isDoubleScreen) {
    return (
      <ResponsiveScreens
        screens={[<AddPage key="add" />, <HistoryPage key="history" />]}
      />
    );
  }

  return (
    <ResponsiveScreens
      screens={[
        <AddPage key="add" />,
        <HistoryPage key="history" />,
        <InsightDailyPage key="insight-daily" />,
      ]}
    />
  );
}
