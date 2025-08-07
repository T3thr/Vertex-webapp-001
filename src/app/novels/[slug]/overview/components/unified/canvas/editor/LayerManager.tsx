// src/app/novels/[slug]/overview/components/unified/canvas/editor/LayerManager.tsx
'use client';

interface LayerManagerProps {
  scene: any;
  selectedElement: string | null;
  onElementSelect: (elementId: string) => void;
  onElementUpdate: (elementId: string, updates: any) => void;
}

export function LayerManager({
  scene,
  selectedElement,
  onElementSelect,
  onElementUpdate
}: LayerManagerProps) {
  return (
    <div className="h-full p-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-foreground mb-2">Layer Manager</div>
        <div className="text-sm text-muted-foreground">
          Layer management interface will be implemented here
        </div>
      </div>
    </div>
  );
}