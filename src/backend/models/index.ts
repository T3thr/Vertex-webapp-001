// src/backend/models/index.ts
// ไฟล์นี้ใช้สำหรับลงทะเบียน (register) โมเดลทั้งหมดในระบบ
// เพื่อแก้ไขปัญหา "MissingSchemaError: Schema hasn't been registered for model"

// Import mongoose
import mongoose from 'mongoose';

// Import all models
import Achievement from './Achievement';
import ActivityHistory from './ActivityHistory';
import AuditLog from './AuditLog';
import Badge from './Badge';
import Board from './Board';
import BoardClientSide from './BoardClientSide';
import Category from './Category';
import Character from './Character';
import Choice from './Choice';
import Comment from './Comment';
import ContentReport from './ContentReport';
import Donation from './Donation';
import DonationApplication from './DonationApplication';
import EarningAnalytic from './EarningAnalytic';
import EarningTransaction from './EarningTransaction';
import Episode from './Episode';
import Follow from './Follow';
import Level from './Level';
import Like from './Like';
import Media from './Media';
import MentalWellbeingInsights from './MentalWellbeingInsights';
import Notification from './Notification';
import Novel from './Novel';
import OfficialMedia from './OfficialMedia';
import Payment from './Payment';
import Purchase from './Purchase';
import Rating from './Rating';
import ReadingAnalytic from './ReadingAnalytic';
import ReadingAnalytic_EventStream from './ReadingAnalytic_EventStream';
import ReadingAnalytic_Summary from './ReadingAnalytic_Summary';
import Scene from './Scene';
import StoryMap from './StoryMap';
import User from './User';
import UserAchievement from './UserAchievement';
import UserGamification from './UserGamification';
import UserLibraryItem from './UserLibraryItem';
import UserProfile from './UserProfile';
import UserSecurity from './UserSecurity';
import UserSettings from './UserSettings';
import UserTracking from './UserTracking';
import WriterApplication from './WriterApplication';
import WriterStats from './WriterStats';

// Export all models
export {
    Achievement,
    ActivityHistory,
    AuditLog,
    Badge,
    Board,
    BoardClientSide,
    Category,
    Character,
    Choice,
    Comment,
    ContentReport,
    Donation,
    DonationApplication,
    EarningAnalytic,
    EarningTransaction,
    Episode,
    Follow,
    Level,
    Like,
    Media,
    MentalWellbeingInsights,
    Notification,
    Novel,
    OfficialMedia,
    Payment,
    Purchase,
    Rating,
    ReadingAnalytic,
    ReadingAnalytic_EventStream,
    ReadingAnalytic_Summary,
    Scene,
    StoryMap,
    User,
    UserAchievement,
    UserGamification,
    UserLibraryItem,
    UserProfile,
    UserSecurity,
    UserSettings,
    UserTracking,
    WriterApplication,
    WriterStats
};

// Function to register all models
export function registerModels() {
  // ตรวจสอบว่าโมเดลถูกลงทะเบียนแล้วหรือไม่
  try {
    if (mongoose.models && !mongoose.models.Category) {
      console.log('📝 [Mongoose] กำลังลงทะเบียนโมเดลทั้งหมด...');
    }
  } catch (error) {
    console.error('❌ [Mongoose] เกิดข้อผิดพลาดในการตรวจสอบโมเดล:', error);
  }
  
  // Models are registered when imported, but this function can be called
  // to ensure all models are registered at app startup
  return {
    Achievement,
    ActivityHistory,
    AuditLog,
    Badge,
    Board,
    BoardClientSide,
    Category,
    Character,
    Choice,
    Comment,
    ContentReport,
    Donation,
    DonationApplication,
    EarningAnalytic,
    EarningTransaction,
    Episode,
    Follow,
    Level,
    Like,
    Media,
    MentalWellbeingInsights,
    Notification,
    Novel,
    OfficialMedia,
    Payment,
    Purchase,
    Rating,
    ReadingAnalytic,
    ReadingAnalytic_EventStream,
    ReadingAnalytic_Summary,
    Scene,
    StoryMap,
    User,
    UserAchievement,
    UserGamification,
    UserLibraryItem,
    UserProfile,
    UserSecurity,
    UserSettings,
    UserTracking,
    WriterApplication,
    WriterStats,
  };
}

export default registerModels;
