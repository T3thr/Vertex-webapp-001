// src/app/api/users/me/settings/route.ts
// API สำหรับการจัดการการตั้งค่าผู้ใช้

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/backend/lib/mongodb';
import UserModel, { IUser } from '@/backend/models/User';
import SocialMediaUserModel, { ISocialMediaUser } from '@/backend/models/SocialMediaUser';
import UserPreferenceModel from '@/backend/models/UserPreference';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import mongoose from 'mongoose';

// อินเทอร์เฟซสำหรับข้อมูลการตั้งค่า
interface UserSettingsData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  novelUpdatesNotifications?: boolean;
  profileVisibility?: 'public' | 'followersOnly' | 'private';
  showActivityStatus?: boolean;
  readingHistoryVisibility?: 'public' | 'followersOnly' | 'private';
  theme?: 'light' | 'dark' | 'system' | 'sepia';
  language?: string;
}

// อินเทอร์เฟซสำหรับข้อมูลผู้ใช้ที่ใช้ใน API นี้
interface BaseUser {
  _id: mongoose.Types.ObjectId;
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    coverImage?: string;
  };
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      novelUpdates?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'followersOnly' | 'private';
      showActivityStatus?: boolean;
      readingHistoryVisibility?: 'public' | 'followersOnly' | 'private';
    };
  };
  image?: string;
}

// ฟังก์ชันตรวจสอบข้อมูล
const validateSettings = (settings: UserSettingsData) => {
  const errors: string[] = [];
  if (settings.displayName && settings.displayName.length > 100) {
    errors.push('ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร');
  }
  if (settings.bio && settings.bio.length > 500) {
    errors.push('ประวัติต้องไม่เกิน 500 ตัวอักษร');
  }
  if (settings.avatarUrl && !/^https?:\/\/|^\//.test(settings.avatarUrl)) {
    errors.push('URL รูปโปรไฟล์ไม่ถูกต้อง');
  }
  if (settings.coverImageUrl && !/^https?:\/\/|^\//.test(settings.coverImageUrl)) {
    errors.push('URL รูปปกไม่ถูกต้อง');
  }
  if (settings.profileVisibility && !['public', 'followersOnly', 'private'].includes(settings.profileVisibility)) {
    errors.push('การมองเห็นโปรไฟล์ไม่ถูกต้อง');
  }
  if (
    settings.readingHistoryVisibility &&
    !['public', 'followersOnly', 'private'].includes(settings.readingHistoryVisibility)
  ) {
    errors.push('การมองเห็นประวัติการอ่านไม่ถูกต้อง');
  }
  if (settings.theme && !['light', 'dark', 'system', 'sepia'].includes(settings.theme)) {
    errors.push('ธีมไม่ถูกต้อง');
  }
  if (settings.language && !['th', 'en'].includes(settings.language)) {
    errors.push('ภาษาไม่ถูกต้อง');
  }
  return errors;
};

// GET: ดึงข้อมูลการตั้งค่า
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'ต้องล็อกอินเพื่อดึงข้อมูลการตั้งค่า' }, { status: 401 });
    }

    let user = await UserModel()
      .findOne({ _id: session.user.id, isActive: true, isBanned: false })
      .select('profile preferences')
      .lean<BaseUser>();
    let isSocialMediaUser = false;

    if (!user) {
      user = await SocialMediaUserModel()
        .findOne({ _id: session.user.id, isActive: true, isBanned: false, isDeleted: false })
        .select('profile preferences image')
        .lean<BaseUser>();
      isSocialMediaUser = true;
    }

    if (!user) {
      return NextResponse.json({ message: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    const userPreference = await UserPreferenceModel()
      .findOne({ user: session.user.id })
      .select('theme language')
      .lean();

    const settings: UserSettingsData = {
      displayName: user.profile?.displayName,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatar || (isSocialMediaUser ? user.image : undefined),
      coverImageUrl: user.profile?.coverImage,
      emailNotifications: user.preferences?.notifications?.email,
      pushNotifications: user.preferences?.notifications?.push,
      novelUpdatesNotifications: user.preferences?.notifications?.novelUpdates,
      profileVisibility: user.preferences?.privacy?.profileVisibility,
      showActivityStatus: user.preferences?.privacy?.showActivityStatus,
      readingHistoryVisibility: user.preferences?.privacy?.readingHistoryVisibility,
      theme: userPreference?.theme,
      language: userPreference?.language,
    };

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('ข้อผิดพลาดในการดึงข้อมูลการตั้งค่า:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}

// PUT: อัปเดตการตั้งค่า
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'ต้องล็อกอินเพื่ออัปเดตการตั้งค่า' }, { status: 401 });
    }

    const settings: UserSettingsData = await req.json();
    const validationErrors = validateSettings(settings);
    if (validationErrors.length > 0) {
      return NextResponse.json({ message: validationErrors.join(', ') }, { status: 400 });
    }

    // แก้ไขส่วนนี้เพื่อแยกการเรียกใช้ updateOne สำหรับแต่ละโมเดล
    const updateUserData = async () => {
      const update: any = {};
      if (settings.displayName !== undefined) update['profile.displayName'] = settings.displayName;
      if (settings.bio !== undefined) update['profile.bio'] = settings.bio;
      if (settings.avatarUrl !== undefined) update['profile.avatar'] = settings.avatarUrl;
      if (settings.coverImageUrl !== undefined) update['profile.coverImage'] = settings.coverImageUrl;
      if (settings.emailNotifications !== undefined)
        update['preferences.notifications.email'] = settings.emailNotifications;
      if (settings.pushNotifications !== undefined)
        update['preferences.notifications.push'] = settings.pushNotifications;
      if (settings.novelUpdatesNotifications !== undefined)
        update['preferences.notifications.novelUpdates'] = settings.novelUpdatesNotifications;
      if (settings.profileVisibility !== undefined)
        update['preferences.privacy.profileVisibility'] = settings.profileVisibility;
      if (settings.showActivityStatus !== undefined)
        update['preferences.privacy.showActivityStatus'] = settings.showActivityStatus;
      if (settings.readingHistoryVisibility !== undefined)
        update['preferences.privacy.readingHistoryVisibility'] = settings.readingHistoryVisibility;

      if (Object.keys(update).length > 0) {
        // ตรวจสอบก่อนว่าผู้ใช้เป็นประเภทไหน
        const userExists = await UserModel().exists({ _id: session.user.id });
        if (userExists) {
          await UserModel().updateOne({ _id: session.user.id }, { $set: update });
        } else {
          await SocialMediaUserModel().updateOne({ _id: session.user.id }, { $set: update });
        }
      }
    };

    await updateUserData();

    // อัปเดต UserPreference
    const preferenceUpdate: any = {};
    if (settings.theme !== undefined) preferenceUpdate.theme = settings.theme;
    if (settings.language !== undefined) preferenceUpdate.language = settings.language;

    if (Object.keys(preferenceUpdate).length > 0) {
      await UserPreferenceModel().updateOne(
        { user: session.user.id },
        { $set: preferenceUpdate },
        { upsert: true }
      );
    }

    return NextResponse.json({ message: 'อัปเดตการตั้งค่าสำเร็จ' }, { status: 200 });
  } catch (error) {
    console.error('ข้อผิดพลาดในการอัปเดตการตั้งค่า:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}