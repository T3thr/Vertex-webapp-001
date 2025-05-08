// src/scripts/novel-seed.ts
import mongoose, { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel";
import CategoryModel from "@/backend/models/Category";
import { config } from "dotenv";

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: ".env" });

// เตรียมข้อมูลหมวดหมู่เบื้องต้น
const categories = [
  { name: "แฟนตาซี", slug: "fantasy", description: "นิยายแนวแฟนตาซีที่เต็มไปด้วยเวทมนตร์และการผจญภัย" },
  { name: "ไซไฟ", slug: "sci-fi", description: "นิยายแนววิทยาศาสตร์และเทคโนโลยีในอนาคต" },
  { name: "โรแมนซ์", slug: "romance", description: "นิยายแนวความรักและความสัมพันธ์" },
  { name: "สยองขวัญ", slug: "horror", description: "นิยายแนวสยองขวัญและระทึกขวัญ" },
  { name: "แอ็คชั่น", slug: "action", description: "นิยายแนวต่อสู้และการผจญภัย" },
  { name: "ดราม่า", slug: "drama", description: "นิยายแนวชีวิตและความสัมพันธ์" },
  { name: "ลึกลับ", slug: "mystery", description: "นิยายแนวสืบสวนและปริศนา" },
];

// ข้อมูลนิยายตัวอย่าง (รักษาชื่อและคำอธิบายเดิม แต่ปรับให้เข้ากับ INovel interface)
const sampleNovels: Array<Partial<INovel>> = [
  {
    title: "The Shadow of Eternity",
    slug: "shadow-of-eternity",
    description:
      "ในโลกที่เวลาเบี่ยงเบนตามเจตจำนงของนักเวทย์โบราณ นักรบรุ่นใหม่ได้ค้นพบคาถาต้องห้ามที่อาจทำลายเนื้อผ้าแห่งความเป็นจริง",
    coverImage: "https://via.placeholder.com/400x600?text=Shadow+Eternity",
    tags: ["Fantasy", "Adventure", "Magic", "Time"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.8,
    ratingsCount: 900,
    viewsCount: 15000,
    likesCount: 4000,
    followersCount: 3200,
    commentsCount: 200,
    episodesCount: 20,
    publishedEpisodesCount: 20,
    wordsCount: 80000,
    stats: {
      totalPurchasesAmount: 110000,
      totalDonationsAmount: 5000,
      completionRate: 85,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 1, // Monday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Neon Dreams",
    slug: "neon-dreams",
    description:
      "นักโปรแกรมเมอร์ AI ต้องต่อสู้กับบริษัทยักษ์ใหญ่ในเมืองดิสโทเปียเพื่อเปิดโปงแผนการที่คุกคามเสรีภาพของมนุษยชาติ",
    coverImage: "https://via.placeholder.com/400x600?text=Neon+Dreams",
    tags: ["Sci-Fi", "Cyberpunk", "Thriller", "AI"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: true,
    ageRating: "mature17+",
    isOriginalWork: true,
    isPremium: true,
    averageRating: 4.6,
    ratingsCount: 600,
    viewsCount: 9500,
    likesCount: 2300,
    followersCount: 2100,
    commentsCount: 150,
    episodesCount: 15,
    publishedEpisodesCount: 15,
    wordsCount: 60000,
    stats: {
      totalPurchasesAmount: 80000,
      totalDonationsAmount: 3000,
      completionRate: 80,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: true,
      contentWarnings: ["Violence", "Strong Language"],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 2, // Tuesday
      timeOfDay: "10:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: true,
      hasMultipleEndings: true,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Whispers of the Forest",
    slug: "whispers-of-the-forest",
    description:
      "เด็กหญิงคนหนึ่งค้นพบว่าเธอสามารถสื่อสารกับวิญญาณโบราณในป่าลึกลับ แต่พรสวรรค์ของเธอมาพร้อมกับราคาที่อันตราย",
    coverImage: "https://via.placeholder.com/400x600?text=Whispers+Forest",
    tags: ["Fantasy", "Mystery", "Supernatural", "Coming of Age"],
    status: "completed",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "everyone",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.9,
    ratingsCount: 1000,
    viewsCount: 17000,
    likesCount: 4500,
    followersCount: 3800,
    commentsCount: 350,
    episodesCount: 25,
    publishedEpisodesCount: 25,
    wordsCount: 100000,
    stats: {
      totalPurchasesAmount: 190000,
      totalDonationsAmount: 7000,
      completionRate: 90,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Starborn Legacy",
    slug: "starborn-legacy",
    description:
      "สงครามดวงดาวบังคับให้วีรบุรุษผู้ไม่เต็มใจต้องใช้อาวุธจักรวาลที่อาจช่วยหรือทำลายกาแล็กซี่",
    coverImage: "https://via.placeholder.com/400x600?text=Starborn+Legacy",
    tags: ["Sci-Fi", "Space Opera", "Action", "War"],
    status: "onHiatus",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.3,
    ratingsCount: 420,
    viewsCount: 8000,
    likesCount: 1900,
    followersCount: 1600,
    commentsCount: 130,
    episodesCount: 10,
    publishedEpisodesCount: 10,
    wordsCount: 40000,
    stats: {
      totalPurchasesAmount: 65000,
      totalDonationsAmount: 2000,
      completionRate: 70,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Crimson Skies",
    slug: "crimson-skies",
    description:
      "ในโลกที่ปกครองโดยเรือเหาะและอาณาจักรลอยฟ้า นักบินผู้เสื่อมเสียชื่อเสียงมองหาการไถ่บาปด้วยการเปิดโปงการสมคบคิดบนท้องฟ้า",
    coverImage: "https://via.placeholder.com/400x600?text=Crimson+Skies",
    tags: ["Steampunk", "Adventure", "Fantasy", "Sky"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.6,
    ratingsCount: 650,
    viewsCount: 10000,
    likesCount: 2600,
    followersCount: 2200,
    commentsCount: 170,
    episodesCount: 18,
    publishedEpisodesCount: 18,
    wordsCount: 72000,
    stats: {
      totalPurchasesAmount: 90000,
      totalDonationsAmount: 4000,
      completionRate: 82,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 3, // Wednesday
      timeOfDay: "08:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Echoes of the Deep",
    slug: "echoes-of-the-deep",
    description:
      "ใต้ผิวน้ำมหาสมุทรซ่อนอารยธรรมโบราณที่คอยปกป้องความลับที่อาจเปลี่ยนโลก จนกระทั่งนักดำน้ำลึกบังเอิญค้นพบมัน",
    coverImage: "https://via.placeholder.com/400x600?text=Echoes+Deep",
    tags: ["Mystery", "Ocean", "Sci-Fi", "Adventure"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "everyone",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.4,
    ratingsCount: 400,
    viewsCount: 7200,
    likesCount: 1700,
    followersCount: 1500,
    commentsCount: 100,
    episodesCount: 12,
    publishedEpisodesCount: 12,
    wordsCount: 48000,
    stats: {
      totalPurchasesAmount: 55000,
      totalDonationsAmount: 2000,
      completionRate: 75,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 4, // Thursday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Moonlight Requiem",
    slug: "moonlight-requiem",
    description:
      "นักไวโอลินที่ถูกสาปเดินเร่ร่อนในเมืองใต้แสงจันทร์ บรรเลงทำนองที่ปลุกความทรงจำของวิญญาณที่สูญหาย — และบางครั้งก็ปลุกสิ่งที่มืดมนยิ่งกว่า",
    coverImage: "https://via.placeholder.com/400x600?text=Moonlight+Requiem",
    tags: ["Fantasy", "Horror", "Music", "Dark"],
    status: "discount",
    visibility: "public",
    language: "th",
    isExplicitContent: true,
    ageRating: "adult18+",
    isOriginalWork: true,
    isPremium: true,
    averageRating: 4.7,
    ratingsCount: 700,
    viewsCount: 11000,
    likesCount: 2900,
    followersCount: 2500,
    commentsCount: 220,
    episodesCount: 16,
    publishedEpisodesCount: 16,
    wordsCount: 64000,
    stats: {
      totalPurchasesAmount: 100000,
      totalDonationsAmount: 4500,
      completionRate: 83,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: true,
      contentWarnings: ["Horror", "Dark Themes"],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 5, // Friday
      timeOfDay: "10:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: true,
      hasMultipleEndings: true,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Digital Prophet",
    slug: "digital-prophet",
    description:
      "ในอนาคตที่อัลกอริทึมทำนายทุกความเคลื่อนไหว นักคณิตศาสตร์นอกกฎหมายเขียนสูตรที่สามารถท้าทายชะตากรรมได้",
    coverImage: "https://via.placeholder.com/400x600?text=Digital+Prophet",
    tags: ["Sci-Fi", "Techno-thriller", "Philosophy", "Future"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.5,
    ratingsCount: 500,
    viewsCount: 8700,
    likesCount: 2100,
    followersCount: 1900,
    commentsCount: 160,
    episodesCount: 14,
    publishedEpisodesCount: 14,
    wordsCount: 56000,
    stats: {
      totalPurchasesAmount: 75000,
      totalDonationsAmount: 2500,
      completionRate: 78,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 6, // Saturday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Ashes of the Phoenix",
    slug: "ashes-of-the-phoenix",
    description:
      "หลังการล่มสลายของจักรวรรดิยิ่งใหญ่ นักรบผู้โดดเดี่ยวลุกขึ้นจากซากปรักหักพังเพื่อจุดประกายการปฏิวัติ — นำทางด้วยภาพนิมิตของนกไฟลุกโชน",
    coverImage: "https://via.placeholder.com/400x600?text=Ashes+Phoenix",
    tags: ["Action", "Fantasy", "Rebellion", "Empire"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.7,
    ratingsCount: 800,
    viewsCount: 13000,
    likesCount: 3400,
    followersCount: 2900,
    commentsCount: 250,
    episodesCount: 22,
    publishedEpisodesCount: 22,
    wordsCount: 88000,
    stats: {
      totalPurchasesAmount: 120000,
      totalDonationsAmount: 5000,
      completionRate: 87,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 0, // Sunday
      timeOfDay: "08:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "The Librarian's Code",
    slug: "librarians-code",
    description:
      "ซ่อนอยู่ในห้องสมุดโบราณคือรหัสที่เชื่อมโยงทุกเรื่องราวที่เคยถูกเขียนขึ้น — และบรรณารักษ์ที่สาบานว่าจะปกป้องมัน",
    coverImage: "https://via.placeholder.com/400x600?text=Librarians+Code",
    tags: ["Mystery", "Fantasy", "Library", "Secret"],
    status: "completed",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "everyone",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.6,
    ratingsCount: 600,
    viewsCount: 10500,
    likesCount: 2500,
    followersCount: 2200,
    commentsCount: 190,
    episodesCount: 18,
    publishedEpisodesCount: 18,
    wordsCount: 72000,
    stats: {
      totalPurchasesAmount: 85000,
      totalDonationsAmount: 3000,
      completionRate: 80,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Chrono Alchemist",
    slug: "chrono-alchemist",
    description:
      "นักเล่นแร่แปรธาตุค้นพบวิธีควบคุมเวลา แต่ทุกการเปลี่ยนแปลงในอดีตต้องแลกมาด้วยการเสียสละในปัจจุบัน",
    coverImage: "https://via.placeholder.com/400x600?text=Chrono+Alchemist",
    tags: ["Fantasy", "Time Travel", "Alchemy", "Adventure"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.4,
    ratingsCount: 460,
    viewsCount: 8200,
    likesCount: 2000,
    followersCount: 1800,
    commentsCount: 150,
    episodesCount: 13,
    publishedEpisodesCount: 13,
    wordsCount: 52000,
    stats: {
      totalPurchasesAmount: 70000,
      totalDonationsAmount: 2500,
      completionRate: 76,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 1, // Monday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: true,
      hasMultipleEndings: true,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Silent Frequency",
    slug: "silent-frequency",
    description:
      "วิศวกรวิทยุได้รับสัญญาณลึกลับที่เปิดเผยภัยพิบัติในอนาคต — และตอนนี้เขาต้องหยุดมันก่อนที่โลกจะรับฟัง",
    coverImage: "https://via.placeholder.com/400x600?text=Silent+Frequency",
    tags: ["Sci-Fi", "Thriller", "Mystery", "Radio"],
    status: "completed",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.8,
    ratingsCount: 850,
    viewsCount: 14000,
    likesCount: 3700,
    followersCount: 3100,
    commentsCount: 280,
    episodesCount: 20,
    publishedEpisodesCount: 20,
    wordsCount: 80000,
    stats: {
      totalPurchasesAmount: 145000,
      totalDonationsAmount: 6000,
      completionRate: 88,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Garden of Glass",
    slug: "garden-of-glass",
    description:
      "ในเมืองที่ดอกไม้ถูกห้าม นักพฤกษศาสตร์หนุ่มสร้างเรือนกระจกลับ — และค้นพบชีวิตที่ต่อสู้กลับ",
    coverImage: "https://via.placeholder.com/400x600?text=Garden+Glass",
    tags: ["Dystopia", "Nature", "Drama", "Rebellion"],
    status: "completed",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.7,
    ratingsCount: 800,
    viewsCount: 13500,
    likesCount: 3400,
    followersCount: 3000,
    commentsCount: 260,
    episodesCount: 22,
    publishedEpisodesCount: 22,
    wordsCount: 88000,
    stats: {
      totalPurchasesAmount: 130000,
      totalDonationsAmount: 5000,
      completionRate: 85,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Quantum Harmony",
    slug: "quantum-harmony",
    description:
      "นักดนตรีและนักฟิสิกส์ร่วมมือกันเพื่อค้นพบความถี่เสียงที่สามารถเชื่อมต่อกับมิติขนาน แต่เมื่อบทเพลงดังขึ้น บางสิ่งจากอีกด้านก็เริ่มตอบกลับมา",
    coverImage: "https://via.placeholder.com/400x600?text=Quantum+Harmony",
    tags: ["Sci-Fi", "Music", "Multiverse", "Collaboration"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.5,
    ratingsCount: 520,
    viewsCount: 9000,
    likesCount: 2200,
    followersCount: 2000,
    commentsCount: 170,
    episodesCount: 15,
    publishedEpisodesCount: 15,
    wordsCount: 60000,
    stats: {
      totalPurchasesAmount: 75000,
      totalDonationsAmount: 3000,
      completionRate: 80,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 2, // Tuesday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: true,
      hasMultipleEndings: true,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Midnight Cartographer",
    slug: "midnight-cartographer",
    description:
      "นักทำแผนที่สาวพบว่าแผนที่ของเธอเปลี่ยนแปลงทุกคืนเที่ยงคืน เผยให้เห็นเมืองซ่อนเร้นและเส้นทางลับที่นำไปสู่อาณาจักรที่ถูกลืม",
    coverImage: "https://via.placeholder.com/400x600?text=Midnight+Cartographer",
    tags: ["Fantasy", "Adventure", "Maps", "Hidden World"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "everyone",
    isOriginalWork: true,
    isPremium: false,
    averageRating: 4.6,
    ratingsCount: 650,
    viewsCount: 10200,
    likesCount: 2600,
    followersCount: 2250,
    commentsCount: 195,
    episodesCount: 17,
    publishedEpisodesCount: 17,
    wordsCount: 68000,
    stats: {
      totalPurchasesAmount: 93000,
      totalDonationsAmount: 3500,
      completionRate: 82,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 3, // Wednesday
      timeOfDay: "10:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: false,
      hasMultipleEndings: false,
      hasStatSystem: false,
      hasRelationshipSystem: false,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Urban Spirits",
    slug: "urban-spirits",
    description:
      "ในกรุงเทพมหานครยุคดิจิทัล ยังมีวิญญาณเก่าแก่สิงสถิตอยู่ตามตึกระฟ้าและซอยเล็กซอยน้อย เมื่อสาวออฟฟิศค้นพบว่าเธอสามารถมองเห็นพวกมันได้ ชีวิตของเธอก็เปลี่ยนไปตลอดกาล",
    coverImage: "https://via.placeholder.com/400x600?text=Urban+Spirits",
    tags: ["Urban Fantasy", "Thai", "Supernatural", "Modern"],
    status: "published",
    visibility: "public",
    language: "th",
    isExplicitContent: false,
    ageRating: "teen",
    isOriginalWork: true,
    isPremium: true,
    averageRating: 4.9,
    ratingsCount: 900,
    viewsCount: 16000,
    likesCount: 4100,
    followersCount: 3500,
    commentsCount: 310,
    episodesCount: 24,
    publishedEpisodesCount: 24,
    wordsCount: 96000,
    stats: {
      totalPurchasesAmount: 150000,
      totalDonationsAmount: 7000,
      completionRate: 90,
      lastViewedAt: new Date(),
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      dayOfWeek: 4, // Thursday
      timeOfDay: "09:00",
      nextExpectedReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    gameElementsSummary: {
      hasChoices: true,
      hasMultipleEndings: true,
      hasStatSystem: true,
      hasRelationshipSystem: true,
      hasInventorySystem: false,
    },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
];

/**
 * เตรียมข้อมูลหมวดหมู่
 * @returns รายการหมวดหมู่ที่ดึงหรือสร้างใหม่
 */
async function seedCategories() {
  try {
    const Category = CategoryModel();

    // ตรวจสอบว่ามีหมวดหมู่อยู่แล้วหรือไม่
    const existingCategories = await Category.countDocuments();

    if (existingCategories === 0) {
      console.log("🌱 เริ่มเพิ่มข้อมูลหมวดหมู่...");
      await Category.insertMany(
        categories.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isActive: true,
          order: 0,
        }))
      );
      console.log(`✅ เพิ่มข้อมูลหมวดหมู่ ${categories.length} รายการสำเร็จ`);
    } else {
      console.log(`ℹ️ มีหมวดหมู่ ${existingCategories} รายการอยู่แล้ว ข้ามการเพิ่มข้อมูล`);
    }

    // ดึงข้อมูลหมวดหมู่ทั้งหมดเพื่อใช้ในขั้นตอนต่อไป
    return await Category.find().lean();
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลหมวดหมู่:", error.message);
    return [];
  }
}

/**
 * ดึง ID ของผู้เขียนจาก User model
 * @returns ObjectId ของผู้เขียน
 */
async function getAuthorId() {
  try {
    const UserModel = (await import("@/backend/models/User")).default;
    const User = UserModel();
    const author = await User.findOne({ role: "Writer", username: process.env.AUTHOR_USERNAME });
    if (!author) {
      throw new Error("ไม่พบผู้ใช้ที่มีบทบาท Writer และ username ตามที่กำหนดใน .env");
    }
    return author._id;
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการดึง ID ผู้เขียน:", error.message);
    throw error;
  }
}

/**
 * อัปเดตหรือเพิ่มข้อมูลนิยาย
 */
async function seedNovels() {
  try {
    // เชื่อมต่อกับ MongoDB
    await dbConnect();
    console.log("✅ เชื่อมต่อกับ MongoDB สำเร็จ");

    // ดึง ID ผู้เขียน
    const authorId = await getAuthorId();
    console.log("✅ ดึง ID ผู้เขียนสำเร็จ");

    // เตรียมข้อมูลหมวดหมู่
    const categories = await seedCategories();

    // ดึง Novel model
    const Novel = NovelModel();

    // ตรวจสอบจำนวนนิยายที่มีอยู่แล้ว
    const existingNovelsCount = await Novel.countDocuments();
    console.log(`ℹ️ มีนิยายอยู่แล้ว ${existingNovelsCount} เรื่อง`);

    console.log("🌱 เริ่มเพิ่มหรืออัปเดตข้อมูลนิยาย...");

    // เตรียมข้อมูลนิยายพร้อมกับ ID ของผู้เขียนและหมวดหมู่
    for (const novelData of sampleNovels) {
      // สุ่มเลือกหมวดหมู่ 1-3 หมวด
      const numCategories = Math.floor(Math.random() * 3) + 1;
      const selectedCategories = [...categories]
        .sort(() => 0.5 - Math.random())
        .slice(0, numCategories)
        .map(cat => cat._id);

      const preparedNovel = {
        ...novelData,
        author: authorId,
        categories: selectedCategories,
        subCategories: [], // ไม่ใช้ subCategories ใน seed นี้
        featuredOfficialMedia: [],
        seo: {
          metaTitle: novelData.title,
          metaDescription: novelData.description ? novelData.description.slice(0, 160) : "",
          keywords: novelData.tags,
        },
        isDeleted: false,
      };

      // ตรวจสอบว่ามีนิยายที่มีชื่อนี้และผู้เขียนนี้อยู่แล้วหรือไม่
      const existingNovel = await Novel.findOne({ title: novelData.title, author: authorId });

      if (existingNovel) {
        // อัปเดตนิยายที่มีอยู่
        await Novel.updateOne({ _id: existingNovel._id }, { $set: preparedNovel });
        console.log(`📚 อัปเดตนิยาย: ${novelData.title} (${novelData.status})`);
      } else {
        // เพิ่มนิยายใหม่
        const newNovel = await Novel.create(preparedNovel);
        console.log(`📚 เพิ่มนิยายใหม่: ${newNovel.title} (${newNovel.status})`);
      }
    }

    console.log(`🎉 อัปเดตหรือเพิ่มนิยาย ${sampleNovels.length} เรื่องสำเร็จ`);

    // ออกจากโปรแกรมด้วยรหัสสำเร็จ
    console.log("✅ การเพิ่มข้อมูลเสร็จสมบูรณ์");
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลนิยาย:", error.message);
  } finally {
    // ปิดการเชื่อมต่อ MongoDB
    try {
      await mongoose.connection.close();
      console.log("🔌 ปิดการเชื่อมต่อ MongoDB แล้ว");
    } catch (closeError) {
      console.error("❌ เกิดข้อผิดพลาดในการปิดการเชื่อมต่อ MongoDB:", closeError);
    }
    process.exit(0);
  }
}

// เริ่มการทำงาน
seedNovels();