"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const params = useSearchParams();
  const error = params.get("error");
  const callbackUrl = params.get("callbackUrl") || "/";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            เกิดข้อผิดพลาดในการเชื่อมต่อผู้ให้บริการ (error: {error}) ลองใหม่อีกครั้ง
          </div>
        )}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full py-2 rounded-md border bg-white hover:bg-gray-50"
        >
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </main>
  );
}


