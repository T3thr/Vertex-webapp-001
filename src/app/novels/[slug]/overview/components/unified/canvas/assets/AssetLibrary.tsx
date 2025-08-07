// src/app/novels/[slug]/overview/components/unified/canvas/assets/AssetLibrary.tsx
'use client';

interface AssetLibraryProps {
  userMedia: any[];
  officialMedia: any[];
  onAssetSelect: (asset: any) => void;
}

export function AssetLibrary({
  userMedia,
  officialMedia,
  onAssetSelect
}: AssetLibraryProps) {
  return (
    <div className="h-full p-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-foreground mb-2">Asset Library</div>
        <div className="text-sm text-muted-foreground mb-4">
          Asset library interface will be implemented here
        </div>
        <div className="text-xs text-muted-foreground">
          User Media: {userMedia.length} | Official Media: {officialMedia.length}
        </div>
      </div>
    </div>
  );
}