
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react'; // Import useSession

// Define the structure of the achievement object based on your model
interface Achievement {
  _id: string;
  title: string;
  description: string;
  // Add other relevant fields from your Achievement model
}

interface GamificationSummary {
  experiencePoints: number;
  achievements: Achievement[];
  level: number;
}

// Function to fetch the summary from our API
const fetchGamificationSummary = async (): Promise<GamificationSummary | null> => {
  const response = await fetch('/api/user/gamification/summary');
  if (!response.ok) {
    if (response.status === 401) {
      return null; 
    }
    throw new Error('Failed to fetch gamification summary');
  }
  return response.json();
};

export const useGamification = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';

  // Use React Query to handle fetching, caching, and polling
  const { data: summary, error } = useQuery<GamificationSummary | null>({
    queryKey: ['gamificationSummary', session?.user?.id], // Make query key dependent on user
    queryFn: fetchGamificationSummary,
    refetchInterval: 3000, // Poll every 3 seconds for faster achievement toasts
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: false, // Don't retry on error
    enabled: isLoggedIn, // <-- This is the key change: only run if logged in
  });

  // State to keep track of achievements that have already been shown
  const [shownAchievements, setShownAchievements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (summary?.achievements) {
      const newAchievements = summary.achievements.filter(
        (ach) => !shownAchievements.has(ach._id)
      );

      if (newAchievements.length > 0) {
        newAchievements.forEach((ach) => {
          toast.success('ปลดล็อกรางวัล!', {
            description: `คุณได้รับ: "${ach.title}"`,
            duration: 5000,
          });
        });

        // Update the set of shown achievements
        setShownAchievements((prev) => {
          const newSet = new Set(prev);
          newAchievements.forEach((ach) => newSet.add(ach._id));
          return newSet;
        });
      }
    }
  }, [summary, shownAchievements]);

  return {
    experiencePoints: summary?.experiencePoints,
    achievements: summary?.achievements,
    level: summary?.level,
    isLoading: !summary && !error,
    error,
  };
};