// src/app/user/[username]/components/UserHistorySection.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MessageSquare,
  Star,
  UserPlus,
  ThumbsUp,
  ShoppingCart,
  Gift,
} from 'lucide-react';

interface UserHistorySectionProps {
  viewedUser: CombinedUser | null;
  initialActivities: ActivityItem[];
  isOwnProfile: boolean;
}

interface CombinedUser {
  _id: string;
  username: string;
}

interface ActivityItem {
  _id: string;
  userId: string;
  type:
    | 'EPISODE_READ'
    | 'COMMENT_CREATED'
    | 'RATING_GIVEN'
    | 'USER_FOLLOWED'
    | 'NOVEL_LIKED'
    | 'COIN_SPENT_EPISODE'
    | 'COIN_SPENT_DONATION_WRITER'
    | 'COIN_EARNED_WRITER_DONATION';
  content?: string;
  novelId?: string;
  episodeId?: string;
  commentId?: string;
  ratingId?: string;
  followedUserId?: string;
  likedNovelId?: string;
  purchaseId?: string;
  donationId?: string;
  relatedUser?: string;
  relatedNovel?: string;
  relatedEpisode?: string;
  coinAmount?: number;
  timestamp: Date;
  novelTitle?: string;
  novelSlug?: string;
  episodeTitle?: string;
  episodeNumber?: number;
  targetUserName?: string;
  targetUserSlug?: string;
}

interface ActivityHistoryResponse {
  activities: ActivityItem[];
  currentPage: number;
  totalPages: number;
  totalActivities: number;
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'EPISODE_READ':
      return <Clock className="w-5 h-5 text-blue-500" />;
    case 'COMMENT_CREATED':
      return <MessageSquare className="w-5 h-5 text-green-500" />;
    case 'RATING_GIVEN':
      return <Star className="w-5 h-5 text-yellow-500" />;
    case 'USER_FOLLOWED':
      return <UserPlus className="w-5 h-5 text-purple-500" />;
    case 'NOVEL_LIKED':
      return <ThumbsUp className="w-5 h-5 text-red-500" />;
    case 'COIN_SPENT_EPISODE':
      return <ShoppingCart className="w-5 h-5 text-indigo-500" />;
    case 'COIN_SPENT_DONATION_WRITER':
    case 'COIN_EARNED_WRITER_DONATION':
      return <Gift className="w-5 h-5 text-pink-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const UserHistorySection: React.FC<UserHistorySectionProps> = ({
  viewedUser,
  initialActivities,
  isOwnProfile,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(
    async (pageToFetch: number) => {
      if (!viewedUser) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/${viewedUser.username}/activity-history?page=${pageToFetch}&limit=10`
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch activity history: ${res.statusText}`);
        }
        const data: ActivityHistoryResponse = await res.json();
        setActivities((prev) =>
          pageToFetch === 1 ? data.activities : [...prev, ...data.activities]
        );
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load activity history.';
        setError(errorMessage);
        console.error('Error fetching activities:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [viewedUser]
  );

  useEffect(() => {
    if (viewedUser && initialActivities.length > 0) {
      const fetchInitialMeta = async () => {
        try {
          const res = await fetch(
            `/api/${viewedUser.username}/activity-history?page=1&limit=10`
          );
          if (res.ok) {
            const data: ActivityHistoryResponse = await res.json();
            setTotalPages(data.totalPages);
          }
        } catch (e) {
          console.error('Failed to fetch initial meta for history', e);
        }
      };
      fetchInitialMeta();
    } else if (viewedUser && initialActivities.length === 0) {
      fetchActivities(1);
    }
  }, [viewedUser, initialActivities, fetchActivities]);

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoading) {
      fetchActivities(currentPage + 1);
    }
  };

  if (!viewedUser) {
    return (
      <div className="p-4 bg-secondary rounded-lg shadow-md my-4">
        Loading history...
      </div>
    );
  }

  return (
    <div className="p-4 bg-card shadow-lg rounded-lg my-4">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Activity History
      </h2>
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4">
          Error: {error}
        </div>
      )}
      {activities.length === 0 && !isLoading && (
        <p className="text-muted-foreground">No activities found.</p>
      )}
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li
            key={activity._id}
            className="flex items-start space-x-3 p-3 bg-background rounded-md shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 pt-1">{getActivityIcon(activity.type)}</div>
            <div className="flex-grow">
              <p className="text-sm text-foreground">
                {activity.content || `Activity: ${activity.type}`}
                {activity.novelTitle && (
                  <span className="font-semibold"> on &quot;{activity.novelTitle}&quot;</span>
                )}
                {activity.episodeTitle && (
                  <span className="italic"> - {activity.episodeTitle}</span>
                )}
                {activity.targetUserName && (
                  <span className="font-semibold"> with {activity.targetUserName}</span>
                )}
                {activity.coinAmount && (
                  <span className="text-yellow-600"> ({activity.coinAmount} coins)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {isLoading && (
        <div className="text-center py-4 text-primary">
          Loading more activities...
        </div>
      )}
      {!isLoading && currentPage < totalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default UserHistorySection;