// app/novels/[slug]/overview/components/NovelWorkspace.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

import { WorkspaceProvider } from './WorkspaceContext';
import WorkspaceHeader from './WorkspaceHeader';
import SidePanel from './SidePanel';
import InspectorPanel from './InspectorPanel';
import WorkspaceToolbar from './WorkspaceToolbar';
import TimelineCanvas from './TimelineCanvas';

/**
 * @interface NovelWorkspaceProps
 * @description Props สำหรับ NovelWorkspace
 */
interface NovelWorkspaceProps {
  novel: any;
  episodes: any[];
  storyMap: any | null;
}

/**
 * @function NovelWorkspace
 * @description Component หลักที่รวมทุกส่วนของ Workspace เข้าด้วยกัน
 */
export default function NovelWorkspace({ novel, episodes, storyMap }: NovelWorkspaceProps) {
  return (
    <WorkspaceProvider
      novel={novel}
      episodes={episodes}
      storyMap={storyMap}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col h-screen bg-background text-foreground"
      >
        {/* Header */}
        <WorkspaceHeader novel={novel} />
        
        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Side Panel */}
          <SidePanel />
          
          {/* Canvas */}
          <div className="flex-1 relative bg-background">
            <TimelineCanvas />
          </div>
          
          {/* Inspector Panel */}
          <InspectorPanel />
        </div>
        
        {/* Toolbar */}
        <WorkspaceToolbar />
      </motion.div>
    </WorkspaceProvider>
  );
}

