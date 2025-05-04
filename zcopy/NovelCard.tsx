import { Novel } from "@/backend/types/novel";
import Image from "next/image";
import Link from "next/link";

interface NovelCardProps {
  novel: Novel;
}

export function NovelCard({ novel }: NovelCardProps) {
  return (
    <Link href={`/novels/${novel._id}`} className="block group">
      <div className="bg-card rounded-lg shadow-md overflow-hidden transition-transform group-hover:scale-105">
        <div className="relative h-64">
          <Image
            src={novel.coverImage}
            alt={novel.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <h2 className="text-xl font-semibold text-card-foreground line-clamp-2">
            {novel.title}
          </h2>
          <p className="text-muted-foreground line-clamp-3 mt-2">
            {novel.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {novel.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="inline-block mt-2 text-sm text-muted-foreground">
            Status: {novel.status}
          </span>
        </div>
      </div>
    </Link>
  );
}