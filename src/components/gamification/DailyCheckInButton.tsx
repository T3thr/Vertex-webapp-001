"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DailyCheckInButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/user/checkin");
        if (!res.ok) {
          setHasCheckedIn(null);
          return;
        }
        const data = await res.json();
        setHasCheckedIn(!!data.hasCheckedInToday);
      } catch (e) {
        setHasCheckedIn(null);
      }
    };
    fetchStatus();
  }, []);

  const doCheckin = async () => {
    if (loading || hasCheckedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/checkin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setHasCheckedIn(true);
        // Refresh server components so achievements and streak progress reflect immediately
        router.refresh();
      } else {
        setError(data?.message || data?.error || "เช็คอินไม่สำเร็จ");
      }
    } catch (e: any) {
      setError("เช็คอินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const disabled = hasCheckedIn === true || loading;

  return (
    <div className={className}>
      <button
        onClick={doCheckin}
        disabled={disabled}
        className={`px-4 py-2 rounded-md font-medium border transition-colors ${
          hasCheckedIn ? "text-gray-400 border-gray-300" : "text-green-700 border-green-300 hover:bg-green-50"
        }`}
        title={hasCheckedIn ? "เช็คอินแล้ววันนี้" : "เช็คอินวันนี้"}
      >
        {hasCheckedIn ? "เช็คอินแล้ว" : loading ? "กำลังเช็คอิน..." : "เช็คอินวันนี้"}
      </button>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}


