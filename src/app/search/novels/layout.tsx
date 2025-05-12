// src/app/search/novels/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ค้นหานิยาย | NovelMaze',
  description: 'ค้นหานิยายและการ์ตูนออนไลน์จากทั่วทุกมุมโลก แบ่งตามหมวดหมู่ สถานะ และอื่นๆ',
  keywords: 'ค้นหานิยาย, นิยายออนไลน์, Visual Novel, การ์ตูนออนไลน์, หมวดหมู่นิยาย',
};

export default function SearchNovelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="container-custom py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">ค้นหานิยาย</h1>
      {children}
    </section>
  );
}