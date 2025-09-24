// scripts/seed-whisper-999-final.js
// Final working version using CommonJS with dynamic imports

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dbConnect = require('../src/backend/lib/mongodb-script');

require('dotenv').config();

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

// Dynamic imports for ES modules
let NovelModel, EpisodeModel, SceneModel, CharacterModel, ChoiceModel, UserModel, CategoryModel, StoryMapModel;
let CategoryType, StoryMapNodeType, StoryVariableDataType;

const loadModels = async () => {
  try {
    const novelModule = await import('../src/backend/models/Novel.js');
    NovelModel = novelModule.default;
    
    const episodeModule = await import('../src/backend/models/Episode.js');
    EpisodeModel = episodeModule.default;
    
    const sceneModule = await import('../src/backend/models/Scene.js');
    SceneModel = sceneModule.default;
    
    const characterModule = await import('../src/backend/models/Character.js');
    CharacterModel = characterModule.default;
    
    const choiceModule = await import('../src/backend/models/Choice.js');
    ChoiceModel = choiceModule.default;
    
    const userModule = await import('../src/backend/models/User.js');
    UserModel = userModule.default;
    
    const categoryModule = await import('../src/backend/models/Category.js');
    CategoryModel = categoryModule.default;
    CategoryType = categoryModule.CategoryType;
    
    const storyMapModule = await import('../src/backend/models/StoryMap.js');
    StoryMapModel = storyMapModule.default;
    StoryMapNodeType = storyMapModule.StoryMapNodeType;
    StoryVariableDataType = storyMapModule.StoryVariableDataType;
    
    console.log('✅ โหลด Models เสร็จสิ้น');
  } catch (error) {
    console.error('❌ ไม่สามารถโหลด Models:', error.message);
    throw error;
  }
};

const findOrCreateCategory = async (name, type, slug) => {
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

const findOrCreateAuthor = async () => {
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
  } else {
    console.log(`- ใช้ผู้แต่งที่มีอยู่: ${author.username}`);
  }
  return author._id;
};

const createCharacters = async (novelId, authorId) => {
  console.log('👥 กำลังสร้างตัวละคร...');
  
  const characters = [
    {
      novelId,
      authorId,
      characterCode: 'nira',
      name: 'นิรา',
      fullName: 'นิรา วรรณวิจิตร',
      description: 'หญิงสาวที่เพิ่งย้ายเข้ามาในบ้านหลังใหม่ที่เต็มไปด้วยความลับและความน่าสะพรึงกลัว',
      age: '25',
      gender: 'female',
      roleInStory: 'main_protagonist',
      colorTheme: '#A78BFA',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'scared', name: 'หวาดกลัว', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'curious', name: 'สงสัย', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
      ],
      defaultExpressionId: 'normal',
      isArchived: false,
    },
    {
      novelId,
      authorId,
      characterCode: 'agent',
      name: 'นายหน้า',
      fullName: 'นายหน้าอสังหาริมทรัพย์',
      description: 'นายหน้าที่ดูมีลับลมคมใน ผู้ขายบ้านให้กับนิรา',
      age: '45',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#71717A',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
      ],
      defaultExpressionId: 'normal',
      isArchived: false,
    }
  ];

  const savedCharacters = [];
  for (const char of characters) {
    const character = new CharacterModel(char);
    await character.save();
    savedCharacters.push(character);
    console.log(`- สร้างตัวละคร: ${character.name}`);
  }

  console.log(`✅ สร้างตัวละครเสร็จสิ้น: ${savedCharacters.length} ตัว`);
  return savedCharacters;
};

