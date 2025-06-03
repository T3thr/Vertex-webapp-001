
interface LibraryItem {
  _id: string;
  itemType: string;
  novelId: string;
  title: string;
  author: string;
  coverImage: string;
  statuses: string[];
  views: number;
  likes: number;
  userRating: number;
  readingProgress: {
    overallProgressPercentage: number;
    lastReadAt: string;
  };
  addedAt: string;
}

const HistoryItem = ({ item }: { item: LibraryItem }) => {
  const lastReadDate = new Date(item.readingProgress.lastReadAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline dot and line */}
      <div className="absolute left-2 top-0 h-full w-0.5 bg-gray-300">
        <div className="w-4 h-4 bg-blue-500 rounded-full absolute -left-1.5 top-1.5"></div>
      </div>

      {/* History entry */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="text-lg font-medium text-gray-900">{item.title}</h4>
        <p className="text-sm text-gray-600">โดย {item.author}</p>
        <p className="text-sm text-gray-500 mt-1">
          อ่านล่าสุด: {lastReadDate}
        </p>
        <p className="text-sm text-gray-500">
          ความคืบหน้า: {item.readingProgress.overallProgressPercentage}%
        </p>
      </div>
    </div>
  );
};

export default HistoryItem;