"use client";
import FifaRiskRadar from "@/components/FifaRiskRadar";
import type { DashboardData } from "@/components/dashboard/DashboardGrid";

export function RiskChartWidget({ data: _data }: { data: DashboardData | null }) {
  return <FifaRiskRadar />;
}
