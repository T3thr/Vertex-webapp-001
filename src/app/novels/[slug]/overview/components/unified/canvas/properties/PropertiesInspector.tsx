// src/app/novels/[slug]/overview/components/unified/canvas/properties/PropertiesInspector.tsx
'use client';

interface PropertiesInspectorProps {
  selectedElement: string | null;
  scene: any;
  onPropertyChange: (property: string, value: any) => void;
}

export default function PropertiesInspector({
  selectedElement,
  scene,
  onPropertyChange
}: PropertiesInspectorProps) {
  return (
    <div className="h-full p-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-foreground mb-2">Properties Inspector</div>
        <div className="text-sm text-muted-foreground mb-4">
          Properties panel will be implemented here
        </div>
        {selectedElement && (
          <div className="text-xs text-muted-foreground">
            Selected: {selectedElement}
          </div>
        )}
      </div>
    </div>
  );
}