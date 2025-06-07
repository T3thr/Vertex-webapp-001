// src/components/mydashboard/Tabs.tsx
"use client";

import React, { useState } from "react";
import { Writing } from "./Writing";
import { Trophy } from "./Trophy";
import { Penname } from "./Penname";
import { Thread } from "./Thread";

type Tab = "writing" | "trophy" | "penname" | "thread";

export const Tabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>("writing");

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="flex justify-between items-center px-8 pb-4">
        <button onClick={() => setActiveTab("writing")}>งานเขียน</button>
        <button onClick={() => setActiveTab("trophy")}>ถ้วยรางวัล</button>
        <button onClick={() => setActiveTab("penname")}>นามปากกา</button>
        <button onClick={() => setActiveTab("thread")}>กระทู้</button>
      </div>

      {/* Tab Content */}
      <div className="border-t border-gray-300">
        {activeTab === "writing" && <Writing />}
        {activeTab === "trophy" && <Trophy />}
        {activeTab === "penname" && <Penname />}
        {activeTab === "thread" && <Thread />}
      </div>
    </div>
  );
};
