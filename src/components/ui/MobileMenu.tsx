"use client";

import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

interface UserAvatarProps {
  user: SessionUser | null;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const avatarSize = sizeClasses[size];

  if (!user) {
    return (
      <div
        className={`rounded-full bg-primary/10 flex items-center justify-center ${avatarSize}`}
      >
        <span className="text-primary">?</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ${avatarSize}`}
    >
      {user.image ? (
        <img
          src={user.image}
          alt={user.username || user.email || "User Avatar"}
          className="w-full h-full object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
        />
      ) : (
        <span className="text-primary">
          {(user.username || user.email || "U")[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}