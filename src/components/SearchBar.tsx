// src/components/SearchBar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SearchBarProps {
  initialSearch?: string;
}

export default function SearchBar({ initialSearch = '' }: SearchBarProps) {
  const [search, setSearch] = useState(initialSearch);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/?search=${encodeURIComponent(search)}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex w-full items-center gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search novels..."
        className="w-full rounded-lg border border-muted bg-background px-4 py-2 text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/80"
      >
        Search
      </button>
    </form>
  );
}