import { Plus } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

// Metadata for the page
export const metadata: Metadata = {
  title: "รีวิว | DIVWY",
  description: "รีวิวและบทความทั้งหมดบน DIVWY",
};

// Remove mock data and implement actual data fetching
async function getReviews() {
  // TODO: Implement actual API call to fetch reviews
  return [];
}

export default function ReviewsPage() {
  const tabs = [
    { id: 'all', label: 'กระทู้รวม', href: '/board' },
    { id: 'reviews', label: 'รีวิว', href: '/board/reviews' },
    { id: 'problems', label: 'ปัญหา', href: '/board/problems' },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Board Categories Tabs */}
      <nav className="mb-8 border-b">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative
                ${tab.id === 'reviews'
                  ? 'text-[#8bc34a] border-b-2 border-[#8bc34a]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Header with Sort Dropdown and New Post Button */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <select className="px-3 py-1.5 rounded-lg border bg-background text-sm">
            <option value="latest">ล่าสุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="comments">ความคิดเห็นมากสุด</option>
          </select>
        </div>
        <Link
          href="/board/new"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          <Plus size={18} className="mr-1" />
          <span>เพิ่มกระทู้ใหม่</span>
        </Link>
      </div>

      {/* Reviews Grid */}
      <div className="space-y-4">
        {/* Placeholder for reviews */}
      </div>
    </main>
  );
} 