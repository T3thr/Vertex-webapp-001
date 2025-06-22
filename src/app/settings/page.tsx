// src/app/settings/page.tsx
// นี่คือ Server Component ทำหน้าที่ดึงข้อมูลล่าสุดจาก DB และส่งต่อไปยัง Client Component

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserSettingsModel from "@/backend/models/UserSettings";
import { redirect } from "next/navigation";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

/**
 * @function getUserPreferences
 * @description ดึงข้อมูลการตั้งค่าของผู้ใช้ล่าสุดจากฐานข้อมูลโดยตรง (UserSettings)
 * @param userId - ID ของผู้ใช้
 * @returns {Promise<object | null>} - Object การตั้งค่าของผู้ใช้ หรือ null หากไม่พบ
 */
async function getUserPreferences(userId: string) {
  try {
    await dbConnect();
    const settings = await UserSettingsModel.findOne({ userId }).lean();
    if (!settings) return null;
    // แปลง ObjectId/Date เป็น string ทั้งหมด (deep serialize)
    const serialize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'object' && obj instanceof Date) return obj.toISOString();
      if (typeof obj === 'object' && obj._bsontype === 'ObjectID') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serialize);
      if (typeof obj === 'object') {
        const res: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[key] = serialize(obj[key]);
          }
        }
        return res;
      }
      return obj;
    };
    return serialize(settings);
  } catch (error) {
    console.error("❌ [SettingsPage SSR] ไม่สามารถดึงข้อมูล settings จาก DB ได้:", error);
    return null;
  }
}

/**
 * @page SettingsPage (SSR)
 * @description หน้าหลักสำหรับการตั้งค่าของผู้ใช้ (Server-Side Rendered)
 * - ดึงข้อมูล Session และ Preferences จากฝั่ง Server
 * - ส่งข้อมูลที่จำเป็นไปยัง Client Component (SettingsTabs) เพื่อแสดงผลและจัดการ
 */
export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  // หากไม่มี session หรือไม่มี user id ให้ redirect ไปหน้า sign-in
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  // ดึงข้อมูล preferences ล่าสุดจาก DB
  const initialPreferences = await getUserPreferences(session.user.id);

  // หากดึงข้อมูลล้มเหลว แสดงหน้า Error
  if (!initialPreferences) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center">
        <Card className="w-full max-w-2xl bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> เกิดข้อผิดพลาด
            </CardTitle>
            <CardDescription className="text-destructive/80">
              ไม่สามารถโหลดข้อมูลการตั้งค่าของคุณได้ในขณะนี้ กรุณาลองใหม่อีกครั้งในภายหลัง
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>หากปัญหานี้ยังคงอยู่ กรุณาติดต่อฝ่ายสนับสนุน</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          การตั้งค่าบัญชี
        </h1>
      </div>
      {/* ส่ง initialPreferences ที่ได้จาก Server ไปเป็น props ของ Client Component
        เพื่อให้ Client Component มีข้อมูลเริ่มต้นที่ถูกต้องและล่าสุดเสมอ
      */}
      <SettingsTabs initialPreferences={initialPreferences} />
    </div>
  );
}
