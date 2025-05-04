// src/app/page.tsx
import { NovelCard } from "@/components/NovelCard";
import { Novel } from "@/backend/types/novel";
import Link from "next/link";
import { ImageSlider } from "@/components/ImageSlider";

async function getNovels() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/novels`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("Failed to fetch novels");
    return res.json();
  } catch (error) {
    console.error("Error fetching novels:", error);
    return { novels: [] };
  }
}

export default async function HomePage() {
  const { novels }: { novels: Novel[] } = await getNovels();

  const demoSlides = [
    {
      id: "1",
      title: "ACT PHEC",
      imageUrl: "/images/slider/slide1.jpg",
      link: "/novels/act-phec"
    },
    {
      id: "2",
      title: "SINISTER",
      imageUrl: "/images/slider/slide2.jpg",
      link: "/novels/sinister"
    },
    {
      id: "3",
      title: "BLOOD MOON",
      imageUrl: "/images/slider/slide3.jpg",
      link: "/novels/blood-moon"
    }
  ];

  return (
    <div>
      <div className="overflow-x-auto mb-6 px-4 md:px-6 lg:px-8">
        <div className="flex gap-4 pb-4">
          <div className="shrink-0 w-25" />
          <div className="shrink-0 w-[1300px]">
            <ImageSlider slides={demoSlides} />
          </div>
          <div className="shrink-0 w-5" />
        </div>
      </div> <br/>

      <div className="flex items-center gap-4 px-4 md:px-6 lg:px-8 mt-10 mb-10">
        <div className="shrink-0 w-[100px]" />
        <h1 className="font-bold text-2xl">ผลงานยอดนิยม</h1>
        <div className="shrink-0 w-5" />
      </div> <br/>

      <div className="px-4 md:px-6 lg:px-8 pt-20">
        <div className="flex gap-4 pb-4">
          <div className="shrink-0 w-25" />
          {novels.map((novel) => (
            <div key={novel._id} className="shrink-0 w-[160px]">
              <NovelCard novel={novel} />
            </div>
          ))}
          <Link
            href="/novels"
            className="flex items-center justify-center px-4 text-sm text-blue-600 font-semibold whitespace-nowrap shrink-0"
          >
            ดูทั้งหมด &rarr;
          </Link>
          <div className="shrink-0 w-5" />
        </div>
      </div> <br/>

      <div className="flex items-center gap-4 px-4 md:px-6 lg:px-8 mt-10 mb-10">
        <div className="shrink-0 w-[100px]" />
        <h1 className="font-bold text-2xl">ส่วนลด</h1>
        <div className="shrink-0 w-5" />
      </div> <br/>
      
      <div className="px-4 md:px-6 lg:px-8 pt-20">
        <div className="flex gap-4 pb-4">
          <div className="shrink-0 w-25" />
          {novels.map((novel) => (
            <div key={novel._id} className="shrink-0 w-[160px]">
              <NovelCard novel={novel} />
            </div>
          ))}
          <Link
            href="/novels"
            className="flex items-center justify-center px-4 text-sm text-blue-600 font-semibold whitespace-nowrap shrink-0"
          >
            ดูทั้งหมด &rarr;
          </Link>
          <div className="shrink-0 w-5" />
        </div>
      </div> <br/>

      <div className="flex items-center gap-4 px-4 md:px-6 lg:px-8 mt-10 mb-10">
        <div className="shrink-0 w-[100px]" />
        <h1 className="font-bold text-2xl">จบบริบูรณ์</h1>
        <div className="shrink-0 w-5" />
      </div> <br/>
      
      <div className="px-4 md:px-6 lg:px-8 pt-20">
        <div className="flex gap-4 pb-4">
          <div className="shrink-0 w-25" />
          {novels.map((novel) => (
            <div key={novel._id} className="shrink-0 w-[160px]">
              <NovelCard novel={novel} />
            </div>
          ))}
          <Link
            href="/novels"
            className="flex items-center justify-center px-4 text-sm text-blue-600 font-semibold whitespace-nowrap shrink-0"
          >
            ดูทั้งหมด &rarr;
          </Link>
          <div className="shrink-0 w-5" />
        </div>
      </div>
    </div>

  );
}