// src/components/mydashboard/Tabs.tsx
"use client";

import React, { useState } from "react";
import { Writing } from "./Writing";
import { Trophy } from "./Trophy";
import { Penname } from "./Penname";
import { Thread } from "./Thread";

type Tab = "writing" | "trophy" | "penname" | "thread";

interface TabsProps {
  achievements: any[]; // A more specific type should be used here
  level: number;
  experiencePoints: number;
  isOwnProfile?: boolean;
  showTrophies?: boolean;
}

export const Tabs = ({ achievements, level, experiencePoints, isOwnProfile = false, showTrophies = true }: TabsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("writing");

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="flex justify-between items-center px-8 pb-4">
        <button onClick={() => setActiveTab("writing")}>งานเขียน</button>
        {(showTrophies || isOwnProfile) && (
          <button onClick={() => setActiveTab("trophy")}>ถ้วยรางวัล</button>
        )}
        <button onClick={() => setActiveTab("penname")}>นามปากกา</button>
        <button onClick={() => setActiveTab("thread")}>กระทู้</button>
      </div>

      {/* Tab Content */}
      <div className="border-t border-gray-300">
        {activeTab === "writing" && <Writing />}
        {activeTab === "trophy" && (showTrophies || isOwnProfile) && (
          <>
            {!showTrophies && isOwnProfile && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-yellow-700">
                  คุณได้ปิดการแสดงถ้วยรางวัลในหน้าโปรไฟล์ ผู้อื่นจะไม่เห็นแท็บนี้
                </p>
              </div>
            )}
            <Trophy achievements={achievements} />
          </>
        )}
        {activeTab === "penname" && <Penname />}
        {activeTab === "thread" && <Thread />}
      </div>
    </div>
  );
};