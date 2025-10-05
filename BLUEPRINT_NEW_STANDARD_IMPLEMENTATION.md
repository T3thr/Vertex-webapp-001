# Blueprint Tab - New Standards Implementation Summary

## Overview
This document describes the implementation of new standards for the Blueprint Tab, focusing on episode creation workflow and tutorial display logic.

## Changes Implemented

### 1. ✅ Removed Start Node Auto-Creation
**File**: `src/app/api/novels/[slug]/episodes/route.ts`

**Change**: Modified episode creation to NOT automatically create a start node.

**Reason**: 
- Start nodes are not mandatory for episode creation
- Gives users more flexibility in designing their story flow
- Reduces clutter on canvas when episodes are first created

**Before**:
```typescript
nodes: [
  {
    nodeId: startNodeId,
    nodeType: 'start_node',
    title: 'จุดเริ่มต้น',
    position: { x: 250, y: 100 },
    // ... node data
  }
],
startNodeId: startNodeId,
```

**After**:
```typescript
nodes: [], // ✅ NEW STANDARD: เริ่มต้นด้วย canvas ว่างเปล่า
edges: [],
storyVariables: [],
startNodeId: null, // ✅ NEW STANDARD: จะถูกกำหนดเมื่อผู้ใช้สร้าง start node
```

### 2. ✅ Removed CANVAS TUTORIAL Overlay
**File**: `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`

**Change**: Removed the tutorial that appears when no episodes exist (tutorialStep === 0).

**Reason**:
- The "Create First Episode" tutorial was confusing for users
- Not aligned with the new standard where episodes can be created anytime
- Users can create episodes through the episode selector dropdown

**Removed Code**:
```tsx
{/* 🎯 CANVAS TUTORIAL OVERLAY - Shows based on episode state */}
{showTutorial && tutorialStep === 0 && episodes.length === 0 && (
  <div className="...">
    <h3>เริ่มต้นสร้างเรื่องราว</h3>
    <p>สร้างตอนแรกเพื่อเริ่มออกแบบ Visual Novel</p>
    <Button onClick={...}>สร้างตอนแรก</Button>
  </div>
)}
```

### 3. ✅ Enhanced SELECT EPISODE Tutorial
**File**: `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`

**Change**: Improved the SELECT EPISODE tutorial to only show when:
1. Episodes exist
2. No episode is currently selected  
3. No episode ID in URL (indicating first visit)
4. Tutorial has not been dismissed

**Logic**:
```typescript
useEffect(() => {
  const episodeIdFromUrl = searchParams.get('episode');
  
  // Show "Select Episode" tutorial only when:
  // 1. Episodes exist
  // 2. No episode currently selected
  // 3. No episode ID in URL (first visit to page)
  // 4. Tutorial not dismissed
  if (episodes.length > 0 && !currentEpisodeId && !episodeIdFromUrl && !showTutorial) {
    setShowTutorial(true);
  } 
  // Hide tutorial when episode is selected
  else if (currentEpisodeId && showTutorial) {
    setShowTutorial(false);
  }
}, [episodes.length, currentEpisodeId, showTutorial, searchParams]);
```

### 4. ✅ Added URL Persistence for Episode Selection
**File**: `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx`

**Changes**:

#### a) Added Router and SearchParams at Component Top
```typescript
// 🎯 URL handling hooks (must be at top level before any callbacks that use them)
const router = useRouter();
const searchParams = useSearchParams();
```

#### b) Enhanced `handleEpisodeSelect` with URL Update
```typescript
const handleEpisodeSelect = useCallback(async (episodeId: string | null) => {
  // ... existing logic ...
  
  // ✅ NEW: Update URL with episode ID for persistence on refresh
  if (episodeId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('episode', episodeId);
    router.push(`?${params.toString()}`, { scroll: false });
    console.log(`[BlueprintTab] 🔗 Updated URL with episode: ${episodeId}`);
  } else {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('episode');
    router.push(`?${params.toString()}`, { scroll: false });
    console.log('[BlueprintTab] 🔗 Removed episode from URL');
  }
  
  // ... rest of logic ...
}, [episodeList, loadStoryMapForEpisode, professionalEventManager, onEpisodeSelect, router, searchParams]);
```

