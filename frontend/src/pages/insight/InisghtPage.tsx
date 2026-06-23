import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightComponent } from "@/pages/insight/InsightComponent";
import { useDailyInsight } from "@/pages/insight-daily/useDailyInsight";
import { useMonthlyInsight } from "@/pages/insight-monthly/useMonthlyInsight";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

function dailyFormatPieTitle(selectedDay: string | null): string {
  if (selectedDay === null) return "Today"
  const d = new Date(selectedDay + "T00:00:00")
  return format(d, "EEE, MMM d")
}

function monthlyFormatPieTitle(selectedMonth: string | null): string {
  if (selectedMonth === null) return "This Month"
  const [year, month] = selectedMonth.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM yyyy")
}

export default function InisghtPage() {
  const navigate = useNavigate()

  const {
    expenses: dailyExpenses,
    income: dailyInclome,
    isLoadingPie: dailyIsLoadingPie,

    selectedDay,
  } = useDailyInsight()

  const {
    expenses: monthlyExpenses,
    income: monthlyIncome,
    isLoadingPie: monthlyIsLoading,

    selectedMonth,

  } = useMonthlyInsight()

  const monthlyPieTitle = monthlyFormatPieTitle(selectedMonth)
  const monthlyHasPieData = Object.keys(monthlyExpenses).length > 0 || Object.keys(monthlyIncome).length > 0
  const monthlyShowPieSkeleton = monthlyIsLoading && !monthlyHasPieData

  const dailyPieTitle = dailyFormatPieTitle(selectedDay)
  const dailyHasPieData = Object.keys(dailyExpenses).length > 0 || Object.keys(dailyInclome).length > 0
  const dailyShowPieSkeleton = dailyIsLoadingPie && !dailyHasPieData

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 items-stretch">

      <div className="flex-1 flex flex-col items-end">
        <ButtonGroup>
          <Button variant="outline" onClick={() => navigate("/insight/daily")}>
            Month
          </Button>
          <Button variant="outline" onClick={() => navigate("/insight/monthly")}>
            Year
          </Button>
        </ButtonGroup>
      </div>
      

      {/* ── Daily Insight Card ── */}
      <section>
        {dailyShowPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-56 w-56 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : dailyHasPieData ? (
          <InsightComponent
            data={dailyExpenses}
            altData={dailyInclome}
            title={dailyPieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={dailyPieTitle}
          />
        )}
      </section>
      

      {/* ── Monthly Insight Card ── */}
      <section>
        {monthlyShowPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-56 w-56 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : monthlyHasPieData ? (
          <InsightComponent
            data={monthlyExpenses}
            altData={monthlyIncome}
            title={monthlyPieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={monthlyPieTitle}
          />
        )}
      </section>
      
    </div>
  );
}