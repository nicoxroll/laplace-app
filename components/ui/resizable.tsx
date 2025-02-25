"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

interface ResizableProps {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export function Resizable({
  children,
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 256,
}: ResizableProps) {
  const [width, setWidth] = useState(defaultWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const newWidth = e.clientX;
      setWidth((prev) => {
        const updated = Math.min(Math.max(newWidth, minWidth), maxWidth);
        return updated;
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth]);

  return (
    <div
      ref={containerRef}
      className="relative h-full flex z-20"
      style={{ width }}
    >
      <div className="flex-1 h-full overflow-hidden">{children}</div>
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-[#58a6ff]/30 transition-colors z-30"
        onMouseDown={(e) => {
          isDragging.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          e.preventDefault();
        }}
      >
        <div className="absolute right-0 top-0 w-[3px] h-full opacity-0 group-hover:opacity-100 bg-[#58a6ff]" />
      </div>
    </div>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