const createChoices = async (novelId, authorId) => {
  console.log('🎯 กำลังสร้างตัวเลือก...');
  
  const choices = [
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_EXPLORE',
      text: 'เดินสำรวจบ้านชั้นล่างทันที',
      actions: [{
        actionId: uuidv4(),
        type: 'GO_TO_NODE',
        parameters: { targetNodeId: 'scene_explore_downstairs_1' }
      }],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CLEAN',
      text: 'ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน',
      actions: [
        {
          actionId: uuidv4(),
          type: 'END_NOVEL_BRANCH',
          parameters: {
            endingNodeId: 'ENDING_SAFE_DAY1',
            outcomeDescription: 'คุณเลือกที่จะใช้ชีวิตอย่างปกติสุขต่อไป และไม่มีอะไรผิดปกติเกิดขึ้นในวันแรก... อย่างน้อยก็ในตอนนี้',
            endingTitle: 'วันแรกที่แสนสงบ',
            endingType: 'NORMAL'
          }
        }
      ],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CALL',
      text: 'โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่',
      actions: [
        {
          actionId: uuidv4(),
          type: 'END_NOVEL_BRANCH',
          parameters: {
            endingNodeId: 'ENDING_SAFE_DAY1_SHARED',
            outcomeDescription: 'คุณเล่าเรื่องบ้านใหม่ให้เพื่อนฟัง และใช้เวลาที่เหลือของวันไปกับการจัดของอย่างสบายใจ',
            endingTitle: 'เริ่มต้นอย่างอุ่นใจ',
            endingType: 'NORMAL'
          }
        }
      ],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_NOW',
      text: 'กดฟังเทปทันที',
      actions: [{
        actionId: uuidv4(),
        type: 'GO_TO_NODE',
        parameters: { targetNodeId: 'scene_listen_tape_1' }
      }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_LATER',
      text: 'รอให้ถึงตีสาม แล้วฟังตามที่เขียน',
      actions: [
        {
          actionId: uuidv4(),
          type: 'END_NOVEL_BRANCH',
          parameters: {
            endingNodeId: 'ENDING_CLIFFHANGER_3AM',
            outcomeDescription: 'คุณตัดสินใจที่จะทำตามคำท้าทายบนเทป... คืนนี้อะไรจะเกิดขึ้นกันแน่? (โปรดติดตามตอนต่อไป)',
            endingTitle: 'คำท้าทายตอนตีสาม',
            endingType: 'NORMAL'
          }
        }
      ],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_BURN_TAPE',
      text: 'เผาเทปทิ้งทันที',
      actions: [
        {
          actionId: 'action_end_burn',
          type: 'END_NOVEL_BRANCH',
          parameters: {
            endingNodeId: 'ENDING_DESTROY_EVIDENCE',
            outcomeDescription: 'คุณตัดสินใจทำลายเทปปริศนาทิ้ง บางทีการไม่รู้ อาจจะเป็นสิ่งที่ดีที่สุดแล้ว คุณพยายามจะลืมเรื่องราวแปลกๆ และใช้ชีวิตต่อไป',
            endingTitle: 'ทำลายหลักฐาน',
            endingType: 'BAD'
          }
        }
      ],
      isMajorChoice: false,
      isArchived: false,
    }
  ];

  const savedChoices = [];
  for (const choice of choices) {
    const choiceDoc = new ChoiceModel(choice);
    await choiceDoc.save();
    savedChoices.push(choiceDoc);
    console.log(`- สร้างตัวเลือก: ${choice.choiceCode}`);
  }

  console.log(`✅ สร้างตัวเลือกเสร็จสิ้น: ${savedChoices.length} ตัวเลือก`);
  return savedChoices;
};

