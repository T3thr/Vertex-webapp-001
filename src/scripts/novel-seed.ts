// src/scripts/novel-seed.ts
import mongoose, { Types } from "mongoose";
import dbConnect from "@/backend/lib/mongodb";
import NovelModel, { INovel } from "@/backend/models/Novel";
import UserModel from "@/backend/models/User";
import CategoryModel from "@/backend/models/Category";
import * as dotenv from "dotenv";

dotenv.config();

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

// ข้อมูลนิยายตัวอย่าง
const sampleNovels: Array<Partial<INovel>> = [
  {
    title: "The Shadow of Eternity",
    slug: "shadow-of-eternity",
    description:
      "ในโลกที่เวลาเบี่ยงเบนตามเจตจำนงของนักเวทย์โบราณ พ่อมดรุ่นใหม่ได้ค้นพบคาถาต้องห้ามที่อาจทำลายเนื้อผ้าแห่งความเป็นจริง",
    coverImage: "https://via.placeholder.com/400x600?text=Shadow+Eternity",
    tags: ["Fantasy", "Adventure", "Magic", "Time"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 15000,
      likes: 4000,
      comments: 200,
      followers: 3200,
      purchases: 1100,
      rating: 4.8,
      ratingCount: 900,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Neon Dreams",
    slug: "neon-dreams",
    description:
      "นักโปรแกรมเมอร์ AI ต้องต่อสู้กับบริษัทยักษ์ใหญ่ในเมืองดิสโทเปียเพื่อเปิดโปงแผนการที่คุกคามเสรีภาพของมนุษยชาติ",
    coverImage: "https://via.placeholder.com/400x600?text=Neon+Dreams",
    tags: ["Sci-Fi", "Cyberpunk", "Thriller", "AI"],
    status: "published",
    isExplicit: true,
    visibility: "public",
    stats: {
      views: 9500,
      likes: 2300,
      comments: 150,
      followers: 2100,
      purchases: 800,
      rating: 4.6,
      ratingCount: 600,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Whispers of the Forest",
    slug: "whispers-of-the-forest",
    description:
      "เด็กหญิงคนหนึ่งค้นพบว่าเธอสามารถสื่อสารกับวิญญาณโบราณในป่าลึกลับ แต่พรสวรรค์ของเธอมาพร้อมกับราคาที่อันตราย",
    coverImage: "https://via.placeholder.com/400x600?text=Whispers+Forest",
    tags: ["Fantasy", "Mystery", "Supernatural", "Coming of Age"],
    status: "completed",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 17000,
      likes: 4500,
      comments: 350,
      followers: 3800,
      purchases: 1900,
      rating: 4.9,
      ratingCount: 1000,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Starborn Legacy",
    slug: "starborn-legacy",
    description:
      "สงครามดวงดาวบังคับให้วีรบุรุษผู้ไม่เต็มใจต้องใช้อาวุธจักรวาลที่อาจช่วยหรือทำลายกาแล็กซี่",
    coverImage: "https://via.placeholder.com/400x600?text=Starborn+Legacy",
    tags: ["Sci-Fi", "Space Opera", "Action", "War"],
    status: "onHiatus",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 8000,
      likes: 1900,
      comments: 130,
      followers: 1600,
      purchases: 650,
      rating: 4.3,
      ratingCount: 420,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Crimson Skies",
    slug: "crimson-skies",
    description:
      "ในโลกที่ปกครองโดยเรือเหาะและอาณาจักรลอยฟ้า นักบินผู้เสื่อมเสียชื่อเสียงมองหาการไถ่บาปด้วยการเปิดโปงการสมคบคิดบนท้องฟ้า",
    coverImage: "https://via.placeholder.com/400x600?text=Crimson+Skies",
    tags: ["Steampunk", "Adventure", "Fantasy", "Sky"],
    status: "discount",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 10000,
      likes: 2600,
      comments: 170,
      followers: 2200,
      purchases: 900,
      rating: 4.6,
      ratingCount: 650,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Echoes of the Deep",
    slug: "echoes-of-the-deep",
    description:
      "ใต้ผิวน้ำมหาสมุทรซ่อนอารยธรรมโบราณที่คอยปกป้องความลับที่อาจเปลี่ยนโลก จนกระทั่งนักดำน้ำลึกบังเอิญค้นพบมัน",
    coverImage: "https://via.placeholder.com/400x600?text=Echoes+Deep",
    tags: ["Mystery", "Ocean", "Sci-Fi", "Adventure"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 7200,
      likes: 1700,
      comments: 100,
      followers: 1500,
      purchases: 550,
      rating: 4.4,
      ratingCount: 400,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Moonlight Requiem",
    slug: "moonlight-requiem",
    description:
      "นักไวโอลินที่ถูกสาปเดินเร่ร่อนในเมืองใต้แสงจันทร์ บรรเลงทำนองที่ปลุกความทรงจำของวิญญาณที่สูญหาย — และบางครั้งก็ปลุกสิ่งที่มืดมนยิ่งกว่า",
    coverImage: "https://via.placeholder.com/400x600?text=Moonlight+Requiem",
    tags: ["Fantasy", "Horror", "Music", "Dark"],
    status: "published",
    isExplicit: true,
    visibility: "public",
    stats: {
      views: 11000,
      likes: 2900,
      comments: 220,
      followers: 2500,
      purchases: 1000,
      rating: 4.7,
      ratingCount: 700,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Digital Prophet",
    slug: "digital-prophet",
    description:
      "ในอนาคตที่อัลกอริทึมทำนายทุกความเคลื่อนไหว นักคณิตศาสตร์นอกกฎหมายเขียนสูตรที่สามารถท้าทายชะตากรรมได้",
    coverImage: "https://via.placeholder.com/400x600?text=Digital+Prophet",
    tags: ["Sci-Fi", "Techno-thriller", "Philosophy", "Future"],
    status: "discount",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 8700,
      likes: 2100,
      comments: 160,
      followers: 1900,
      purchases: 750,
      rating: 4.5,
      ratingCount: 500,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Ashes of the Phoenix",
    slug: "ashes-of-the-phoenix",
    description:
      "หลังการล่มสลายของจักรวรรดิยิ่งใหญ่ นักรบผู้โดดเดี่ยวลุกขึ้นจากซากปรักหักพังเพื่อจุดประกายการปฏิวัติ — นำทางด้วยภาพนิมิตของนกไฟลุกโชน",
    coverImage: "https://via.placeholder.com/400x600?text=Ashes+Phoenix",
    tags: ["Action", "Fantasy", "Rebellion", "Empire"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 13000,
      likes: 3400,
      comments: 250,
      followers: 2900,
      purchases: 1200,
      rating: 4.7,
      ratingCount: 800,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    title: "The Librarian's Code",
    slug: "librarians-code",
    description:
      "ซ่อนอยู่ในห้องสมุดโบราณคือรหัสที่เชื่อมโยงทุกเรื่องราวที่เคยถูกเขียนขึ้น — และบรรณารักษ์ที่สาบานว่าจะปกป้องมัน",
    coverImage: "https://via.placeholder.com/400x600?text=Librarians+Code",
    tags: ["Mystery", "Fantasy", "Library", "Secret"],
    status: "completed",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 10500,
      likes: 2500,
      comments: 190,
      followers: 2200,
      purchases: 850,
      rating: 4.6,
      ratingCount: 600,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Chrono Alchemist",
    slug: "chrono-alchemist",
    description:
      "นักเล่นแร่แปรธาตุค้นพบวิธีควบคุมเวลา แต่ทุกการเปลี่ยนแปลงในอดีตต้องแลกมาด้วยการเสียสละในปัจจุบัน",
    coverImage: "https://via.placeholder.com/400x600?text=Chrono+Alchemist",
    tags: ["Fantasy", "Time Travel", "Alchemy", "Adventure"],
    status: "discount",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 8200,
      likes: 2000,
      comments: 150,
      followers: 1800,
      purchases: 700,
      rating: 4.4,
      ratingCount: 460,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Silent Frequency",
    slug: "silent-frequency",
    description:
      "วิศวกรวิทยุได้รับสัญญาณลึกลับที่เปิดเผยภัยพิบัติในอนาคต — และตอนนี้เขาต้องหยุดมันก่อนที่โลกจะรับฟัง",
    coverImage: "https://via.placeholder.com/400x600?text=Silent+Frequency",
    tags: ["Sci-Fi", "Thriller", "Mystery", "Radio"],
    status: "completed",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 14000,
      likes: 3700,
      comments: 280,
      followers: 3100,
      purchases: 1450,
      rating: 4.8,
      ratingCount: 850,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Garden of Glass",
    slug: "garden-of-glass",
    description:
      "ในเมืองที่ดอกไม้ถูกห้าม นักพฤกษศาสตร์หนุ่มสร้างเรือนกระจกลับ — และค้นพบชีวิตที่ต่อสู้กลับ",
    coverImage: "https://via.placeholder.com/400x600?text=Garden+Glass",
    tags: ["Dystopia", "Nature", "Drama", "Rebellion"],
    status: "completed",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 13500,
      likes: 3400,
      comments: 260,
      followers: 3000,
      purchases: 1300,
      rating: 4.7,
      ratingCount: 800,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Quantum Harmony",
    slug: "quantum-harmony",
    description:
      "นักดนตรีและนักฟิสิกส์ร่วมมือกันเพื่อค้นพบความถี่เสียงที่สามารถเชื่อมต่อกับมิติขนาน แต่เมื่อบทเพลงดังขึ้น บางสิ่งจากอีกด้านก็เริ่มตอบกลับมา",
    coverImage: "https://via.placeholder.com/400x600?text=Quantum+Harmony",
    tags: ["Sci-Fi", "Music", "Multiverse", "Collaboration"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 9000,
      likes: 2200,
      comments: 170,
      followers: 2000,
      purchases: 750,
      rating: 4.5,
      ratingCount: 520,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Midnight Cartographer",
    slug: "midnight-cartographer",
    description:
      "นักทำแผนที่สาวพบว่าแผนที่ของเธอเปลี่ยนแปลงทุกคืนเที่ยงคืน เผยให้เห็นเมืองซ่อนเร้นและเส้นทางลับที่นำไปสู่อาณาจักรที่ถูกลืม",
    coverImage: "https://via.placeholder.com/400x600?text=Midnight+Cartographer",
    tags: ["Fantasy", "Adventure", "Maps", "Hidden World"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 10200,
      likes: 2600,
      comments: 195,
      followers: 2250,
      purchases: 930,
      rating: 4.6,
      ratingCount: 650,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    lastEpisodeAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    title: "Urban Spirits",
    slug: "urban-spirits",
    description:
      "ในกรุงเทพมหานครยุคดิจิทัล ยังมีวิญญาณเก่าแก่สิงสถิตอยู่ตามตึกระฟ้าและซอยเล็กซอยน้อย เมื่อสาวออฟฟิศค้นพบว่าเธอสามารถมองเห็นพวกมันได้ ชีวิตของเธอก็เปลี่ยนไปตลอดกาล",
    coverImage: "https://via.placeholder.com/400x600?text=Urban+Spirits",
    tags: ["Urban Fantasy", "Thai", "Supernatural", "Modern"],
    status: "published",
    isExplicit: false,
    visibility: "public",
    stats: {
      views: 16000,
      likes: 4100,
      comments: 310,
      followers: 3500,
      purchases: 1500,
      rating: 4.9,
      ratingCount: 900,
    },
    settings: {
      allowComments: true,
      monetization: true,
      showStatistics: true,
    },
    releaseSchedule: {
      frequency: "weekly",
      nextRelease: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    lastEpisodeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

/**
 * เตรียมข้อมูลหมวดหมู่
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
          order: 0
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
 * ตรวจสอบหรือสร้างผู้ใช้สำหรับเป็นผู้เขียนนิยาย
 */
async function ensureAuthorExists() {
  try {
    const User = UserModel();
    
    // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
    let author = await User.findOne({ username: "novelAuthor" });
    
    if (!author) {
      console.log("🌱 สร้างบัญชีผู้ใช้สำหรับเป็นผู้เขียนนิยาย...");
      
      author = await User.create({
        username: "novelAuthor",
        email: "author@example.com",
        password: "password123", // ในสภาพแวดล้อมจริงควรใช้รหัสผ่านที่ซับซ้อนกว่านี้
        role: "Writer",
        profile: {
          displayName: "นักเขียนนิยาย",
          bio: "ผู้เขียนนิยายหลากหลายแนว รักการเล่าเรื่องและสร้างโลกจินตนาการ",
        },
        isEmailVerified: true,
        isActive: true,
      });
      
      console.log("✅ สร้างบัญชีผู้ใช้สำเร็จ");
    } else {
      console.log("ℹ️ มีบัญชีผู้ใช้อยู่แล้ว");
    }
    
    return author._id;
  } catch (error: any) {
    console.error("❌ เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้:", error.message);
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

    // เตรียมข้อมูลหมวดหมู่
    const categories = await seedCategories();
    
    // ตรวจสอบหรือสร้างผู้ใช้
    const authorId = await ensureAuthorExists();
    
    // ดึง Novel model
    const Novel = new NovelModel();
    
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
        isDeleted: false,
      };
      
      // ตรวจสอบว่ามีนิยายที่มีชื่อนี้อยู่แล้วหรือไม่
      const existingNovel = await Novel.findOne({ title: novelData.title });
      
      if (existingNovel) {
        // อัปเดตนิยายที่มีอยู่
        await Novel.updateOne(
          { _id: existingNovel._id },
          { $set: preparedNovel }
        );
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
    process.exit(0);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลนิยาย:", error.message);
    } else {
      console.error("❌ เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    }
    process.exit(1);
  }
}

// เริ่มการทำงาน
seedNovels();