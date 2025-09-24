// scripts/seed-whisper-999-extended.ts
// เวอร์ชันขยายที่รวม ending scenes และ story map - TypeScript version

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '../src/backend/lib/mongodb.js';

// Import Models - ใช้ ES6 imports สำหรับ TypeScript
import NovelModel from '../src/backend/models/Novel';
import EpisodeModel from '../src/backend/models/Episode';
import SceneModel from '../src/backend/models/Scene';
import CharacterModel from '../src/backend/models/Character';
import ChoiceModel from '../src/backend/models/Choice';
import UserModel from '../src/backend/models/User';
import CategoryModel, { CategoryType } from '../src/backend/models/Category';
import StoryMapModel, { StoryMapNodeType, StoryVariableDataType } from '../src/backend/models/StoryMap';

import { config } from 'dotenv';
config();

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

// ใช้ฟังก์ชันเดียวกันจากไฟล์หลัก
const findOrCreateCategory = async (name: string, type: CategoryType, slug: string): Promise<mongoose.Types.ObjectId> => {
  let category = await CategoryModel.findOne({ slug, categoryType: type });
  if (!category) {
    category = await CategoryModel.findOne({ name, categoryType: type });
  }
  if (!category) {
    console.log(`- สร้างหมวดหมู่ใหม่: "${name}" (ประเภท: ${type})`);
    category = new CategoryModel({
      name,
      slug,
      categoryType: type,
      description: `หมวดหมู่สำหรับ ${name}`,
      visibility: 'PUBLIC',
      isSystemDefined: true,
      isActive: true,
    });
    await category.save();
  }
  return category._id;
};

const findOrCreateAuthor = async (): Promise<mongoose.Types.ObjectId> => {
  console.log('👤 กำลังค้นหาหรือสร้างผู้แต่ง...');
  let author = await UserModel.findOne({ username: AUTHOR_USERNAME });
  if (!author) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    author = new UserModel({
      username: AUTHOR_USERNAME,
      email: `${AUTHOR_USERNAME}@example.com`,
      password: hashedPassword,
      accounts: [{
        provider: 'credentials',
        providerAccountId: AUTHOR_USERNAME,
        type: 'credentials'
      }],
      roles: ['Writer'],
      primaryPenName: 'นักเขียนลึกลับ',
      avatarUrl: '/images/default-avatar.png',
      isEmailVerified: true,
      isActive: true,
      isBanned: false,
      isDeleted: false
    });
    await author.save();
    console.log(`✅ สร้างผู้แต่งเสร็จสิ้น: ${author.username}`);
  }
  return author._id;
};

/**
 * สร้างตัวเลือกทั้งหมดรวมถึงตัวเลือกสำหรับ ending scenes
 */
