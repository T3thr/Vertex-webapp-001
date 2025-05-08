// src/backend/lib/userService.ts
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser";
import UserAchievementModel from "@/backend/models/UserAchievement";
import UserFollowModel from "@/backend/models/UserFollow";
import EarningAnalyticModel from "@/backend/models/EarningAnalytic";

// ดึงข้อมูลผู้ใช้จาก username
export async function getUserByUsername(username: string) {
  if (!username) return null;
  
  await dbConnect();
  
  // ค้นหาในทั้ง User และ SocialMediaUser
  const user = await UserModel().findOne({ username, isActive: true }).lean() || 
               await SocialMediaUserModel().findOne({ username, isActive: true }).lean();
  
  if (!user) return null;
  
  // แปลง _id เป็น string เพื่อให้ส่งผ่าน API ได้
  return {
    ...user,
    _id: user._id.toString(),
    id: user._id.toString(),
  };
}

// ดึงจำนวนผู้ติดตามของผู้ใช้
export async function getUserFollowerCount(userId: string) {
  await dbConnect();
  return await UserFollowModel().countDocuments({ 
    followingId: userId, 
    status: "active" 
  });
}

// ดึงจำนวนที่ผู้ใช้กำลังติดตาม
export async function getUserFollowingCount(userId: string) {
  await dbConnect();
  return await UserFollowModel().countDocuments({ 
    followerId: userId, 
    status: "active" 
  });
}

// ดึงรายการผู้ติดตามของผู้ใช้
export async function getUserFollowers(userId: string, limit = 10, skip = 0) {
  await dbConnect();
  
  const follows = await UserFollowModel().find({ 
    followingId: userId, 
    status: "active" 
  })
  .sort({ followedAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('followerId', 'username profile.displayName profile.avatar')
  .lean();
  
  return follows.map(follow => ({
    ...follow,
    _id: follow._id.toString(),
    followerId: typeof follow.followerId === 'object' && follow.followerId !== null
      ? {
          ...(follow.followerId as any),
          _id: (follow.followerId as any)._id.toString()
        }
      : (follow.followerId as string)?.toString?.() ?? ''
  }));

}

// ดึงรายการที่ผู้ใช้กำลังติดตาม
export async function getUserFollowing(userId: string, limit = 10, skip = 0) {
  await dbConnect();
  
  const follows = await UserFollowModel().find({ 
    followerId: userId, 
    status: "active" 
  })
  .sort({ followedAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('followingId', 'username profile.displayName profile.avatar')
  .lean();
  
  return follows.map(follow => ({
    ...follow,
    _id: follow._id.toString(),
    followingId: typeof follow.followingId === 'object' && follow.followingId !== null
      ? {
          ...(follow.followingId as any),
          _id: (follow.followingId as any)._id.toString()
        }
      : (follow.followingId as string)?.toString?.() ?? ''
  }));
  
}

// ดึงความสำเร็จของผู้ใช้
export async function getUserAchievements(userId: string) {
  await dbConnect();
  
  const achievements = await UserAchievementModel().find({ 
    user: userId, 
    isUnlocked: true 
  })
  .populate('achievementDefinition', 'title description iconUrl')
  .sort({ unlockedAt: -1 })
  .lean();
  
  return achievements.map(achievement => ({
    ...achievement,
    _id: achievement._id.toString(),
    user: achievement.user.toString(),
    achievementDefinition: achievement.achievementDefinition ? {
      ...achievement.achievementDefinition,
      _id: achievement.achievementDefinition._id.toString()
    } : null
  }));
}

// สำหรับผู้เขียน: ดึงข้อมูลวิเคราะห์รายได้
export async function getWriterEarningAnalytics(userId: string, period = "monthly", limit = 12) {
  await dbConnect();
  
  const analytics = await EarningAnalyticModel().find({ 
    writer: userId, 
    periodType: period 
  })
  .sort({ periodStartDate: -1 })
  .limit(limit)
  .lean();
  
  return analytics.map(analytic => ({
    ...analytic,
    _id: analytic._id.toString(),
    writer: analytic.writer.toString(),
    novel: analytic.novel?.toString(),
    episode: analytic.episode?.toString()
  }));
}