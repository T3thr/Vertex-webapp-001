// src/app/novels/[slug]/overview/components/unified/canvas/editor/SceneEditor.tsx
'use client';

interface SceneEditorProps {
  scene: any;
  characters: any[];
  userMedia: any[];
  officialMedia: any[];
  selectedElement: string | null;
  onElementSelect: (elementId: string) => void;
  showGrid: boolean;
  snapToGrid: boolean;
}

export function SceneEditor({
  scene,
  characters,
  userMedia,
  officialMedia,
  selectedElement,
  onElementSelect,
  showGrid,
  snapToGrid
}: SceneEditorProps) {
  return (
    <div className="w-full h-full bg-muted/30 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground mb-2">Scene Editor</div>
          <div className="text-sm text-muted-foreground">
            Scene editing interface will be implemented here
          </div>
        </div>
      </div>
    </div>
  );
}