const createAllChoices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  console.log('🎯 กำลังสร้างตัวเลือกทั้งหมด...');
  
  const choices = [
    // ตัวเลือกหลัก
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_EXPLORE',
      text: 'เดินสำรวจบ้านชั้นล่างทันที',
      actions: [{ actionId: uuidv4(), type: 'GO_TO_NODE', parameters: { targetNodeId: 'scene_explore_downstairs_1' } }],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CLEAN',
      text: 'ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน',
      actions: [{
        actionId: uuidv4(),
        type: 'END_NOVEL_BRANCH',
        parameters: {
          endingNodeId: 'ENDING_SAFE_DAY1',
          outcomeDescription: 'คุณเลือกที่จะใช้ชีวิตอย่างปกติสุขต่อไป และไม่มีอะไรผิดปกติเกิดขึ้นในวันแรก... อย่างน้อยก็ในตอนนี้',
          endingTitle: 'วันแรกที่แสนสงบ',
          endingType: 'NORMAL'
        }
      }],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CALL',
      text: 'โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่',
      actions: [{
        actionId: uuidv4(),
        type: 'END_NOVEL_BRANCH',
        parameters: {
          endingNodeId: 'ENDING_SAFE_DAY1_SHARED',
          outcomeDescription: 'คุณเล่าเรื่องบ้านใหม่ให้เพื่อนฟัง และใช้เวลาที่เหลือของวันไปกับการจัดของอย่างสบายใจ',
          endingTitle: 'เริ่มต้นอย่างอุ่นใจ',
          endingType: 'NORMAL'
        }
      }],
      isMajorChoice: true,
      isArchived: false,
    },
    // ตัวเลือกเทป
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_NOW',
      text: 'กดฟังเทปทันที',
      actions: [{ actionId: uuidv4(), type: 'GO_TO_NODE', parameters: { targetNodeId: 'scene_listen_tape_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_LATER',
      text: 'รอให้ถึงตีสาม แล้วฟังตามที่เขียน',
      actions: [{
        actionId: uuidv4(),
        type: 'END_NOVEL_BRANCH',
        parameters: {
          endingNodeId: 'ENDING_CLIFFHANGER_3AM',
          outcomeDescription: 'คุณตัดสินใจที่จะทำตามคำท้าทายบนเทป... คืนนี้อะไรจะเกิดขึ้นกันแน่? (โปรดติดตามตอนต่อไป)',
          endingTitle: 'คำท้าทายตอนตีสาม',
          endingType: 'NORMAL'
        }
      }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_BURN_TAPE',
      text: 'เผาเทปทิ้งทันที',
      actions: [{
        actionId: 'action_end_burn',
        type: 'END_NOVEL_BRANCH',
        parameters: {
          endingNodeId: 'ENDING_DESTROY_EVIDENCE',
          outcomeDescription: 'คุณตัดสินใจทำลายเทปปริศนาทิ้ง บางทีการไม่รู้ อาจจะเป็นสิ่งที่ดีที่สุดแล้ว',
          endingTitle: 'ทำลายหลักฐาน',
          endingType: 'BAD'
        }
      }],
      isMajorChoice: false,
      isArchived: false,
    },
    // ตัวเลือกประตูลับ
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_OPEN_SECRET_DOOR',
      text: 'เปิดประตูลับและลงไปทันที',
      actions: [{ actionId: uuidv4(), type: 'GO_TO_NODE', parameters: { targetNodeId: 'scene_enter_basement_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_TAKE_PHOTO',
      text: 'ถ่ายรูปส่งให้เพื่อนก่อนเปิด',
      actions: [{ actionId: uuidv4(), type: 'GO_TO_NODE', parameters: { targetNodeId: 'scene_send_photo_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LOCK_DOOR',
      text: 'ปิดมันไว้แล้วล็อกด้วยตู้เย็นทับ',
      actions: [{ actionId: uuidv4(), type: 'GO_TO_NODE', parameters: { targetNodeId: 'scene_lock_door_1' } }],
      isMajorChoice: false,
      isArchived: false,
    }
  ];

  const savedChoices = [];
  for (const choice of choices) {
    const choiceDoc = new ChoiceModel(choice);
    await choiceDoc.save();
    savedChoices.push(choiceDoc);
  }

  console.log(`✅ สร้างตัวเลือกเสร็จสิ้น: ${savedChoices.length} ตัวเลือก`);
  return savedChoices;
};

/**
 * สร้างฉากทั้งหมดรวมถึง ending scenes
 */
const createAllScenes = async (
  novelId: mongoose.Types.ObjectId, 
  episodeId: mongoose.Types.ObjectId, 
  characters: any[], 
  choices: any[]
) => {
  console.log('🎬 กำลังสร้างฉากทั้งหมดรวมถึง ending scenes...');
  
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  const choiceMap = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  // ฉากทั้งหมดรวมถึง ending scenes
  const allScenes = [
    // ฉากหลัก
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene_arrival',
      title: 'การมาถึง',
      background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      textContents: [{
        instanceId: 'narration_1',
        type: 'narration',
        content: 'เสียงล้อกระเป๋าเดินทางบดไปบนพื้นซีเมนต์หน้าบ้านเลขที่ 9 — บ้านเก่าทรงโคโลเนียลสองชั้น หลังคางุ้มด้วยเถาวัลย์ที่เริ่มแห้งเฉา ข้างในมืดสนิทแม้จะเป็นเวลาเย็น เพราะไม่มีใครอยู่มานานหลายปี',
      }],
    },
    {
      novelId,
      episodeId,
      sceneOrder: 2,
      nodeId: 'scene_key_exchange',
      title: 'รับกุญแจ',
      background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 },
      characters: [
        { instanceId: 'agent_char', characterId: characterMap.agent, expressionId: 'normal', transform: { positionX: 100 }, isVisible: true },
        { instanceId: 'nira_char', characterId: characterMap.nira, expressionId: 'normal', transform: { positionX: -100 }, isVisible: true },
      ],
      textContents: [
        {
          instanceId: 'dialogue_agent',
          type: 'dialogue',
          characterId: characterMap.agent,
          speakerDisplayName: 'นายหน้า',
          content: '"ยินดีต้อนรับ คุณนิรา" — เสียงของนายหน้าอสังหาริมทรัพย์กล่าว พร้อมยื่นกุญแจบ้านให้',
        },
      ],
    },
    // === ENDING SCENES ===
    // TRUE ENDING: รอยยิ้มสุดท้าย
    {
      novelId,
      episodeId,
      sceneOrder: 28,
      nodeId: 'scene_true_ending',
      title: 'รอยยิ้มสุดท้าย',
      background: { type: 'image', value: '/images/background/main.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'fade', durationSeconds: 1.2 },
      textContents: [
        {
          instanceId: 'narration_no_basement',
          type: 'narration',
          content: 'เจ้าหน้าที่ดับเพลิงพบว่า ใต้บ้านไม่มีทางเดิน ไม่มีห้องใต้ดิน ไม่มีอุโมงค์ใด ๆ ทั้งสิ้น "มันแค่ดินตัน ๆ… ไม่มีช่องเลยครับ"'
        },
        {
          instanceId: 'narration_camera_reveal',
          type: 'narration',
          content: 'แต่…ในภาพจากกล้องเพื่อนช่าง ก่อนระเบิดจะลง 3 วินาที มีเด็กหญิงตัวเล็ก ๆ เดินขึ้นจากช่องพื้น หันหน้ามา… แล้วยิ้มให้กล้อง…'
        }
      ],
      ending: {
        endingType: 'TRUE',
        title: 'รอยยิ้มสุดท้าย',
        description: 'การทำลายสถานที่ได้ปลดปล่อยวิญญาณเด็กสาว และรอยยิ้มสุดท้ายของเธอคือการขอบคุณที่ช่วยให้เธอเป็นอิสระจากคำสาปนี้',
        endingId: 'true_ending',
        imageUrl: '/images/background/main.png'
      }
    }
  ];

  const savedScenes = [];
  for (const scene of allScenes) {
    const sceneDoc = new SceneModel(scene);
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
  }

  console.log(`✅ สร้างฉากทั้งหมดเสร็จสิ้น: ${savedScenes.length} ฉาง`);
  return savedScenes;
};

/**
 * สร้าง Story Map สำหรับนิยาย
 */
const createStoryMap = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId, choices: any[]) => {
  console.log('📊 กำลังสร้าง Story Map...');

  const choiceCodeToId = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  // กำหนดตัวแปรเรื่องราว
  const storyVariables = [
    {
      variableId: uuidv4(),
      variableName: 'karma',
      dataType: StoryVariableDataType.NUMBER,
      initialValue: 0,
      description: 'ค่ากรรมของตัวละครหลัก',
      allowedValues: [-100, 100],
      isGlobal: true,
      isVisibleToPlayer: false
    },
    {
      variableId: uuidv4(),
      variableName: 'has_explored_basement',
      dataType: StoryVariableDataType.BOOLEAN,
      initialValue: false,
      description: 'ตัวแปรเช็คว่าผู้เล่นเข้าไปในห้องใต้ดินแล้วหรือยัง',
      isGlobal: true,
      isVisibleToPlayer: false
    }
  ];

  // สร้าง node mapping
  const nodeIdMapping: Record<string, string> = {
    'start_whisper999': uuidv4(),
    'scene_arrival': uuidv4(),
    'choice_first_decision': uuidv4(),
    'ending_safe_day1': uuidv4(),
    'ending_true': uuidv4()
  };

  // กำหนด nodes
  const nodes = [
    {
      nodeId: nodeIdMapping['start_whisper999'],
      nodeType: StoryMapNodeType.START_NODE,
      title: 'จุดเริ่มต้น',
      position: { x: 100, y: 300 },
      nodeSpecificData: {},
      editorVisuals: {
        color: '#10B981',
        orientation: 'horizontal',
        borderRadius: 12,
        gradient: { from: '#10B981', to: '#059669', direction: 'horizontal' }
      },
      layoutConfig: { mode: 'auto', tier: 0, order: 0 }
    },
    {
      nodeId: nodeIdMapping['scene_arrival'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'การมาถึง',
      position: { x: 400, y: 300 },
      nodeSpecificData: { sceneId: 'scene_arrival' },
      editorVisuals: { color: '#3B82F6', orientation: 'horizontal', showThumbnail: true, borderRadius: 8 },
      layoutConfig: { mode: 'auto', tier: 1, order: 0 }
    }
  ];

  // กำหนด edges
  const edges = [
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['start_whisper999'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_arrival'],
      targetHandlePosition: 'left',
      label: 'เริ่มเรื่อง',
      editorVisuals: {
        color: '#10B981',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 3,
        markerEnd: 'arrowclosed'
      }
    }
  ];

  const storyMap = new StoryMapModel({
    novelId,
    title: `แผนผังเรื่อง - เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999`,
    version: 1,
    description: 'แผนผังเรื่องราวของนิยายสยองขวัญจิตวิทยาที่เต็มไปด้วยทางเลือกและการตัดสินใจ',
    nodes,
    edges,
    storyVariables,
    startNodeId: nodeIdMapping['start_whisper999'],
    lastModifiedByUserId: authorId,
    isActive: true,
    editorMetadata: {
      zoomLevel: 0.8,
      viewOffsetX: -50,
      viewOffsetY: -100,
      gridSize: 20,
      showGrid: true,
      showSceneThumbnails: true,
      showNodeLabels: true,
      autoLayoutAlgorithm: 'custom',
      layoutPreferences: {
        defaultOrientation: 'horizontal',
        nodeSpacing: { x: 300, y: 200 },
        tierSpacing: 300,
        autoAlign: true,
        preserveManualPositions: false,
        flowDirection: 'left-right'
      }
    }
  });

  const savedStoryMap = await storyMap.save();
  console.log(`✅ สร้าง Story Map เสร็จสิ้น: ${savedStoryMap._id}`);
  
  return savedStoryMap;
};

/**
 * ฟังก์ชันหลักสำหรับ seed ข้อมูลแบบขยาย
 */
const seedWhisper999Extended = async () => {
  try {
    console.log('🌱 เริ่มต้น seed ข้อมูล "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" (เวอร์ชันขยาย)...');
    
    await dbConnect();

    const authorId = await findOrCreateAuthor();

    // ตรวจสอบว่ามีนิยายอยู่แล้วหรือไม่
    const existingNovel = await NovelModel.findOne({ slug: 'whisper-from-apartment-999' });
    if (existingNovel) {
      console.log('⚠️ นิยายนี้มีอยู่ในระบบแล้ว');
      return;
    }

    // สร้างหมวดหมู่
    const langCatId = await findOrCreateCategory('ภาษาไทย', CategoryType.LANGUAGE, 'th');
    const themeCatId = await findOrCreateCategory('สยองขวัญ', CategoryType.GENRE, 'horror');
    const subThemeCatId1 = await findOrCreateCategory('จิตวิทยา', CategoryType.SUB_GENRE, 'psychological');
    const ageRatingCatId = await findOrCreateCategory('18+', CategoryType.AGE_RATING, '18-plus');

    // สร้างนิยาย
    const novel = new NovelModel({
      title: 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999',
      slug: 'whisper-from-apartment-999',
      author: authorId,
      synopsis: 'เมื่อนิราย้ายเข้าบ้านใหม่ราคาถูก เธอก็ได้พบกับข่าวลือแปลกๆ และความมืดที่รอคอยอยู่ข้างใน',
      longDescription: 'นิยายสยองขวัญจิตวิทยาที่จะพาคุณดำดิ่งไปกับบรรยากาศอันน่าขนลุกของบ้านร้างและความลับที่ซ่อนอยู่',
      coverImageUrl: '/images/thriller/thriller1.jpg',
      themeAssignment: {
        mainTheme: { categoryId: themeCatId, customName: 'สยองขวัญ' },
        subThemes: [{ categoryId: subThemeCatId1, customName: 'จิตวิทยา' }],
        customTags: ['สยองขวัญ', 'จิตวิทยา', 'ปริศนา', 'บ้านผีสิง']
      },
      ageRatingCategoryId: ageRatingCatId,
      language: langCatId,
      status: 'PUBLISHED',
      accessLevel: 'PUBLIC',
      isCompleted: false,
      endingType: 'MULTIPLE_ENDINGS',
      totalEpisodesCount: 1,
      publishedEpisodesCount: 1,
      stats: {
        viewsCount: 852345,
        likesCount: 14876,
        averageRating: 4.85,
        followersCount: 1234
      }
    });

    await novel.save();

    // สร้างตัวละคร
    const characters = [
      {
        novelId: novel._id,
        authorId,
        characterCode: 'nira',
        name: 'นิรา',
        description: 'หญิงสาวที่เพิ่งย้ายเข้ามาในบ้านหลังใหม่',
        roleInStory: 'main_protagonist',
        colorTheme: '#A78BFA'
      }
    ];

    const savedCharacters = [];
    for (const char of characters) {
      const character = new CharacterModel(char);
      await character.save();
      savedCharacters.push(character);
    }

    // สร้างตัวเลือกและฉาก
    const choices = await createAllChoices(novel._id, authorId);
    
    // สร้าง Episode
    const episode1 = new EpisodeModel({
      novelId: novel._id,
      authorId,
      title: 'บทที่ 1: ย้ายเข้า',
      slug: 'chapter-1-moving-in',
      episodeOrder: 1,
      status: 'PUBLISHED',
      accessType: 'PAID_UNLOCK',
      priceCoins: 10
    });
    await episode1.save();

    // สร้างฉากทั้งหมด
    const scenes = await createAllScenes(novel._id, episode1._id, savedCharacters, choices);

    // สร้าง Story Map
    const storyMap = await createStoryMap(novel._id, authorId, choices);

    // อัปเดตข้อมูล
    await EpisodeModel.findByIdAndUpdate(episode1._id, {
      firstSceneId: scenes[0]?._id,
      sceneIds: scenes.map(s => s._id)
    });

    await NovelModel.findByIdAndUpdate(novel._id, {
      firstEpisodeId: episode1._id
    });

    console.log('\n🎉 สรุปผลการ seed (เวอร์ชันขยาย):');
    console.log(`📖 นิยาย: ${novel.title}`);
    console.log(`👥 ตัวละคร: ${savedCharacters.length} ตัว`);
    console.log(`🎯 ตัวเลือก: ${choices.length} ตัวเลือก`);
    console.log(`🎬 ฉาก: ${scenes.length} ฉาง (รวม ending scenes)`);
    console.log(`📊 Story Map: ${storyMap._id}`);
    console.log('\n✅ seed ข้อมูลเวอร์ชันขยายเสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed ข้อมูล:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
    }
  }
};

// เรียกใช้ฟังก์ชันหากไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
  seedWhisper999Extended();
}

export { seedWhisper999Extended };
