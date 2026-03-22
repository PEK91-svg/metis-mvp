"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import WidgetContainer from "./WidgetContainer";
import { KpiWidget } from "./widgets/KpiWidget";
import { PortfolioHealthWidget } from "./widgets/PortfolioHealthWidget";
import RecommendationsWidget from "./widgets/RecommendationsWidget";
import { PipelineChartWidget } from "./widgets/PipelineChartWidget";
import { RiskChartWidget } from "./widgets/RiskChartWidget";
import { Settings, Plus, Maximize2, X } from "lucide-react";

export type WidgetType = "KPI" | "HEALTH" | "RECOMMENDATIONS" | "PIPELINE" | "RISK";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  w: number; // width in columns
  h: number; // height in rows
}

const WIDGET_TITLES: Record<WidgetType, string> = {
  KPI: "Key Performance Indicators",
  HEALTH: "Portfolio Health",
  RECOMMENDATIONS: "AI Recommendations",
  PIPELINE: "Pipeline Flow",
  RISK: "Risk Analysis",
};

const INITIAL_WIDGETS: DashboardWidget[] = [
  { id: "1", type: "KPI", title: WIDGET_TITLES.KPI, w: 1, h: 2 },
  { id: "2", type: "HEALTH", title: WIDGET_TITLES.HEALTH, w: 1, h: 2 },
  { id: "3", type: "RECOMMENDATIONS", title: WIDGET_TITLES.RECOMMENDATIONS, w: 1, h: 2 },
  { id: "4", type: "PIPELINE", title: WIDGET_TITLES.PIPELINE, w: 2, h: 2 },
  { id: "5", type: "RISK", title: WIDGET_TITLES.RISK, w: 1, h: 2 },
];

interface DashboardGridProps {
  data: any; // The KPI data passed from home/page.tsx
}

export default function DashboardGrid({ data }: DashboardGridProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(INITIAL_WIDGETS);
  const [mounted, setMounted] = useState(false);
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null);

  useEffect(() => {
    // Load persisted layout
    const saved = localStorage.getItem("metis-dashboard-layout");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {}
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("metis-dashboard-layout", JSON.stringify(widgets));
    }
  }, [widgets, mounted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: Date.now().toString(),
      type,
      title: WIDGET_TITLES[type],
      w: type === "PIPELINE" ? 2 : 1, // Pipeline defaults to wider
      h: 2,
    };
    setWidgets([newWidget, ...widgets]);
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="w-full mb-8">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-[var(--font-space)] tracking-wide text-[#00E5FF]">
          Command Center
        </h2>
        <div className="flex gap-2">
          {isEditMode && (
            <div className="flex gap-2 mr-4 animate-[fadeIn_0.2s_ease-out]">
              {["KPI", "HEALTH", "RECOMMENDATIONS", "PIPELINE", "RISK"].map((t) => (
                <button
                  key={t}
                  onClick={() => addWidget(t as WidgetType)}
                  className="flex items-center gap-1 text-[10px] uppercase text-[#00E5FF] bg-[#0A0F14] px-3 py-1.5 rounded-full border border-white/10 hover:text-[#00E5FF] hover:border-[#00E5FF] transition-colors"
                >
                  <Plus size={12} /> {t}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl border transition-colors shadow-lg ${
              isEditMode
                ? "bg-[#00E5FF] text-[#0A0F14] border-[#00E5FF] shadow-[#00E5FF]/10"
                : "bg-[#0A0F14] text-[#00E5FF] border-white/10 hover:bg-[#111820] shadow-black/50"
            }`}
          >
            <Settings size={14} />
            {isEditMode ? "Save Layout" : "Customize"}
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-min gap-4">
            {widgets.map((w) => {
              const spanClassMap: Record<number, string> = { 1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4" };
              const rowClassMap: Record<number, string> = { 1: "row-span-1", 2: "row-span-2", 3: "row-span-3" };
              const spanClasses = `${spanClassMap[w.w] || "md:col-span-1"} ${rowClassMap[w.h] || "row-span-2"}`;
              
              const renderContent = () => {
                switch (w.type) {
                  case "KPI": return <KpiWidget data={data} />;
                  case "HEALTH": return <PortfolioHealthWidget />;
                  case "RECOMMENDATIONS": return <RecommendationsWidget />;
                  case "PIPELINE": return <PipelineChartWidget data={data} />;
                  case "RISK": return <RiskChartWidget data={data} />;
                  default: return null;
                }
              };

              return (
                <WidgetContainer
                  key={w.id}
                  id={w.id}
                  title={w.title}
                  isEditMode={isEditMode}
                  onRemove={removeWidget}
                  onMaximize={() => setMaximizedWidget(w.id)}
                  headerRight={<span className="text-[10px] border border-white/10 px-2 py-0.5 rounded-full">LIVE</span>}
                  className={spanClasses}
                >
                  {renderContent()}
                </WidgetContainer>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Maximized Widget Modal */}
      {maximizedWidget && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="w-full h-full max-w-7xl bg-[#0A0F14] border border-[#00E5FF]/30 rounded-[32px] shadow-[0_0_50px_rgba(0,229,255,0.1)] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
              <h2 className="text-2xl font-[var(--font-space)] text-white tracking-wide">
                {widgets.find(w => w.id === maximizedWidget)?.title} - Detail View
              </h2>
              <button 
                onClick={() => setMaximizedWidget(null)}
                className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-8 overflow-auto">
              <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
                {(() => {
                  const w = widgets.find(widget => widget.id === maximizedWidget);
                  if (!w) return null;
                  switch (w.type) {
                    case "KPI": return <div className="scale-150 transform origin-center w-[80%]"><KpiWidget data={data} /></div>;
                    case "HEALTH": return <div className="scale-150 transform origin-center w-[80%]"><PortfolioHealthWidget /></div>;
                    case "RECOMMENDATIONS": return <div className="scale-125 transform origin-center w-full max-w-2xl"><RecommendationsWidget /></div>;
                    case "PIPELINE": return <div className="scale-125 transform origin-center w-full"><PipelineChartWidget data={data} /></div>;
                    case "RISK": return <div className="scale-150 transform origin-center w-[80%]"><RiskChartWidget data={data} /></div>;
                    default: return null;
                  }
                })()}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
