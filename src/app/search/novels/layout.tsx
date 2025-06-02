// src/app/search/novels/layout.tsx
import type { Metadata } from 'next';

// Metadata ใน layout จะเป็นค่าพื้นฐาน และ page.tsx สามารถ override หรือเพิ่มเติมได้
// กำหนด title และ description ทั่วไปสำหรับส่วนค้นหานิยาย
export const metadata: Metadata = {
  title: 'ค้นหานิยาย | DivWy',
  description: 'สำรวจและค้นหานิยายหลากหลายประเภทบน DivWy ไม่ว่าจะเป็นนิยายแปล นิยายแต่ง หรือการ์ตูนออนไลน์',
  keywords: 'ค้นหานิยาย, นิยายออนไลน์, การ์ตูน, Visual Novel, DivWy', // Keywords ทั่วไป
};

export default async function SearchNovelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // เพิ่ม container และ padding ที่นี่ แทนที่จะอยู่ใน page.tsx โดยตรง
    <section className="container mx-auto px-2 sm:px-4 py-6 md:py-8">
      {/* ส่วนนี้สามารถใส่ Breadcrumbs หรือ Title หลักของ Layout ได้ถ้าต้องการ */}
      {/* ตัวอย่าง: <h1 className="text-3xl font-bold mb-8">ค้นหานิยาย</h1> */}
      {children}
    </section>
  );
}