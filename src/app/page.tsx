import { Novel } from "@/backend/types/novel";
import { NovelCard } from "@/components/NovelCard";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-accent py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-foreground">
              NovelVerse
            </Link>
            <nav className="space-x-4">
              <Link href="/novels" className="text-muted-foreground hover:text-primary">
                Browse
              </Link>
              <Link href="/create" className="text-muted-foreground hover:text-primary">
                Create
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Featured Novels</h1>
        {novels.length === 0 ? (
          <p className="text-muted-foreground text-center">No novels found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {novels.map((novel) => (
              <NovelCard key={novel._id} novel={novel} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-accent py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          © 2025 NovelVerse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}