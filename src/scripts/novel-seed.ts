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

// ข้อมูลนิยายตัวอย่างที่ปรับให้เข้ากับ INovel interface ใหม่
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false, // เพิ่มฟิลด์ isDiscounted
    averageRating: 4.8,
    ratingsCount: 900,
    viewsCount: 15000,
    totalReads: 12000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 50000, donationValue: 2000 },
        { year: 2025, month: 5, coinValue: 60000, donationValue: 3000 },
      ],
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
      dayOfWeek: 1, // วันจันทร์
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
    seo: {
      metaTitle: "The Shadow of Eternity",
      metaDescription: "ในโลกที่เวลาเบี่ยงเบนตามเจตจำนงของนักเวทย์โบราณ นักรบรุ่นใหม่ได้ค้นพบคาถาต้องห้ามที่อาจทำลายเนื้อผ้าแห่งความเป็นจริง",
      keywords: ["Fantasy", "Adventure", "Magic", "Time"],
      socialImage: "https://via.placeholder.com/1200x630?text=Shadow+Eternity",
    },
    embeddingVector: [],
    genreDistribution: { fantasy: 0.7, adventure: 0.3 },
    sentimentAnalysis: { overallScore: 0.9, dominantEmotion: "epic" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: true,
    isDiscounted: true, // เพิ่มส่วนลด
    discountDetails: { percentage: 15, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // เพิ่มรายละเอียดส่วนลด
    averageRating: 4.6,
    ratingsCount: 600,
    viewsCount: 9500,
    totalReads: 8000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 40000, donationValue: 1500 },
        { year: 2025, month: 5, coinValue: 40000, donationValue: 1500 },
      ],
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
      dayOfWeek: 2, // วันอังคาร
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
    seo: {
      metaTitle: "Neon Dreams",
      metaDescription: "นักโปรแกรมเมอร์ AI ต้องต่อสู้กับบริษัทยักษ์ใหญ่ในเมืองดิสโทเปียเพื่อเปิดโปงแผนการที่คุกคามเสรีภาพของมนุษยชาติ",
      keywords: ["Sci-Fi", "Cyberpunk", "Thriller", "AI"],
      socialImage: "https://via.placeholder.com/1200x630?text=Neon+Dreams",
    },
    embeddingVector: [],
    genreDistribution: { scifi: 0.6, thriller: 0.4 },
    sentimentAnalysis: { overallScore: 0.85, dominantEmotion: "intense" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.9,
    ratingsCount: 1000,
    viewsCount: 17000,
    totalReads: 14000,
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
      monthlyEarnings: [
        { year: 2025, month: 3, coinValue: 90000, donationValue: 3000 },
        { year: 2025, month: 4, coinValue: 100000, donationValue: 4000 },
      ],
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    seo: {
      metaTitle: "Whispers of the Forest",
      metaDescription: "เด็กหญิงคนหนึ่งค้นพบว่าเธอสามารถสื่อสารกับวิญญาณโบราณในป่าลึกลับ แต่พรสวรรค์ของเธอมาพร้อมกับราคาที่อันตราย",
      keywords: ["Fantasy", "Mystery", "Supernatural", "Coming of Age"],
      socialImage: "https://via.placeholder.com/1200x630?text=Whispers+Forest",
    },
    embeddingVector: [],
    genreDistribution: { fantasy: 0.5, mystery: 0.3, supernatural: 0.2 },
    sentimentAnalysis: { overallScore: 0.95, dominantEmotion: "mystical" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.3,
    ratingsCount: 420,
    viewsCount: 8000,
    totalReads: 6500,
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
      monthlyEarnings: [
        { year: 2025, month: 2, coinValue: 30000, donationValue: 1000 },
        { year: 2025, month: 3, coinValue: 35000, donationValue: 1000 },
      ],
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    seo: {
      metaTitle: "Starborn Legacy",
      metaDescription: "สงครามดวงดาวบังคับให้วีรบุรุษผู้ไม่เต็มใจต้องใช้อาวุธจักรวาลที่อาจช่วยหรือทำลายกาแล็กซี่",
      keywords: ["Sci-Fi", "Space Opera", "Action", "War"],
      socialImage: "https://via.placeholder.com/1200x630?text=Starborn+Legacy",
    },
    embeddingVector: [],
    genreDistribution: { scifi: 0.6, action: 0.4 },
    sentimentAnalysis: { overallScore: 0.8, dominantEmotion: "heroic" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.6,
    ratingsCount: 650,
    viewsCount: 10000,
    totalReads: 8500,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 45000, donationValue: 2000 },
        { year: 2025, month: 5, coinValue: 45000, donationValue: 2000 },
      ],
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
      dayOfWeek: 3, // วันพุธ
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
    seo: {
      metaTitle: "Crimson Skies",
      metaDescription: "ในโลกที่ปกครองโดยเรือเหาะและอาณาจักรลอยฟ้า นักบินผู้เสื่อมเสียชื่อเสียงมองหาการไถ่บาปด้วยการเปิดโปงการสมคบคิดบนท้องฟ้า",
      keywords: ["Steampunk", "Adventure", "Fantasy", "Sky"],
      socialImage: "https://via.placeholder.com/1200x630?text=Crimson+Skies",
    },
    embeddingVector: [],
    genreDistribution: { steampunk: 0.5, adventure: 0.3, fantasy: 0.2 },
    sentimentAnalysis: { overallScore: 0.87, dominantEmotion: "adventurous" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.4,
    ratingsCount: 400,
    viewsCount: 7200,
    totalReads: 6000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 25000, donationValue: 1000 },
        { year: 2025, month: 5, coinValue: 30000, donationValue: 1000 },
      ],
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
      dayOfWeek: 4, // วันพฤหัสบดี
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
    seo: {
      metaTitle: "Echoes of the Deep",
      metaDescription: "ใต้ผิวน้ำมหาสมุทรซ่อนอารยธรรมโบราณที่คอยปกป้องความลับที่อาจเปลี่ยนโลก จนกระทั่งนักดำน้ำลึกบังเอิญค้นพบมัน",
      keywords: ["Mystery", "Ocean", "Sci-Fi", "Adventure"],
      socialImage: "https://via.placeholder.com/1200x630?text=Echoes+Deep",
    },
    embeddingVector: [],
    genreDistribution: { mystery: 0.4, scifi: 0.3, adventure: 0.3 },
    sentimentAnalysis: { overallScore: 0.82, dominantEmotion: "intriguing" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
  },
  {
    title: "Moonlight Requiem",
    slug: "moonlight-requiem",
    description:
      "นักไวโอลินที่ถูกสาปเดินเร่ร่อนในเมืองใต้แสงจันทร์ บรรเลงทำนองที่ปลุกความทรงจำของวิญญาณที่สูญหาย — และบางครั้งก็ปลุกสิ่งที่มืดมนยิ่งกว่า",
    coverImage: "https://via.placeholder.com/400x600?text=Moonlight+Requiem",
    tags: ["Fantasy", "Horror", "Music", "Dark"],
    status: "completed", // เปลี่ยนจาก discount เป็น completed
    visibility: "public",
    language: "th",
    isExplicitContent: true,
    ageRating: "adult18+",
    isOriginalWork: true,
    originalLanguage: "th",
    isPremium: true,
    isDiscounted: true, // เพิ่มส่วนลด
    discountDetails: { percentage: 20, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // เพิ่มรายละเอียดส่วนลด
    averageRating: 4.7,
    ratingsCount: 700,
    viewsCount: 11000,
    totalReads: 9000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 50000, donationValue: 2000 },
        { year: 2025, month: 5, coinValue: 50000, donationValue: 2500 },
      ],
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
      dayOfWeek: 5, // วันศุกร์
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
    seo: {
      metaTitle: "Moonlight Requiem",
      metaDescription: "นักไวโอลินที่ถูกสาปเดินเร่ร่อนในเมืองใต้แสงจันทร์ บรรเลงทำนองที่ปลุกความทรงจำของวิญญาณที่สูญหาย",
      keywords: ["Fantasy", "Horror", "Music", "Dark"],
      socialImage: "https://via.placeholder.com/1200x630?text=Moonlight+Requiem",
    },
    embeddingVector: [],
    genreDistribution: { fantasy: 0.4, horror: 0.4, music: 0.2 },
    sentimentAnalysis: { overallScore: 0.88, dominantEmotion: "dark" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.5,
    ratingsCount: 500,
    viewsCount: 8700,
    totalReads: 7000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 35000, donationValue: 1000 },
        { year: 2025, month: 5, coinValue: 40000, donationValue: 1500 },
      ],
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
      dayOfWeek: 6, // วันเสาร์
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
    seo: {
      metaTitle: "Digital Prophet",
      metaDescription: "ในอนาคตที่อัลกอริทึมทำนายทุกความเคลื่อนไหว นักคณิตศาสตร์นอกกฎหมายเขียนสูตรที่สามารถท้าทายชะตากรรมได้",
      keywords: ["Sci-Fi", "Techno-thriller", "Philosophy", "Future"],
      socialImage: "https://via.placeholder.com/1200x630?text=Digital+Prophet",
    },
    embeddingVector: [],
    genreDistribution: { scifi: 0.6, thriller: 0.4 },
    sentimentAnalysis: { overallScore: 0.85, dominantEmotion: "thought-provoking" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.7,
    ratingsCount: 800,
    viewsCount: 13000,
    totalReads: 11000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 60000, donationValue: 2500 },
        { year: 2025, month: 5, coinValue: 60000, donationValue: 2500 },
      ],
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
      dayOfWeek: 0, // วันอาทิตย์
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
    seo: {
      metaTitle: "Ashes of the Phoenix",
      metaDescription: "หลังการล่มสลายของจักรวรรดิยิ่งใหญ่ นักรบผู้โดดเดี่ยวลุกขึ้นจากซากปรักหักพังเพื่อจุดประกายการปฏิวัติ",
      keywords: ["Action", "Fantasy", "Rebellion", "Empire"],
      socialImage: "https://via.placeholder.com/1200x630?text=Ashes+Phoenix",
    },
    embeddingVector: [],
    genreDistribution: { action: 0.5, fantasy: 0.5 },
    sentimentAnalysis: { overallScore: 0.9, dominantEmotion: "epic" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.6,
    ratingsCount: 600,
    viewsCount: 10500,
    totalReads: 8500,
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
      monthlyEarnings: [
        { year: 2025, month: 3, coinValue: 40000, donationValue: 1500 },
        { year: 2025, month: 4, coinValue: 45000, donationValue: 1500 },
      ],
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    seo: {
      metaTitle: "The Librarian's Code",
      metaDescription: "ซ่อนอยู่ในห้องสมุดโบราณคือรหัสที่เชื่อมโยงทุกเรื่องราวที่เคยถูกเขียนขึ้น",
      keywords: ["Mystery", "Fantasy", "Library", "Secret"],
      socialImage: "https://via.placeholder.com/1200x630?text=Librarians+Code",
    },
    embeddingVector: [],
    genreDistribution: { mystery: 0.6, fantasy: 0.4 },
    sentimentAnalysis: { overallScore: 0.85, dominantEmotion: "intriguing" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.4,
    ratingsCount: 460,
    viewsCount: 8200,
    totalReads: 6500,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 35000, donationValue: 1000 },
        { year: 2025, month: 5, coinValue: 35000, donationValue: 1500 },
      ],
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
      dayOfWeek: 1, // วันจันทร์
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
    seo: {
      metaTitle: "Chrono Alchemist",
      metaDescription: "นักเล่นแร่แปรธาตุค้นพบวิธีควบคุมเวลา แต่ทุกการเปลี่ยนแปลงในอดีตต้องแลกมาด้วยการเสียสละในปัจจุบัน",
      keywords: ["Fantasy", "Time Travel", "Alchemy", "Adventure"],
      socialImage: "https://via.placeholder.com/1200x630?text=Chrono+Alchemist",
    },
    embeddingVector: [],
    genreDistribution: { fantasy: 0.6, adventure: 0.4 },
    sentimentAnalysis: { overallScore: 0.83, dominantEmotion: "adventurous" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.8,
    ratingsCount: 850,
    viewsCount: 14000,
    totalReads: 12000,
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
      monthlyEarnings: [
        { year: 2025, month: 3, coinValue: 70000, donationValue: 3000 },
        { year: 2025, month: 4, coinValue: 75000, donationValue: 3000 },
      ],
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    seo: {
      metaTitle: "Silent Frequency",
      metaDescription: "วิศวกรวิทยุได้รับสัญญาณลึกลับที่เปิดเผยภัยพิบัติในอนาคต",
      keywords: ["Sci-Fi", "Thriller", "Mystery", "Radio"],
      socialImage: "https://via.placeholder.com/1200x630?text=Silent+Frequency",
    },
    embeddingVector: [],
    genreDistribution: { scifi: 0.5, thriller: 0.3, mystery: 0.2 },
    sentimentAnalysis: { overallScore: 0.9, dominantEmotion: "suspenseful" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.7,
    ratingsCount: 800,
    viewsCount: 13500,
    totalReads: 11000,
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
      monthlyEarnings: [
        { year: 2025, month: 3, coinValue: 65000, donationValue: 2500 },
        { year: 2025, month: 4, coinValue: 65000, donationValue: 2500 },
      ],
    },
    settings: {
      allowComments: true,
      showContentWarnings: false,
      contentWarnings: [],
      enableMonetization: true,
      enableDonations: true,
      enableCharacterDonations: false,
    },
    seo: {
      metaTitle: "Garden of Glass",
      metaDescription: "ในเมืองที่ดอกไม้ถูกห้าม นักพฤกษศาสตร์หนุ่มสร้างเรือนกระจกลับ",
      keywords: ["Dystopia", "Nature", "Drama", "Rebellion"],
      socialImage: "https://via.placeholder.com/1200x630?text=Garden+Glass",
    },
    embeddingVector: [],
    genreDistribution: { dystopia: 0.5, drama: 0.3, rebellion: 0.2 },
    sentimentAnalysis: { overallScore: 0.87, dominantEmotion: "hopeful" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.5,
    ratingsCount: 520,
    viewsCount: 9000,
    totalReads: 7500,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 35000, donationValue: 1500 },
        { year: 2025, month: 5, coinValue: 40000, donationValue: 1500 },
      ],
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
      dayOfWeek: 2, // วันอังคาร
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
    seo: {
      metaTitle: "Quantum Harmony",
      metaDescription: "นักดนตรีและนักฟิสิกส์ร่วมมือกันเพื่อค้นพบความถี่เสียงที่สามารถเชื่อมต่อกับมิติขนาน",
      keywords: ["Sci-Fi", "Music", "Multiverse", "Collaboration"],
      socialImage: "https://via.placeholder.com/1200x630?text=Quantum+Harmony",
    },
    embeddingVector: [],
    genreDistribution: { scifi: 0.6, music: 0.4 },
    sentimentAnalysis: { overallScore: 0.85, dominantEmotion: "innovative" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: false,
    isDiscounted: false,
    averageRating: 4.6,
    ratingsCount: 650,
    viewsCount: 10200,
    totalReads: 8500,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 45000, donationValue: 1500 },
        { year: 2025, month: 5, coinValue: 48000, donationValue: 2000 },
      ],
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
      dayOfWeek: 3, // วันพุธ
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
    seo: {
      metaTitle: "Midnight Cartographer",
      metaDescription: "นักทำแผนที่สาวพบว่าแผนที่ของเธอเปลี่ยนแปลงทุกคืนเที่ยงคืน เผยให้เห็นเมืองซ่อนเร้น",
      keywords: ["Fantasy", "Adventure", "Maps", "Hidden World"],
      socialImage: "https://via.placeholder.com/1200x630?text=Midnight+Cartographer",
    },
    embeddingVector: [],
    genreDistribution: { fantasy: 0.6, adventure: 0.4 },
    sentimentAnalysis: { overallScore: 0.87, dominantEmotion: "mysterious" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
    originalLanguage: "th",
    isPremium: true,
    isDiscounted: true, // เพิ่มส่วนลด
    discountDetails: { percentage: 10, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // เพิ่มรายละเอียดส่วนลด
    averageRating: 4.9,
    ratingsCount: 900,
    viewsCount: 16000,
    totalReads: 14000,
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
      monthlyEarnings: [
        { year: 2025, month: 4, coinValue: 75000, donationValue: 3500 },
        { year: 2025, month: 5, coinValue: 75000, donationValue: 3500 },
      ],
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
      dayOfWeek: 4, // วันพฤหัสบดี
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
    seo: {
      metaTitle: "Urban Spirits",
      metaDescription: "ในกรุงเทพมหานครยุคดิจิทัล ยังมีวิญญาณเก่าแก่สิงสถิตอยู่ตามตึกระฟ้าและซอยเล็กซอยน้อย",
      keywords: ["Urban Fantasy", "Thai", "Supernatural", "Modern"],
      socialImage: "https://via.placeholder.com/1200x630?text=Urban+Spirits",
    },
    embeddingVector: [],
    genreDistribution: { urbanFantasy: 0.6, supernatural: 0.4 },
    sentimentAnalysis: { overallScore: 0.92, dominantEmotion: "mystical" },
    isDeleted: false,
    lastEpisodePublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    firstPublishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastSignificantUpdateAt: new Date(),
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
        categories.map((cat) => ({
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
        .map((cat) => cat._id);

      const preparedNovel = {
        ...novelData,
        author: authorId,
        categories: selectedCategories,
        subCategories: [], // ไม่ใช้ subCategories ใน seed นี้
        featuredOfficialMedia: [], // ไม่ใช้ featuredOfficialMedia ใน seed นี้
        seo: {
          metaTitle: novelData.title,
          metaDescription: novelData.description ? novelData.description.slice(0, 160) : "",
          keywords: novelData.tags,
          socialImage: novelData.coverImage ? novelData.coverImage.replace("400x600", "1200x630") : "",
        },
        embeddingVector: novelData.embeddingVector || [],
        genreDistribution: novelData.genreDistribution || {},
        sentimentAnalysis: novelData.sentimentAnalysis || { overallScore: 0, dominantEmotion: "" },
        isDeleted: false,
        deletedAt: undefined,
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