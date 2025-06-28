import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export default async function CreateNovelPage() {
  // ตรวจสอบการล็อกอิน
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/novels/create');
  }

  // Redirect ไปยัง dashboard ใน tab novels พร้อมเปิด modal
  // ใช้ query parameter สำหรับเปิด modal
  redirect('/dashboard?tab=novels&create=true');
} 