const createScenes = async (novelId, episodeId, characters, choices) => {
  console.log('🎬 กำลังสร้างฉากทั้งหมด...');
  
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {});

  const choiceMap = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {});

  const scenes = [
    // === SCENE 1: การมาถึง ===
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene_arrival',
      title: 'การมาถึง',
      background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'none', durationSeconds: 0 },
      textContents: [
        {
          instanceId: 'narration_1',
          type: 'narration',
          content: 'เสียงล้อกระเป๋าเดินทางบดไปบนพื้นซีเมนต์หน้าบ้านเลขที่ 9 — บ้านเก่าทรงโคโลเนียลสองชั้น หลังคางุ้มด้วยเถาวัลย์ที่เริ่มแห้งเฉา ข้างในมืดสนิทแม้จะเป็นเวลาเย็น เพราะไม่มีใครอยู่มานานหลายปี',
        }
      ],
    },
    // === SCENE 2: รับกุญแจ ===
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
    // === SCENE 3: ความคิดของนิรา ===
    {
      novelId,
      episodeId,
      sceneOrder: 3,
      nodeId: 'scene_nira_thoughts',
      title: 'ความคิดของนิรา',
      background: { type: 'image', value: '/images/background/ChurchCourtyardA_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 },
      characters: [
        { instanceId: 'nira_char_thinking', characterId: characterMap.nira, expressionId: 'curious', transform: { positionX: 0 }, isVisible: true },
      ],
      textContents: [
        {
          instanceId: 'dialogue_nira_internal',
          type: 'dialogue',
          characterId: characterMap.nira,
          speakerDisplayName: 'นิรา (คิดในใจ)',
          content: '"บ้านนี้ราคาถูกจนน่าตกใจ แต่สวยดี" นิราพึมพำกับตัวเอง',
        },
      ],
    },
    // === SCENE 4: การตัดสินใจแรก ===
    {
      novelId,
      episodeId,
      sceneOrder: 4,
      nodeId: 'scene_first_choice',
      title: 'การตัดสินใจแรก',
      background: { type: 'image', value: '/images/background/BG39.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 },
      textContents: [
        {
          instanceId: 'choice_prompt',
          type: 'narration',
          content: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?',
        },
      ],
      choiceIds: [choiceMap.CHOICE_EXPLORE, choiceMap.CHOICE_CLEAN, choiceMap.CHOICE_CALL]
    },
    // === ENDING SCENE: TRUE ENDING ===
    {
      novelId,
      episodeId,
      sceneOrder: 5,
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
  for (const scene of scenes) {
    const sceneDoc = new SceneModel(scene);
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
    console.log(`- สร้างฉาก: ${scene.title} (Order: ${scene.sceneOrder})`);
  }

  // อัปเดต defaultNextSceneId สำหรับการเชื่อมต่อฉาก
  const sceneNodeIdMap = savedScenes.reduce((acc, scene) => {
    if (scene.nodeId) {
      acc[scene.nodeId] = scene._id.toString();
    }
    return acc;
  }, {});

  const sceneUpdates = [
    { from: 'scene_arrival', to: 'scene_key_exchange' },
    { from: 'scene_key_exchange', to: 'scene_nira_thoughts' },
    { from: 'scene_nira_thoughts', to: 'scene_first_choice' }
  ];

  // อัปเดต defaultNextSceneId
  for (const update of sceneUpdates) {
    const fromSceneId = sceneNodeIdMap[update.from];
    const toSceneId = sceneNodeIdMap[update.to];

    if (fromSceneId && toSceneId) {
      await SceneModel.findByIdAndUpdate(fromSceneId, {
        defaultNextSceneId: new mongoose.Types.ObjectId(toSceneId)
      });
    }
  }

  console.log(`✅ สร้างฉากเสร็จสิ้น: ${savedScenes.length} ฉาง`);
  return savedScenes;
};

const createWhisper999Novel = async (authorId) => {
  console.log('📖 กำลังสร้างนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');

  // สร้างหมวดหมู่ที่จำเป็น
  console.log('🔍 กำลังสร้างหมวดหมู่...');
  const langCatId = await findOrCreateCategory('ภาษาไทย', CategoryType.LANGUAGE, 'th');
  const themeCatId = await findOrCreateCategory('สยองขวัญ', CategoryType.GENRE, 'horror');
  const subThemeCatId1 = await findOrCreateCategory('จิตวิทยา', CategoryType.SUB_GENRE, 'psychological');
  const ageRatingCatId = await findOrCreateCategory('18+', CategoryType.AGE_RATING, '18-plus');

  console.log('✅ หมวดหมู่พร้อมใช้งาน');

  const novel = new NovelModel({
    title: 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999',
    slug: 'whisper-from-apartment-999',
    author: authorId,
    synopsis: 'เมื่อนิราย้ายเข้าบ้านใหม่ราคาถูก เธอก็ได้พบกับข่าวลือแปลกๆ และความมืดที่รอคอยอยู่ข้างใน การตัดสินใจแรกของเธอจะเป็นตัวกำหนดชะตากรรม',
    longDescription: 'นิยายสยองขวัญจิตวิทยาที่จะพาคุณดำดิ่งไปกับบรรยากาศอันน่าขนลุกของบ้านร้างและความลับที่ซ่อนอยู่ ทุกการเลือกของคุณอาจหมายถึงความเป็นหรือความตาย',
    coverImageUrl: '/images/thriller/thriller1.jpg',
    bannerImageUrl: '/images/background/badend1.png',
    themeAssignment: {
      mainTheme: {
        categoryId: themeCatId,
        customName: 'สยองขวัญ'
      },
      subThemes: [
        { categoryId: subThemeCatId1, customName: 'จิตวิทยา' }
      ],
      moodAndTone: [],
      contentWarnings: [],
      customTags: ['สยองขวัญ', 'จิตวิทยา', 'ปริศนา', 'บ้านผีสิง', 'ยอดนิยม', 'แนะนำ']
    },
    ageRatingCategoryId: ageRatingCatId,
    language: langCatId,
    status: 'PUBLISHED',
    accessLevel: 'PUBLIC',
    isCompleted: false,
    endingType: 'MULTIPLE_ENDINGS',
    sourceType: {
      type: 'INTERACTIVE_FICTION'
    },
    totalEpisodesCount: 1,
    publishedEpisodesCount: 1,
    isFeatured: true,
    publishedAt: new Date(),
    lastContentUpdatedAt: new Date(),
    stats: {
      viewsCount: 852345,
      uniqueViewersCount: 55678,
      likesCount: 14876,
      commentsCount: 1045,
      discussionThreadCount: 142,
      ratingsCount: 1055,
      averageRating: 4.85,
      followersCount: 1234,
      sharesCount: 567,
      bookmarksCount: 2345,
      totalWords: 15000,
      estimatedReadingTimeMinutes: 75,
      completionRate: 0,
      purchasesCount: 0,
      lastPublishedEpisodeAt: new Date(),
      currentReaders: 0,
      peakConcurrentReaders: 0,
      trendingStats: {
        viewsLast24h: 15876,
        likesLast24h: 1210,
        commentsLast24h: 155,
        trendingScore: 9999,
        lastTrendingScoreUpdate: new Date(),
      },
    },
    monetizationSettings: {
      isCoinBasedUnlock: true,
      defaultEpisodePriceCoins: 10,
      allowDonations: true,
      isAdSupported: false,
      isPremiumExclusive: false,
      activePromotion: {
        isActive: true,
        promotionalPriceCoins: 5,
        promotionStartDate: new Date(),
        promotionEndDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        promotionDescription: "ลดราคาพิเศษสำหรับนิยายใหม่!",
      },
    },
    psychologicalAnalysisConfig: {
      allowsPsychologicalAnalysis: false,
      sensitiveChoiceCategoriesBlocked: []
    },
    collaborationSettings: {
      allowCoAuthorRequests: false,
      pendingCoAuthors: []
    },
  });

  await novel.save();
  console.log(`✅ สร้างนิยายเสร็จสิ้น: ${novel.title} (ID: ${novel._id})`);

  // สร้างตัวละคร
  const characters = await createCharacters(novel._id, authorId);
  
  // สร้างตัวเลือก
  const choices = await createChoices(novel._id, authorId);

  // สร้าง Episode 1
  console.log('📖 กำลังสร้าง Episode 1...');
  const episode1 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'บทที่ 1: ย้ายเข้า',
    slug: 'chapter-1-moving-in',
    episodeOrder: 1,
    status: 'PUBLISHED',
    accessType: 'PAID_UNLOCK',
    priceCoins: 10,
    teaserText: 'การมาถึงบ้านหลังใหม่ที่ดูเหมือนจะสมบูรณ์แบบ... ยกเว้นก็แต่ข่าวลือและราคาที่ถูกจนน่าสงสัย',
    publishedAt: new Date(),
    isPreviewAllowed: true,
    stats: {
      viewsCount: 45231,
      uniqueViewersCount: 12456,
      likesCount: 3456,
      commentsCount: 234,
      totalWords: 8500,
      estimatedReadingTimeMinutes: 35,
      purchasesCount: 1876,
    }
  });

  await episode1.save();
  console.log(`✅ สร้าง Episode 1 เสร็จสิ้น: ${episode1.title} (ID: ${episode1._id})`);

  // สร้างฉากสำหรับ Episode 1
  const scenes = await createScenes(novel._id, episode1._id, characters, choices);

  // อัปเดต Episode 1 ด้วย sceneIds และ firstSceneId
  await EpisodeModel.findByIdAndUpdate(episode1._id, {
    firstSceneId: scenes[0]?._id,
    sceneIds: scenes.map(s => s._id)
  });

  // อัปเดต Novel ด้วย firstEpisodeId
  await NovelModel.findByIdAndUpdate(novel._id, {
    firstEpisodeId: episode1._id
  });

  console.log('✅ เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999 ถูกสร้างเสร็จสิ้นแล้ว!');

  return {
    novel,
    episode: episode1,
    characters,
    choices,
    scenes
  };
};