#### c) Added URL Restoration on Page Load
```typescript
// ✅ NEW: Restore episode selection from URL on initial load
useEffect(() => {
  const episodeIdFromUrl = searchParams.get('episode');
  
  if (episodeIdFromUrl && episodeList.length > 0 && !currentEpisodeId) {
    const episodeExists = episodeList.find(ep => ep._id === episodeIdFromUrl);
    
    if (episodeExists) {
      console.log(`[BlueprintTab] 🔗 Restoring episode from URL: ${episodeIdFromUrl}`);
      handleEpisodeSelect(episodeIdFromUrl);
    } else {
      console.warn(`[BlueprintTab] ⚠️ Episode from URL not found: ${episodeIdFromUrl}`);
      // Remove invalid episode ID from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('episode');
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }
}, [searchParams, episodeList, currentEpisodeId, handleEpisodeSelect, router]);
```

## User Experience Improvements

### Before Changes:
1. ❌ New novels created start nodes automatically (clutter)
2. ❌ Confusing tutorial appears when no episodes exist
3. ❌ Episode selection lost on page refresh
4. ❌ Tutorial shows even when returning to a page with episode selected

### After Changes:
1. ✅ Clean canvas when episodes are created
2. ✅ Single, clear tutorial for episode selection
3. ✅ Episode selection persists via URL on refresh
4. ✅ Tutorial only shows on first visit without episode selection

## URL Structure

### Novel Overview (No Episode Selected)
```
/novels/my-novel-slug/overview
```

### Novel Overview (Episode Selected)
```
/novels/my-novel-slug/overview?episode=<episodeId>
```

### Benefits:
- **Shareable**: Users can share direct links to specific episodes
- **Bookmarkable**: Browser bookmarks maintain episode context
- **Refresh-safe**: Page refreshes maintain episode selection
- **History-friendly**: Browser back/forward buttons work correctly

## Testing Checklist

- [x] ✅ Create new novel - no start node appears
- [x] ✅ Create first episode - empty canvas
- [x] ✅ Select episode - URL updates with episode ID
- [x] ✅ Refresh page - episode selection restored
- [x] ✅ Tutorial shows only when: episodes exist + none selected + no URL param
- [x] ✅ Tutorial hides when episode is selected
- [x] ✅ Tutorial hides when URL has episode parameter

## Technical Notes

### Hook Ordering
The `useRouter()` and `useSearchParams()` hooks must be declared at the top level of the component, before any callbacks that depend on them. This is because:
1. React hooks must be called in the same order on every render
2. Callbacks need stable references to router and searchParams
3. ESLint requires block-scoped variables to be declared before use

### State Management Flow
```
1. User selects episode
2. handleEpisodeSelect updates:
   - Local state (currentEpisodeId)
   - URL parameters (via router.push)
   - localStorage (for backup)
3. On refresh:
   - URL parameter is read
   - Episode is restored via handleEpisodeSelect
   - Tutorial is skipped (episode already selected)
```

## Files Modified

1. `src/app/api/novels/[slug]/episodes/route.ts` - Episode creation without start node
2. `src/app/novels/[slug]/overview/components/tabs/BlueprintTab.tsx` - Tutorial logic and URL persistence
3. `BLUEPRINT_NEW_STANDARD_IMPLEMENTATION.md` - This documentation

## Related Files (Already Correct)

- `src/components/dashboard/CreateNovelModal.tsx` - Already navigates without URL parameters ✅
- `src/app/novels/[slug]/overview/components/NovelEditor.tsx` - Already handles episode URL parameter ✅

## Future Considerations

1. Consider adding episode navigation history (prev/next buttons)
2. Add episode breadcrumb in UI showing current episode context
3. Consider auto-saving episode selection preference per user
4. Add analytics to track episode navigation patterns

## Conclusion

These changes implement a more professional and user-friendly workflow for episode management in the Blueprint Tab, aligned with modern web application standards for state persistence and user guidance.

