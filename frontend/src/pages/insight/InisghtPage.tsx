import { useEffect, useState, useMemo } from "react";
import { getCategoryReport } from "@/services/reportsService";
import type { CategoryReportRow } from "@/types";
import { InsightComponent } from "@/pages/insight/InsightComponent";

export default function InisghtPage() {
  const [rows, setRows] = useState<CategoryReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    ).toISOString();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getCategoryReport({ from, to })
      .then((data) => {
        setRows(data.map((item) => ({ ...item, amount: Math.abs(item.amount)})));
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load report",
        );
        setIsLoading(false);
      });
  }, []);

  const data = useMemo<Record<string, number>>(
    () =>
      rows.reduce(
        (acc, row) => {
          acc[row.categoryName] = row.amount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [rows],
  );

  return (
    <div className="flex flex-col justify-center items-center px-4">
      <h1 className="text-2xl font-bold">Insight</h1>

      {isLoading && (
        <p className="text-muted-foreground">Loading report…</p>
      )}

      {error && (
        <p className="text-destructive">{error}</p>
      )}

      {!isLoading && !error && (
        <InsightComponent data={data} title="Expenses by category" />
      )}
    </div>
  );
}