const seedWhisper999Final = async () => {
  try {
    console.log('🌱 เริ่มต้น seed ข้อมูล "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" (เวอร์ชันสุดท้าย)...');
    
    // โหลด Models ก่อน
    await loadModels();
    
    await dbConnect();

    // ค้นหาหรือสร้างผู้แต่ง
    const authorId = await findOrCreateAuthor();

    // ตรวจสอบว่ามีนิยายนี้อยู่แล้วหรือไม่
    const existingNovel = await NovelModel.findOne({ 
      slug: 'whisper-from-apartment-999' 
    });

    if (existingNovel) {
      console.log('⚠️ นิยายนี้มีอยู่ในระบบแล้ว กำลังข้ามการสร้าง...');
      console.log(`📖 นิยายที่มีอยู่: ${existingNovel.title} (ID: ${existingNovel._id})`);
      return;
    }

    // สร้างนิยายใหม่
    const result = await createWhisper999Novel(authorId);

    console.log('\n🎉 สรุปผลการ seed:');
    console.log(`📖 นิยาย: ${result.novel.title}`);
    console.log(`📚 Episode: ${result.episode.title}`);
    console.log(`👥 ตัวละคร: ${result.characters.length} ตัว`);
    console.log(`🎯 ตัวเลือก: ${result.choices.length} ตัวเลือก`);
    console.log(`🎬 ฉาก: ${result.scenes.length} ฉาง`);
    console.log('\n✅ seed ข้อมูลเสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed ข้อมูล:', error);
    throw error;
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
    }
  }
};

// เรียกใช้ฟังก์ชัน seed หากไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
  seedWhisper999Final();
}

module.exports = { seedWhisper999Final };
