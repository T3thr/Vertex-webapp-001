// src/components/NovelCard.tsx

import { Novel } from "@/backend/types/novel";
import Image from "next/image";
import Link from "next/link";
import { Heart, Eye, BookOpen } from "lucide-react";

interface NovelCardProps {
  novel: Novel;
}

export function NovelCard({ novel }: NovelCardProps) {
  return (
    <Link href={`/novels/${novel._id}`} className="w-[180px] shrink-0 group">
      <div className="bg-white dark:bg-card rounded-xl shadow-md overflow-hidden transition-transform group-hover:scale-105">
        {/* ปกนิยาย */}
        <div className="relative h-48 w-full">
          <Image
            src={novel.coverImage}
            alt={novel.title}
            fill
            className="object-cover"
          />
        </div>

        {/* เนื้อหาในการ์ด */}
        <div className="p-2">
          <h2 className="text-sm font-semibold truncate">{novel.title}</h2>
          <p className="text-xs text-muted-foreground truncate">
            Descriptio: {novel.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {novel.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            By: {novel.author}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            By: {novel.status}
          </p>

          {/* สถิติ (สมมุติค่าทดสอบ) */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <BookOpen size={12} />
              <span>{novel.episodes.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye size={12} />
              <span>2,532</span> {/* เปลี่ยนเป็น novel.views ได้ถ้ามี field */}
            </div>
            <div className="flex items-center gap-1">
              <Heart size={12} />
              <span>564</span> {/* เปลี่ยนเป็น novel.likes ได้ถ้ามี field */}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
