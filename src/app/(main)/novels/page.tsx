// src/app/(main)/novels/page.tsx
import { redirect } from 'next/navigation';

export default function NovelsPage() {
  // Redirect to search/novels page
  redirect('/search/novels');
}

