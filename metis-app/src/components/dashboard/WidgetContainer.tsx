"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Maximize2 } from "lucide-react";

interface WidgetContainerProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isEditMode?: boolean;
  onRemove?: (id: string) => void;
  onMaximize?: () => void;
  className?: string;
  headerRight?: React.ReactNode;
}

export default function WidgetContainer({
  id,
  title,
  children,
  isEditMode,
  onRemove,
  onMaximize,
  className = "",
  headerRight,
}: WidgetContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col group bg-[#0A0F14] border border-white/10 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] min-h-[300px] ${className}`}
    >
      {/* Edit Mode Overlay Handles */}
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-50">
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 hover:text-white cursor-grab active:cursor-grabbing backdrop-blur-md transition-colors"
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={() => onRemove?.(id)}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 backdrop-blur-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h3 className="text-white font-space font-bold text-base tracking-widest uppercase">{title}</h3>
        <div className="flex items-center gap-3">
          {!isEditMode && onMaximize && (
            <button onClick={onMaximize} className="text-white/30 hover:text-cyan transition-colors p-1" title="Espandi">
              <Maximize2 size={14} />
            </button>
          )}
          {!isEditMode && headerRight && (
            <div className="text-white/50">{headerRight}</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-5 pt-2 flex flex-col font-space">
        {children}
      </div>

      {/* Optional Glow Effect on hover */}
      <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-cyan/30 rounded-2xl transition-colors duration-500" />
    </div>
  );
}
