import { NovelCard } from "@/components/NovelCard";
import { Novel } from "@/backend/types/novel";
import Link from "next/link";
import Image from "next/image";

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
  
  // Filter novels for different sections
  const featuredNovels = novels.slice(0, 6); // First 6 novels for featured
  const popularNovels = novels.slice(0, 4); // First 4 novels for popular
  const recentlyUpdatedNovels = novels.slice(0, 4); // First 4 novels for recently updated
  const mostViewedNovels = novels.slice(0, 4); // First 4 novels for most viewed

  return (
    <div className="min-h-screen bg-background">
      {/* Keep the existing header */}
      <main className="container mx-auto px-4">
        <div className="relative w-full h-64 md:h-80 my-4 overflow-hidden rounded-lgs">
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Hello Nemo</h1>
              <p className="text-sm md:text-base">Spooky thriller with unexpected twists.</p>
            </div>
          </div>
          <div className="absolute inset-0 flex">
            <div className="w-8 bg-gradient-to-r from-black/80 to-transparent z-20 flex items-center justify-center">
              <button className="text-white text-2xl">&lt;</button>
            </div>
            <div className="flex-grow relative">
              <div className="absolute inset-0 bg-red-900/50"></div>
            </div>
            <div className="w-8 bg-gradient-to-l from-black/80 to-transparent z-20 flex items-center justify-center">
              <button className="text-white text-2xl">&gt;</button>
            </div>
          </div>
        </div>
        
        {/* Popular Novels Section */}
        <div className="my-8">
          <h2 className="text-xl font-medium text-foreground mb-4">ผลงานยอดนิยม</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {popularNovels.map((novel, index) => (
              <div key={novel._id || index} className="group">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg mb-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <Image 
                    src={novel.coverImage || `/placeholder-${index % 4}.jpg`} 
                    alt={novel.title || "Novel cover"} 
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium text-foreground truncate">{novel.title || "No Name โนเนม"}</h3>
                <p className="text-xs text-muted-foreground">{novel.author || "Anonymous"}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recently Updated Section */}
        <div className="my-8">
          <h2 className="text-xl font-medium text-foreground mb-4">อัพเดทล่าสุด</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyUpdatedNovels.map((novel, index) => (
              <div key={novel._id || index} className="flex flex-col">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg mb-2 group">
                  {index < 2 && (
                    <div className="absolute top-0 right-0 z-20 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                      NEW
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <Image 
                    src={novel.coverImage || `/placeholder-${index % 4}.jpg`} 
                    alt={novel.title || "Novel cover"} 
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium text-foreground truncate">{novel.title || "No Name โนเนม"}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-1">👁️</span>
                    <span>{Math.floor(Math.random() * 1000)}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-1">❤️</span>
                    <span>{Math.floor(Math.random() * 100)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Most Viewed Section */}
        <div className="my-8">
          <h2 className="text-xl font-medium text-foreground mb-4">อ่านมากที่สุด</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {mostViewedNovels.map((novel, index) => (
              <div key={novel._id || index} className="flex flex-col">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg mb-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <Image 
                    src={novel.coverImage || `/placeholder-${index % 4}.jpg`} 
                    alt={novel.title || "Novel cover"} 
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="text-sm font-medium text-foreground truncate">{novel.title || "No Name โนเนม"}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-1">👁️</span>
                    <span>{Math.floor(Math.random() * 10000)}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-1">❤️</span>
                    <span>{Math.floor(Math.random() * 500)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-accent py-6 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-base font-medium text-foreground mb-2">เกี่ยวกับเรา</h3>
              <p className="text-sm text-muted-foreground">
                ศูนย์รวมนวนิยายคุณภาพ<br />
                อัพเดทเนื้อหาใหม่ทุกวัน<br />
                ติดต่อทีมงาน: support@novelverse.th
              </p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-2">Follow Us Now</p>
              <div className="flex space-x-3">
                <Link href="#" className="text-muted-foreground hover:text-primary text-xl">
                  <span>🍎</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary text-xl">
                  <span>🤖</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary text-xl">
                  <span>🔄</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-primary text-xl">
                  <span>📱</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}