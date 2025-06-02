// src/u/[username]/page.tsx

import dbConnect from '@/backend/lib/mongodb';
import UserModel from '@/backend/models/User';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import React from 'react';

interface UserPageProps {
  params: { username: string };
}

export default async function UserPage({ params }: UserPageProps) {
  await dbConnect();
  const user = await UserModel.findOne({ username: params.username, isDeleted: false })
    .select('username profile roles isActive isBanned')
    .lean();

  if (!user) return notFound();

  const { profile, username, roles, isActive, isBanned } = user;

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        {profile?.avatarUrl ? (
          <Image
            src={profile.avatarUrl || ''}
            alt={profile.displayName || username || ''}
            width={96}
            height={96}
            className="rounded-full border shadow"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold">
            {profile?.displayName?.[0] || username?.[0] || '?'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile?.displayName || username}</h1>
          <div className="text-gray-500">@{username}</div>
          <div className="mt-1 text-sm text-gray-600">{roles?.join(', ')}</div>
          {!isActive && <div className="text-red-500 text-xs mt-1">บัญชีนี้ถูกปิดใช้งาน</div>}
          {isBanned && <div className="text-red-600 text-xs mt-1">บัญชีนี้ถูกแบน</div>}
        </div>
      </div>
      {profile?.bio && (
        <div className="mb-4 text-gray-800 whitespace-pre-line">{profile.bio}</div>
      )}
      {/* เพิ่ม section อื่นๆ เช่น writerStats, socialStats, preferences, ฯลฯ ได้ที่นี่ */}
    </main>
  );
}
