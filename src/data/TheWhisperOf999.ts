import mongoose from 'mongoose';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelContentType, NovelEndingType } from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import SceneModel, { TextContentType, ISceneEnding } from '@/backend/models/Scene';
import CharacterModel, { CharacterRoleInStory, CharacterGenderIdentity } from '@/backend/models/Character';
import ChoiceModel, { ChoiceActionType } from '@/backend/models/Choice';
import UserModel, { IUser } from '@/backend/models/User';
import UserProfileModel, { IUserProfile } from '@/backend/models/UserProfile';
import CategoryModel, { CategoryType } from '@/backend/models/Category';
import StoryMapModel, {
  StoryMapNodeType,
  IStoryMapNode,
  IStoryMapEdge,
  IStoryVariableDefinition,
  StoryVariableDataType
} from '@/backend/models/StoryMap';
import { v4 as uuidv4 } from 'uuid';
import redis from '@/backend/lib/redis';
import dbConnect from '@/backend/lib/mongodb';

config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

/**
 * ฟังก์ชันค้นหาหรือสร้างหมวดหมู่ใหม่ และคืนค่า ObjectId
 * @param name - ชื่อหมวดหมู่
 * @param type - ประเภทหมวดหมู่ตาม CategoryType enum
 * @param slug - slug สำหรับ URL
 * @returns ObjectId ของหมวดหมู่
 */
const findOrCreateCategory = async (name: string, type: CategoryType, slug: string): Promise<mongoose.Types.ObjectId> => {
  // ค้นหาหมวดหมู่ที่มีอยู่แล้วด้วย slug และ type
  let category = await CategoryModel.findOne({ slug, categoryType: type });

  // หากไม่พบ ให้ลองค้นหาด้วยชื่อและประเภท
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
  } else {
    console.log(`- ใช้หมวดหมู่ที่มีอยู่: "${category.name}" (ประเภท: ${category.categoryType}, ID: ${category._id})`);
  }
  return category._id;
};




const createWhisper999Characters = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
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
  }

  return savedCharacters;
};

const createWhisper999Choices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  const choices = [
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_EXPLORE',
      text: 'เดินสำรวจบ้านชั้นล่างทันที',
      actions: [{
        actionId: uuidv4(),
        type: ChoiceActionType.GO_TO_NODE,
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
          type: ChoiceActionType.END_NOVEL_BRANCH,
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
          type: ChoiceActionType.END_NOVEL_BRANCH,
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
        type: ChoiceActionType.GO_TO_NODE,
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
          type: ChoiceActionType.END_NOVEL_BRANCH,
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
          type: ChoiceActionType.END_NOVEL_BRANCH,
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
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_OPEN_SECRET_DOOR',
      text: 'เปิดประตูลับและลงไปทันที',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_enter_basement_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_TAKE_PHOTO',
      text: 'ถ่ายรูปส่งให้เพื่อนก่อนเปิด',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_send_photo_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LOCK_DOOR',
      text: 'ปิดมันไว้แล้วล็อกด้วยตู้เย็นทับ',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_lock_door_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_REINFORCE_DOOR',
      text: '🪚 เสริมโครงไม้ทับตู้เย็นอีกชั้น',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_reinforce_door_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_SETUP_CAMERA',
      text: '📷 ตั้งกล้องวงจรปิดไว้หน้าตู้เย็น แล้วออกไปนอนข้างนอกสักคืน',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_setup_camera_1' } }],
      isMajorChoice: false,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_DESTROY_DOOR',
      text: '🧨 หาวัสดุระเบิดฝังตรงนั้นแล้วเผาทำลายให้หมด',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_destroy_door_1' } }],
      isMajorChoice: false,
    }
  ];

  const savedChoices = [];
  for (const choice of choices) {
    const choiceDoc = new ChoiceModel(choice);
    await choiceDoc.save();
    savedChoices.push(choiceDoc);
  }

  return savedChoices;
};

/**
 * สร้าง scenes สำหรับ Episode 1 ของนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"
 * @param novelId - ID ของนิยาย
 * @param episodeId - ID ของ episode
 * @param characters - Array ของ characters ที่ถูกสร้างแล้ว
 * @param choices - Array ของ choices ที่ถูกสร้างแล้ว
 * @returns Array ของ Scene documents ที่สร้างเสร็จแล้ว
 */
const createWhisper999Scenes = async (
  novelId: mongoose.Types.ObjectId,
  episodeId: mongoose.Types.ObjectId,
  characters: any[],
  choices: any[]
) => {
  // สร้าง mapping สำหรับ characters และ choices เพื่อความสะดวกในการอ้างอิง
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  const choiceMap = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  // กำหนด scenes ทั้งหมดสำหรับ Episode 1
  // แต่ละ scene มี sceneOrder ที่เรียงลำดับตามการเล่น
  // 🎭 MULTIPLE ENDINGS: แต่ละ ending scene จะแสดง ending screen ทันทีเมื่อ VisualNovelContent ตรวจพบ ending field
  // Ending scenes ที่มี ending field:
  // - Scene 16: BAD ENDING 1 - เสียงสุดท้าย
  // - Scene 19: BAD ENDING 2 - เสียงที่ถูกเลือก  
  // - Scene 24: BAD ENDING 3 - มืออีกข้าง
  // - Scene 26: BAD ENDING 4 - ถึงตาเธอ
  // - Scene 28: TRUE ENDING - รอยยิ้มสุดท้าย
  // - Scene 29: NORMAL ENDING - จบบทที่ 1
  const scenes = [
    // === SCENE 1: การมาถึง ===
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene_arrival',
      // storyMapNodeId จะถูกอัปเดตหลังสร้าง StoryMap
      title: 'การมาถึง',
      background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกันกับ scene ถัดไป
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
        // storyMapNodeId จะถูกอัปเดตหลังสร้าง StoryMap
        title: 'รับกุญแจ',
        background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 }, // เปลี่ยนไป ChurchCourtyardA_Sunset
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
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 }, // เปลี่ยนกลับไป ChurchCorridor_Sunset
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
      // === SCENE 4: คำเตือน ===
      {
        novelId,
        episodeId,
        sceneOrder: 4,
        nodeId: 'scene_agent_warning',
        title: 'คำเตือน',
        background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป BG39.png
        characters: [
            { instanceId: 'agent_char_leaving', characterId: characterMap.agent, expressionId: 'normal', transform: { positionX: 100, opacity: 0.5 }, isVisible: true },
        ],
        textContents: [
          {
            instanceId: 'dialogue_agent_whisper',
            type: 'narration',
            content: '"เพราะมีข่าวลือ…" นายหน้ากระซิบเบาๆ แล้วรีบหันหลังจากไป',
          },
        ],
      },
      // === SCENE 5: เข้าบ้าน ===
      {
        novelId,
        episodeId,
        sceneOrder: 5,
        nodeId: 'scene_enter_house',
        title: 'เข้าบ้าน',
        background: { type: 'image', value: '/images/background/BG39.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกันกับ scene ถัดไป
        textContents: [
          {
            instanceId: 'narration_enter',
            type: 'narration',
            content: 'คุณเดินเข้าบ้านพร้อมกระเป๋าเพียงหนึ่งใบ แสงแดดสุดท้ายลอดผ่านหน้าต่างที่เต็มไปด้วยฝุ่น ก่อนจะดับวูบ...',
          },
        ],
      },
      // === SCENE 6: การตัดสินใจแรก ===
      {
        novelId,
        episodeId,
        sceneOrder: 6,
        nodeId: 'scene_first_choice',
        title: 'การตัดสินใจแรก',
        background: { type: 'image', value: '/images/background/BG39.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 }, // เปลี่ยนไป BG43.png
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_EXPLORE, choiceMap.CHOICE_CLEAN, choiceMap.CHOICE_CALL]
      },
      // === SCENE 7: สำรวจชั้นล่าง (จาก choice explore) ===
      {
        novelId,
        episodeId,
        sceneOrder: 7,
        nodeId: 'scene_explore_downstairs_1',
        title: 'สำรวจชั้นล่าง',
        background: { type: 'image', value: '/images/background/BG43.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.6 }, // เปลี่ยนไป home.png
        textContents: [
          {
            instanceId: 'narration_explore_1',
            type: 'narration',
            content: 'เธอเปิดไฟและเดินสำรวจรอบบ้าน พบว่าห้องทุกห้องดูเก่าแต่ไม่มีร่องรอยการอยู่',
          },
        ],
      },
      // === SCENE 8: กล่องไม้เก่า ===
      {
        novelId,
        episodeId,
        sceneOrder: 8,
        nodeId: 'scene_found_box',
        title: 'กล่องไม้เก่า',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
          {
            instanceId: 'narration_found_box',
            type: 'narration',
            content: 'ขณะเดินผ่านห้องใต้บันได เธอสังเกตเห็น "กล่องไม้เก่า" มีตราประทับปี 1974',
          },
        ],
      },
      // === SCENE 9: เทปลึกลับ ===
      {
        novelId,
        episodeId,
        sceneOrder: 9,
        nodeId: 'scene_found_tape',
        title: 'เทปลึกลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
          {
            instanceId: 'narration_found_tape',
            type: 'narration',
            content: 'ข้างในมีเครื่องเล่นเทปพกพาและคาสเซ็ตที่เขียนด้วยลายมือว่า "เสียงสุดท้ายของฉัน - ห้ามฟังตอนตีสาม"',
          },
        ],
      },
      // === SCENE 10: การตัดสินใจกับเทป ===
      {
        novelId,
        episodeId,
        sceneOrder: 10,
        nodeId: 'scene_tape_choice',
        title: 'การตัดสินใจกับเทป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไร?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_LISTEN_NOW, choiceMap.CHOICE_LISTEN_LATER, choiceMap.CHOICE_BURN_TAPE]
      },
      // === SCENE 11: เสียงจากเทป ===
      {
        novelId,
        episodeId,
        sceneOrder: 11,
        nodeId: 'scene_listen_tape_1',
        title: 'เสียงจากเทป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
            {
                instanceId: 'narration_tape_sound',
                type: 'narration',
                content: 'เสียงแทรกซ่าก่อนจะค่อยๆ ชัดขึ้น…'
            },
            {
                instanceId: 'narration_tape_voice',
                type: 'narration',
                content: `"ฉันเห็นผู้ชายไม่มีหน้าในกระจก…เขาบอกให้ฉัน 'ตามหาเสียงกระซิบในห้องใต้ดิน'…แต่บ้านนี้ไม่มีห้องใต้ดิน…"`
            }
        ]
      },
      // === SCENE 12: ประตูลับ ===
      {
        novelId,
        episodeId,
        sceneOrder: 12,
        nodeId: 'scene_secret_door',
        title: 'ประตูลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
            {
                instanceId: 'narration_nira_shock',
                type: 'narration',
                content: 'นิราตกใจ ปิดเทป'
            },
            {
                instanceId: 'narration_found_door',
                type: 'narration',
                content: 'วันรุ่งขึ้น เธอสังเกตเห็นพรมในครัวนูนขึ้นเล็กน้อย เมื่อเปิดออกมา พบ "ประตูลับ"'
            }
        ]
      },
      // === SCENE 13: การตัดสินใจกับประตูลับ ===
      {
        novelId,
        episodeId,
        sceneOrder: 13,
        nodeId: 'scene_secret_door_choice',
        title: 'การตัดสินใจกับประตูลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป badend1.png
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไร?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_OPEN_SECRET_DOOR, choiceMap.CHOICE_TAKE_PHOTO, choiceMap.CHOICE_LOCK_DOOR]
      },
      // === SCENE 14: ห้องใต้ดิน ===
      {
        novelId,
        episodeId,
        sceneOrder: 14,
        nodeId: 'scene_enter_basement_1',
        title: 'ห้องใต้ดิน',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
            {
                instanceId: 'narration_basement_whisper',
                type: 'narration',
                content: 'เสียงกระซิบดังขึ้นทันทีที่เปิดประตู… "ดีใจที่เธอมาจนถึงตรงนี้…"'
            }
        ]
      },
      // === SCENE 15: เผชิญหน้า ===
      {
        novelId,
        episodeId,
        sceneOrder: 15,
        nodeId: 'scene_basement_encounter',
        title: 'เผชิญหน้า',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน (ending scene)
        textContents: [
            {
                instanceId: 'narration_basement_details',
                type: 'narration',
                content: 'ข้างล่างเป็นห้องใต้ดินเก่ามืดสนิท มีผนังที่ขูดด้วยเล็บนับพันเส้น ตรงกลางห้อง มีผู้ชายไม่มีหน้า…ยื่นกล่องไม้กลับมาให้เธอ…'
            }
        ]
      },
      // === SCENE 16: BAD ENDING 1 - เสียงสุดท้าย ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 1 - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 16,
        nodeId: 'scene_bad_ending_1',
        title: 'เสียงสุดท้าย',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.0 }, // Ending scene สำหรับ dramatic effect
        textContents: [
            {
                instanceId: 'narration_final_words',
                type: 'narration',
                content: '"ต่อไป…เสียงสุดท้ายจะเป็นของเธอ"'
            },
            {
                instanceId: 'narration_ending_desc',
                type: 'narration',
                content: 'นิราหายไป อีกสองเดือนต่อมา กล่องไม้และเทปอันเดิมกลับไปวางอยู่ที่เดิม พร้อมเทปล่าสุดว่า "เสียงของนิรา"'
            }
        ],
        ending: {
          endingType: 'BAD',
          title: 'เสียงสุดท้าย',
          description: 'นิรากลายเป็นเสียงในเทปอันต่อไป หลังจากเผชิญหน้ากับสิ่งลี้ลับในห้องใต้ดิน',
          endingId: 'bad_ending_1',
          imageUrl: '/images/background/badend1.png'
        }
      },
      // === SCENE 17: คำเตือนจากเพื่อน (จาก choice take photo) ===
      {
        novelId,
        episodeId,
        sceneOrder: 17,
        nodeId: 'scene_send_photo_1',
        title: 'คำเตือนจากเพื่อน',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
            {
                instanceId: 'narration_friend_warning',
                type: 'narration',
                content: 'มิน เพื่อนสนิท รีบบอกให้เธอ "อย่าเปิดเด็ดขาด!"'
            },
            {
                instanceId: 'narration_kitchen_door_opens',
                type: 'narration',
                content: 'นิรากำลังจะปิดฝากลับไป… แต่ประตูห้องครัวก็ เปิดเอง…'
            }
        ]
      },
      // === SCENE 18: ประตูบานอื่น ===
      {
        novelId,
        episodeId,
        sceneOrder: 18,
        nodeId: 'scene_other_doors',
        title: 'ประตูบานอื่น',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป badend1.png
        textContents: [
            {
                instanceId: 'narration_whisper_choice',
                type: 'narration',
                content: 'เสียงกระซิบดังขึ้น: "ถ้าไม่เปิดประตูนั้น ประตูอื่นจะเปิดแทน…"'
            },
            {
                instanceId: 'narration_chaos',
                type: 'narration',
                content: 'ทันใดนั้น…หน้าต่างทุกบานเปิดพรึ่บ ไฟดับทั้งหลัง…'
            }
        ]
      },
      // === SCENE 19: BAD ENDING 2 - เสียงที่ถูกเลือก ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 2 - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 19,
        nodeId: 'scene_bad_ending_2',
        title: 'เสียงที่ถูกเลือก',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.0 }, // Ending scene สำหรับ dramatic effect
        textContents: [
            {
                instanceId: 'narration_disappearance',
                type: 'narration',
                content: 'นิราหายไปกลางสายตาของมินผ่านวิดีโอคอล กล้องดับพร้อมเสียงกระซิบว่า "เสียงของเธอ…ถูกเลือกแล้ว"'
            }
        ],
        ending: {
          endingType: 'BAD',
          title: 'เสียงที่ถูกเลือก',
          description: 'นิราหายตัวไปอย่างลึกลับระหว่างวิดีโอคอลกับเพื่อน หลังจากเพิกเฉยต่อคำเตือน',
          endingId: 'bad_ending_2',
          imageUrl: '/images/background/badend1.png'
        }
      },
      // === SCENE 20: ผนึกประตู (จาก choice lock door) ===
      {
        novelId,
        episodeId,
        sceneOrder: 20,
        nodeId: 'scene_lock_door_1',
        title: 'ผนึกประตู',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
          { instanceId: 'narration_shaking', type: 'narration', content: 'นิราตัวสั่น มือไม้เย็นเฉียบ สิ่งที่เธอเพิ่งเห็นใต้ประตูลับ — เงาคล้ายร่างเด็กผอมสูงที่เคลื่อนไหวเร็วผิดธรรมชาติ — มันยังคงลอยอยู่ในดวงตาเธอ' },
          { instanceId: 'narration_slam_door', type: 'narration', content: 'เธอ กระแทก ฝาปิดบันไดใต้พื้นด้วยแรงทั้งหมดที่มี เสียง "ปึง!" ดังขึ้น และตามด้วยเสียงกระแทกเบา ๆ …จาก "ข้างใต้"' },
          { instanceId: 'narration_climbing', type: 'narration', content: 'กึก… กึก… ตึง… เหมือนบางอย่างกำลังปีนขึ้นมา' },
          { instanceId: 'narration_move_fridge', type: 'narration', content: 'นิรารีบลากตู้เย็นขนาดใหญ่ไปทับไว้ทันที ต้องใช้แรงมากกว่าที่เคยใช้มาในชีวิต กล้ามเนื้อสั่นระริกเมื่อเธอลากขอบมันผ่านพื้นไม้เก่าเสียงครูด ๆ อย่างน่าขนลุก' },
          { instanceId: 'narration_lock_fridge', type: 'narration', content: 'ในที่สุด… ตู้เย็นก็ขวางไว้ตรงกลางพอดี เธอรีบเอาโซ่ที่เคยใช้รัดประตูคลังอาหาร มารัดไว้กับหูเหล็กของตู้เย็น และตรึงกับตะขอบนพื้น ล็อกไว้แล้ว' },
          { instanceId: 'narration_hope', type: 'narration', content: 'สิ่งที่อยู่ข้างล่าง…จะไม่มีวันขึ้นมาอีก หรืออย่างน้อย…เธอก็หวังเช่นนั้น' },
        ]
      },
      // === SCENE 21: เฝ้าระวัง ===
      {
        novelId,
        episodeId,
        sceneOrder: 21,
        nodeId: 'scene_vigil',
        title: 'เฝ้าระวัง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน
        textContents: [
            { instanceId: 'narration_vigil', type: 'narration', content: 'คืนนั้น เธอนั่งเฝ้าตู้เย็นทั้งคืน โดยถือมีดครัวไว้ในมือ เสียงเคาะยังคงมีเป็นระยะ…' },
            { instanceId: 'narration_knocking', type: 'narration', content: 'ไม่แรง…แต่สม่ำเสมอ เหมือน "มันรู้" ว่าเธอยังนั่งฟังอยู่ เหมือนการย้ำเตือนว่า "ฉันยังอยู่ตรงนี้"' },
        ]
      },
      // === SCENE 22: ทางเลือกต่อไป ===
      {
        novelId,
        episodeId,
        sceneOrder: 22,
        nodeId: 'scene_lock_door_choice',
        title: 'ทางเลือกต่อไป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'none', durationSeconds: 0 }, // Background เดียวกัน (มี 3 choices ที่ใช้ background เดียวกัน)
        choiceIds: [choiceMap.CHOICE_REINFORCE_DOOR, choiceMap.CHOICE_SETUP_CAMERA, choiceMap.CHOICE_DESTROY_DOOR]
      },
      // === SCENE 23: เสริมความแข็งแกร่ง ===
      {
        novelId,
        episodeId,
        sceneOrder: 23,
        nodeId: 'scene_reinforce_door_1',
        title: 'เสริมความแข็งแกร่ง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป badend1.png
        textContents: [
          { instanceId: 'narration_reinforce', type: 'narration', content: 'นิราใช้เวลาทั้งเช้า เลื่อยไม้จากลังเก่า ตอกโครงเหล็กกับผนังสองด้านของห้องครัว เธอเอาไม้หนา ๆ ทับบนตู้เย็น ตอกตะปูแน่นทุกมุม จนกลายเป็น "หลุมฝังศพ" ที่ไม่มีวจะเปิดอีก' },
          { instanceId: 'narration_whisper_plug', type: 'narration', content: 'เสียงเคาะเงียบลงในคืนที่สาม แต่สิ่งที่ดังแทนคือ… เสียง "กระซิบจากปลั๊กไฟ" เมื่อเธอเอาหูแนบผนัง กลับได้ยินเสียงเด็กพูดคำว่า… "เธอฝังฉัน… แต่ฉันฝันถึงเธอทุกคืน…"' },
        ]
      },
      // === SCENE 24: BAD ENDING 3 - มืออีกข้าง ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 3 - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 24,
        nodeId: 'scene_bad_ending_3',
        title: 'มืออีกข้าง',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.0 }, // Ending scene สำหรับ dramatic effect
        textContents: [
          { instanceId: 'narration_sleepwalk', type: 'narration', content: 'นิราเริ่มละเมอ เธอลุกขึ้นกลางดึก เดินมาที่ห้องครัว และ… แกะตะปูออกทีละตัว… ทั้งที่หลับตาอยู่' },
          { instanceId: 'narration_other_hand', type: 'narration', content: 'กล้องวงจรปิดที่เธอลืมไว้ในมุมห้องจับภาพได้ชัดเจน ว่า "มือที่เปิดไม้แผ่นสุดท้าย" ไม่ใช่มือเธอคนเดียว… มี "อีกมือ" ที่ผิวซีดขาว…จับตะปูอีกด้าน พร้อมกัน' },
        ],
        ending: {
          endingType: 'BAD',
          title: 'มืออีกข้าง',
          description: 'การเพิกเฉยไม่ได้ช่วยอะไร สิ่งลี้ลับได้เข้ามาอยู่ในตัวเธอเรียบร้อยแล้ว',
          endingId: 'bad_ending_3',
          imageUrl: '/images/background/badend1.png'
        }
      },
      // === SCENE 25: ติดตั้งกล้อง ===
      {
        novelId,
        episodeId,
        sceneOrder: 25,
        nodeId: 'scene_setup_camera_1',
        title: 'ติดตั้งกล้อง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป badend1.png
        textContents: [
          { instanceId: 'narration_setup_camera', type: 'narration', content: 'นิราซื้อกล้องวงจรปิดแบบมีอินฟราเรดมาติดไว้ หันตรงไปยังตู้เย็นกับพื้น เธอออกไปนอนโรงแรมเล็ก ๆ ในตัวเมือง พร้อมโน้ตบุ๊กเพื่อดูฟุตเทจแบบเรียลไทม์' },
          { instanceId: 'narration_camera_shake', type: 'narration', content: 'ตีสองสิบห้า — จู่ ๆ กล้องเริ่มสั่น ในภาพปรากฏ "ร่างดำซีดสูงเกินคน" ปีนออกจากช่องแคบ ๆ ใต้ตู้เย็น แม้ตู้เย็นไม่ขยับเลยสักนิด' },
          { instanceId: 'narration_faceless', type: 'narration', content: 'มัน ทะลุผ่าน อย่างไร้แรงต้าน มันยืนนิ่ง…แล้ว "หันหน้ามาทางกล้องโดยตรง" ใบหน้าขาวซีดไม่มีลูกตา แต่กลับมี "ปาก" อยู่ตรงกลางหน้าผาก ปากนั้น… ยิ้ม' },
        ]
      },
      // === SCENE 26: BAD ENDING 4 - ถึงตาเธอ ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 4 - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 26,
        nodeId: 'scene_bad_ending_4',
        title: 'ถึงตาเธอ',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.0 }, // Ending scene สำหรับ dramatic effect
        textContents: [
          { instanceId: 'narration_camera_destroyed', type: 'narration', content: 'นิรากลับบ้านในวันรุ่งขึ้น กล้องถูกบิดหักพังลง หน้าประตูบ้านมีโน้ตเขียนด้วยลายมือเด็ก: "ออกไปได้แล้ว… ถึงตาเธอลงมาหาฉันบ้าง"' },
        ],
        ending: {
          endingType: 'BAD',
          title: 'ถึงตาเธอ',
          description: 'การพยายามสังเกตการณ์จากระยะไกลไม่ได้ผล สิ่งลี้ลับสามารถเข้าถึงตัวนิราได้อยู่ดี',
          endingId: 'bad_ending_4',
          imageUrl: '/images/background/badend1.png'
        }
      },
      // === SCENE 27: ทำลายล้าง ===
      {
        novelId,
        episodeId,
        sceneOrder: 27,
        nodeId: 'scene_destroy_door_1',
        title: 'ทำลายล้าง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 0.8 }, // เปลี่ยนไป badend1.png
        textContents: [
          { instanceId: 'narration_destroy_plan', type: 'narration', content: 'นิราตัดสินใจว่า จะไม่ทนอีกต่อไป เธอรู้จักเพื่อนเก่าที่เป็นช่างโยธา เขาช่วยเอาวัตถุระเบิดแรงต่ำมาฝังไว้ใต้พื้นห้อง เธอเตือนเพื่อนว่า "อย่ามองเข้าไปข้างในเด็ดขาด"' },
          { instanceId: 'narration_explosion', type: 'narration', content: 'เวลา 05:03 น. นิรากดสวิตช์จุดระเบิดในระยะไกล ตูม! เสียงดังสะท้อนทั่วหมู่บ้าน ไฟไหม้ลุกลามเฉพาะ "บริเวณห้องครัว"' },
          { instanceId: 'narration_shadow', type: 'narration', content: 'เธอเห็นเงาดำ ๆ พุ่งขึ้นไปในเปลวเพลิง เหมือนกำลังดิ้น…และ "หัวเราะ"' },
        ]
      },
      // === SCENE 28: TRUE ENDING - รอยยิ้มสุดท้าย ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 5 (TRUE ENDING) - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 28,
        nodeId: 'scene_bad_ending_5',
        title: 'รอยยิ้มสุดท้าย',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.2 }, // TRUE ending ดราม่าสุด
        textContents: [
          { instanceId: 'narration_no_basement', type: 'narration', content: 'เจ้าหน้าที่ดับเพลิงพบว่า ใต้บ้านไม่มีทางเดิน ไม่มีห้องใต้ดิน ไม่มีอุโมงค์ใด ๆ ทั้งสิ้น "มันแค่ดินตัน ๆ… ไม่มีช่องเลยครับ"' },
          { instanceId: 'narration_camera_reveal', type: 'narration', content: 'แต่…ในภาพจากกล้องเพื่อนช่าง ก่อนระเบิดจะลง 3 วินาที มีเด็กหญิงตัวเล็ก ๆ เดินขึ้นจากช่องพื้น หันหน้ามา… แล้วยิ้มให้กล้อง…' },
        ],
        ending: {
          endingType: 'TRUE',
          title: 'รอยยิ้มสุดท้าย',
          description: 'การทำลายสถานที่ได้ปลดปล่อยวิญญาณเด็กสาว และรอยยิ้มสุดท้ายของเธอคือการขอบคุณที่ช่วยให้เธอเป็นอิสระจากคำสาปนี้',
          endingId: 'true_ending',
          imageUrl: '/images/background/badend1.png'
        }
      },
      // === SCENE 29: จบบทที่ 1 (สำหรับ multiple endings) ===
      // 🎭 MULTIPLE ENDINGS: ฉากจบที่ 6 (NORMAL ENDING) - แสดง ending screen ทันทีเมื่อถึงฉากนี้
      {
        novelId,
        episodeId,
        sceneOrder: 29,
        nodeId: 'scene_end_of_prologue',
        title: 'จะเกิดอะไรขึ้นต่อไป...',
        background: { type: 'image', value: '/images/background/main.png', isOfficialMedia: true, fitMode: 'cover' },
        sceneTransitionOut: { type: 'fade', durationSeconds: 1.0 }, // Ending scene สำหรับ dramatic effect
        textContents: [
          {
            instanceId: 'ending_message',
            type: 'narration',
            content: 'เรื่องราวในบทแรกจบลงเพียงเท่านี้... การตัดสินใจของคุณจะนำไปสู่อะไร โปรดติดตามตอนต่อไป',
          },
        ],
        ending: {
          endingType: 'NORMAL',
          title: 'จบบทที่ 1',
          description: 'จบตอนแรกของเรื่อง The Whisper of 999 โปรดติดตามตอนต่อไป',
          endingId: 'prologue_end',
          imageUrl: '/images/background/main.png'
        }
      }
    ];

  // สร้าง scenes ทั้งหมดก่อน
  console.log(`🎬 กำลังสร้าง ${scenes.length} scenes สำหรับ Episode 1...`);
  const savedScenes = [];
  for (const scene of scenes) {
    const sceneDoc = new SceneModel(scene);
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
  }

  // จากนั้นสร้าง defaultNextSceneId mapping โดยใช้ nodeId เป็นหลัก
  const sceneNodeIdMap = savedScenes.reduce((acc, scene) => {
    if (scene.nodeId) {
      acc[scene.nodeId] = scene._id.toString();
    }
    return acc;
  }, {} as Record<string, string>);

  // อัปเดต defaultNextSceneId สำหรับ scenes ที่ไม่มี choices หรือมีการต่อเนื่องชัดเจน
  // 🎭 สำหรับ Multiple Endings: ending scenes จะไม่มีการเชื่อมต่อไปยังฉากอื่น
  const sceneUpdates = [
    // ฉากแรกไปฉากที่สอง (การรับกุญแจ)
    { from: 'scene_arrival', to: 'scene_key_exchange' },
    // จากรับกุญแจไปความคิดของนิรา
    { from: 'scene_key_exchange', to: 'scene_nira_thoughts' },
    // จากความคิดไปคำเตือน
    { from: 'scene_nira_thoughts', to: 'scene_agent_warning' },
    // จากคำเตือนไปเข้าบ้าน
    { from: 'scene_agent_warning', to: 'scene_enter_house' },
    // จากเข้าบ้านไปตัดสินใจแรก
    { from: 'scene_enter_house', to: 'scene_first_choice' },

    // จาก explore ไปหาของ
    { from: 'scene_explore_downstairs_1', to: 'scene_found_box' },
    { from: 'scene_found_box', to: 'scene_found_tape' },
    { from: 'scene_found_tape', to: 'scene_tape_choice' },

    // จากฟังเทปไปเจอประตูลับ
    { from: 'scene_listen_tape_1', to: 'scene_secret_door' },
    { from: 'scene_secret_door', to: 'scene_secret_door_choice' },

    // จากเปิดประตูลับไปห้องใต้ดิน
    { from: 'scene_enter_basement_1', to: 'scene_basement_encounter' },
    { from: 'scene_basement_encounter', to: 'scene_bad_ending_1' },

    // จากส่งรูปไปประตูอื่น
    { from: 'scene_send_photo_1', to: 'scene_other_doors' },
    { from: 'scene_other_doors', to: 'scene_bad_ending_2' },

    // จากล็อกประตูไปเฝ้าระวัง
    { from: 'scene_lock_door_1', to: 'scene_vigil' },
    { from: 'scene_vigil', to: 'scene_lock_door_choice' },

    // จากเสริมประตูไปจบเลว
    { from: 'scene_reinforce_door_1', to: 'scene_bad_ending_3' },

    // จากติดกล้องไปจบเลว
    { from: 'scene_setup_camera_1', to: 'scene_bad_ending_4' },

    // จากทำลายไปจบจริง
    { from: 'scene_destroy_door_1', to: 'scene_bad_ending_5' },

    // 🎭 MULTIPLE ENDINGS: ending scenes ไม่มีการเชื่อมต่อไปยังฉากอื่น
    // เมื่อถึง ending scene จะแสดง ending screen และหยุดการเล่น
    // ไม่ต้องเพิ่ม defaultNextSceneId สำหรับ ending scenes
  ];

  // อัปเดต defaultNextSceneId
  console.log('🔗 กำลังเชื่อมต่อ scenes...');
  for (const update of sceneUpdates) {
    const fromSceneId = sceneNodeIdMap[update.from];
    const toSceneId = sceneNodeIdMap[update.to];

    if (fromSceneId && toSceneId) {
      await SceneModel.findByIdAndUpdate(fromSceneId, {
        defaultNextSceneId: new mongoose.Types.ObjectId(toSceneId)
      });
    }
  }

  console.log(`✅ สร้าง scenes เสร็จสิ้น: ${savedScenes.length} scenes`);
  return savedScenes;
};

/**
 * สร้าง StoryMap สำหรับนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"
 * @param novelId - ID ของนิยาย
 * @param authorId - ID ของผู้แต่ง
 * @param choices - Array ของ choices ที่ถูกสร้างแล้ว
 * @returns StoryMap document ที่สร้างเสร็จแล้ว
 */
const createWhisper999Episode1StoryMap = async (
  novelId: mongoose.Types.ObjectId, 
  episodeId: mongoose.Types.ObjectId,
  authorId: mongoose.Types.ObjectId, 
  choices: any[]
) => {
  console.log('📊 กำลังสร้าง StoryMap สำหรับ Episode 1 ของ "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');

  // สร้าง choice lookup map สำหรับแปลง choiceCode เป็น ObjectId
  const choiceCodeToId = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  // กำหนดตัวแปรเรื่องราว (Story Variables)
  const storyVariables: IStoryVariableDefinition[] = [
    {
      variableId: uuidv4(), // ใช้ UUID เพื่อความ unique
      variableName: 'karma',
      dataType: StoryVariableDataType.NUMBER,
      initialValue: 0,
      description: 'ค่ากรรมของตัวละครหลัก (เพิ่มเมื่อเลือกดี ลดเมื่อเลือกร้าย)',
      allowedValues: [-100, 100],
      isGlobal: true,
      isVisibleToPlayer: false
    },
    {
      variableId: uuidv4(), // ใช้ UUID เพื่อความ unique
      variableName: 'has_explored_basement',
      dataType: StoryVariableDataType.BOOLEAN,
      initialValue: false,
      description: 'ตัวแปรเช็คว่าผู้เล่นเข้าไปในห้องใต้ดินแล้วหรือยัง',
      isGlobal: true,
      isVisibleToPlayer: false
    },
    {
      variableId: uuidv4(), // ใช้ UUID เพื่อความ unique
      variableName: 'tape_listened',
      dataType: StoryVariableDataType.BOOLEAN,
      initialValue: false,
      description: 'ตัวแปรเช็คว่าผู้เล่นฟังเทปแล้วหรือยัง',
      isGlobal: true,
      isVisibleToPlayer: false
    }
  ];

  // สร้าง mapping สำหรับ nodeId เพื่อให้สามารถอ้างอิงได้
  const nodeIdMapping: Record<string, string> = {
    'start_whisper999': uuidv4(),
    'scene_arrival': uuidv4(),
    'scene_key_exchange': uuidv4(),
    'scene_nira_thoughts': uuidv4(),
    'scene_agent_warning': uuidv4(),
    'scene_enter_house': uuidv4(),
    'choice_first_decision': uuidv4(),
    'scene_explore_downstairs_1': uuidv4(),
    'scene_found_box': uuidv4(),
    'scene_found_tape': uuidv4(),
    'choice_tape_decision': uuidv4(),
    'scene_listen_tape_1': uuidv4(),
    'scene_secret_door': uuidv4(),
    'choice_secret_door_decision': uuidv4(),
    'scene_enter_basement_1': uuidv4(),
    'scene_basement_encounter': uuidv4(),
    'scene_send_photo_1': uuidv4(),
    'scene_other_doors': uuidv4(),
    'scene_lock_door_1': uuidv4(),
    'scene_vigil': uuidv4(),
    'choice_lock_door_decision': uuidv4(),
    'scene_reinforce_door_1': uuidv4(),
    'scene_setup_camera_1': uuidv4(),
    'scene_destroy_door_1': uuidv4(),
    'ending_bad_1': uuidv4(),
    'ending_bad_2': uuidv4(),
    'ending_bad_3': uuidv4(),
    'ending_bad_4': uuidv4(),
    'ending_true': uuidv4(),
    'ending_safe_day1': uuidv4(),
    'ending_cliffhanger_3am': uuidv4(),
    'ending_destroy_evidence': uuidv4()
  };

  // กำหนด tier และ spacing สำหรับการจัดเรียงอัตโนมัติ
  const TIER_SPACING = 300; // ระยะห่างระหว่างชั้น
  const NODE_SPACING = 200; // ระยะห่างระหว่าง node ในแนวเดียวกัน
  const START_X = 100;
  const START_Y = 300; // ตำแหน่งกลาง

  // กำหนด Nodes ของ StoryMap พร้อม layout ที่สวยงาม
  const nodes: IStoryMapNode[] = [
    // === TIER 0: Start Node ===
    {
      nodeId: nodeIdMapping['start_whisper999'],
      nodeType: StoryMapNodeType.START_NODE,
      title: 'จุดเริ่มต้น',
      position: { x: START_X, y: START_Y },
      nodeSpecificData: {},
      notesForAuthor: 'จุดเริ่มต้นของเรื่อง - การมาถึงบ้านใหม่',
      editorVisuals: {
        color: '#10B981', // สีเขียว
        orientation: 'horizontal',
        borderRadius: 12,
        gradient: {
          from: '#10B981',
          to: '#059669',
          direction: 'horizontal'
        }
      },
      layoutConfig: {
        mode: 'auto',
        tier: 0,
        order: 0
      }
    },
    
    // === TIER 1: Scene Chain ===
    {
      nodeId: nodeIdMapping['scene_arrival'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'การมาถึง',
      position: { x: START_X + TIER_SPACING, y: START_Y },
      nodeSpecificData: { sceneId: 'scene_arrival' },
      editorVisuals: {
        color: '#3B82F6', // สีน้ำเงิน
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 1,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['scene_key_exchange'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'รับกุญแจ',
      position: { x: START_X + TIER_SPACING * 2, y: START_Y },
      nodeSpecificData: { sceneId: 'scene_key_exchange' },
      editorVisuals: {
        color: '#3B82F6',
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 2,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['scene_nira_thoughts'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'ความคิดของนิรา',
      position: { x: START_X + TIER_SPACING * 3, y: START_Y },
      nodeSpecificData: { sceneId: 'scene_nira_thoughts' },
      editorVisuals: {
        color: '#8B5CF6', // สีม่วง - ความคิด
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 3,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['scene_agent_warning'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'คำเตือน',
      position: { x: START_X + TIER_SPACING * 4, y: START_Y },
      nodeSpecificData: { sceneId: 'scene_agent_warning' },
      editorVisuals: {
        color: '#F59E0B', // สีเหลือง - คำเตือน
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 4,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['scene_enter_house'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'เข้าบ้าน',
      position: { x: START_X + TIER_SPACING * 5, y: START_Y },
      nodeSpecificData: { sceneId: 'scene_enter_house' },
      editorVisuals: {
        color: '#3B82F6',
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 5,
        order: 0
      }
    },
    
    // === TIER 6: First Decision Point ===
    {
      nodeId: nodeIdMapping['choice_first_decision'],
      nodeType: StoryMapNodeType.CHOICE_NODE,
      title: 'การตัดสินใจแรก',
      position: { x: START_X + TIER_SPACING * 6, y: START_Y },
      nodeSpecificData: {
        choiceIds: [choiceCodeToId['CHOICE_EXPLORE'], choiceCodeToId['CHOICE_CLEAN'], choiceCodeToId['CHOICE_CALL']],
        promptText: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?',
        layout: 'vertical'
      },
      editorVisuals: {
        color: '#EC4899', // สีชมพู - choice
        orientation: 'vertical',
        borderRadius: 12,
        gradient: {
          from: '#EC4899',
          to: '#DB2777',
          direction: 'vertical'
        }
      },
      layoutConfig: {
        mode: 'auto',
        tier: 6,
        order: 0
      }
    },
    
    // === TIER 7: Branch Paths ===
    // Path A: Explore
    {
      nodeId: nodeIdMapping['scene_explore_downstairs_1'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'สำรวจชั้นล่าง',
      position: { x: START_X + TIER_SPACING * 7, y: START_Y - NODE_SPACING },
      nodeSpecificData: { sceneId: 'scene_explore_downstairs_1' },
      editorVisuals: {
        color: '#6366F1', // สีน้ำเงินอิน๊ดิโก้
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 7,
        order: 0
      }
    },
    
    // Path B: Safe endings (Clean/Call)
    {
      nodeId: nodeIdMapping['ending_safe_day1'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'วันแรกที่แสนสงบ',
      position: { x: START_X + TIER_SPACING * 7, y: START_Y + NODE_SPACING },
      nodeSpecificData: {
        endingTitle: 'วันแรกที่แสนสงบ',
        outcomeDescription: 'คุณเลือกที่จะใช้ชีวิตอย่างปกติสุขต่อไป และไม่มีอะไรผิดปกติเกิดขึ้นในวันแรก... อย่างน้อยก็ในตอนนี้'
      },
      editorVisuals: {
        color: '#22C55E', // สีเขียว - ending ดี
        orientation: 'horizontal',
        borderRadius: 12,
        gradient: {
          from: '#22C55E',
          to: '#16A34A',
          direction: 'horizontal'
        }
      },
      layoutConfig: {
        mode: 'auto',
        tier: 7,
        order: 1
      }
    },
    
    // === Continue Exploration Path ===
    {
      nodeId: nodeIdMapping['scene_found_box'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'กล่องไม้เก่า',
      position: { x: START_X + TIER_SPACING * 8, y: START_Y - NODE_SPACING },
      nodeSpecificData: { sceneId: 'scene_found_box' },
      editorVisuals: {
        color: '#8B5CF6',
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 8,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['scene_found_tape'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'เทปลึกลับ',
      position: { x: START_X + TIER_SPACING * 9, y: START_Y - NODE_SPACING },
      nodeSpecificData: { sceneId: 'scene_found_tape' },
      editorVisuals: {
        color: '#DC2626', // สีแดง - อันตราย
        orientation: 'horizontal',
        showThumbnail: true,
        borderRadius: 8
      },
      layoutConfig: {
        mode: 'auto',
        tier: 9,
        order: 0
      }
    },
    
    // === TIER 10: Tape Decision ===
    {
      nodeId: nodeIdMapping['choice_tape_decision'],
      nodeType: StoryMapNodeType.CHOICE_NODE,
      title: 'การตัดสินใจกับเทป',
      position: { x: START_X + TIER_SPACING * 10, y: START_Y - NODE_SPACING },
      nodeSpecificData: {
        choiceIds: [choiceCodeToId['CHOICE_LISTEN_NOW'], choiceCodeToId['CHOICE_LISTEN_LATER'], choiceCodeToId['CHOICE_BURN_TAPE']],
        promptText: 'ตอนนี้คุณจะทำอะไรกับเทป?',
        layout: 'vertical'
      },
      editorVisuals: {
        color: '#DC2626', // สีแดง - choice อันตราย
        orientation: 'vertical',
        borderRadius: 12,
        gradient: {
          from: '#DC2626',
          to: '#B91C1C',
          direction: 'vertical'
        }
      },
      layoutConfig: {
        mode: 'auto',
        tier: 10,
        order: 0
      }
    },
    
    // === Multiple Endings ===
    {
      nodeId: nodeIdMapping['ending_bad_1'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'เสียงสุดท้าย',
      position: { x: START_X + TIER_SPACING * 11, y: START_Y - NODE_SPACING * 2 },
      nodeSpecificData: {
        endingTitle: 'เสียงสุดท้าย',
        endingSceneId: 'scene_bad_ending_1',
        outcomeDescription: 'นิรากลายเป็นเสียงในเทปอันต่อไป หลังจากเผชิญหน้ากับสิ่งลี้ลับในห้องใต้ดิน'
      },
      editorVisuals: {
        color: '#7F1D1D', // สีแดงเข้ม - bad ending
        orientation: 'horizontal',
        borderRadius: 12,
        gradient: {
          from: '#7F1D1D',
          to: '#991B1B',
          direction: 'horizontal'
        }
      },
      layoutConfig: {
        mode: 'auto',
        tier: 11,
        order: 0
      }
    },
    {
      nodeId: nodeIdMapping['ending_cliffhanger_3am'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'คำท้าทายตอนตีสาม',
      position: { x: START_X + TIER_SPACING * 11, y: START_Y - NODE_SPACING },
      nodeSpecificData: {
        endingTitle: 'คำท้าทายตอนตีสาม',
        outcomeDescription: 'คุณตัดสินใจที่จะทำตามคำท้าทายบนเทป... คืนนี้อะไรจะเกิดขึ้นกันแน่? (โปรดติดตามตอนต่อไป)'
      },
      editorVisuals: {
        color: '#F59E0B', // สีเหลือง - cliffhanger
        orientation: 'horizontal',
        borderRadius: 12
      },
      layoutConfig: {
        mode: 'auto',
        tier: 11,
        order: 1
      }
    },
    {
      nodeId: nodeIdMapping['ending_destroy_evidence'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'ทำลายหลักฐาน',
      position: { x: START_X + TIER_SPACING * 11, y: START_Y },
      nodeSpecificData: {
        endingTitle: 'ทำลายหลักฐาน',
        outcomeDescription: 'คุณตัดสินใจทำลายเทปปริศนาทิ้ง บางทีการไม่รู้ อาจจะเป็นสิ่งที่ดีที่สุดแล้ว'
      },
      editorVisuals: {
        color: '#6B7280', // สีเทา - neutral ending
        orientation: 'horizontal',
        borderRadius: 12
      },
      layoutConfig: {
        mode: 'auto',
        tier: 11,
        order: 2
      }
    }
  ];

  // กำหนด Edges (การเชื่อมโยง) พร้อม visual properties และ handle positions
  const edges: IStoryMapEdge[] = [
    // === เส้นทางหลัก (Main Flow) ===
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
        markerEnd: 'arrowclosed',
        labelStyle: {
          backgroundColor: '#10B981',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_arrival'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_key_exchange'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#3B82F6',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_key_exchange'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_nira_thoughts'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#3B82F6',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_nira_thoughts'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_agent_warning'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#8B5CF6',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_agent_warning'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_enter_house'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#F59E0B',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_enter_house'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['choice_first_decision'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#3B82F6',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    
    // === จากทางเลือกแรก (First Decision Branches) ===
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_first_decision'],
      sourceHandlePosition: 'top', // vertical orientation choice node
      targetNodeId: nodeIdMapping['scene_explore_downstairs_1'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_EXPLORE'],
      label: 'สำรวจบ้าน',
      editorVisuals: {
        color: '#EC4899',
        lineStyle: 'solid',
        pathType: 'step',
        strokeWidth: 3,
        labelStyle: {
          backgroundColor: '#EC4899',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_first_decision'],
      sourceHandlePosition: 'bottom',
      targetNodeId: nodeIdMapping['ending_safe_day1'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_CLEAN'],
      label: 'ทำความสะอาด',
      editorVisuals: {
        color: '#22C55E',
        lineStyle: 'solid',
        pathType: 'step',
        strokeWidth: 3,
        labelStyle: {
          backgroundColor: '#22C55E',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_first_decision'],
      sourceHandlePosition: 'bottom',
      targetNodeId: nodeIdMapping['ending_safe_day1'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_CALL'],
      label: 'โทรหาเพื่อน',
      editorVisuals: {
        color: '#22C55E',
        lineStyle: 'dashed',
        pathType: 'step',
        strokeWidth: 2,
        labelStyle: {
          backgroundColor: '#22C55E',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    },
    
    // === เส้นทางสำรวจ (Exploration Path) ===
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_explore_downstairs_1'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_found_box'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#6366F1',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_found_box'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['scene_found_tape'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#8B5CF6',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 2
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['scene_found_tape'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['choice_tape_decision'],
      targetHandlePosition: 'left',
      label: 'ต่อไป',
      editorVisuals: {
        color: '#DC2626',
        lineStyle: 'solid',
        pathType: 'smooth',
        strokeWidth: 3,
        animated: true
      }
    },
    
    // === จากทางเลือกเทป (Tape Decision Branches) ===
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_tape_decision'],
      sourceHandlePosition: 'top',
      targetNodeId: nodeIdMapping['ending_bad_1'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_LISTEN_NOW'],
      label: 'ฟังเทปทันที',
      editorVisuals: {
        color: '#7F1D1D',
        lineStyle: 'solid',
        pathType: 'step',
        strokeWidth: 4,
        animated: true,
        labelStyle: {
          backgroundColor: '#7F1D1D',
          color: '#FFFFFF',
          borderRadius: 6,
          fontWeight: 'bold'
        }
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_tape_decision'],
      sourceHandlePosition: 'right',
      targetNodeId: nodeIdMapping['ending_cliffhanger_3am'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_LISTEN_LATER'],
      label: 'รอให้ถึงตีสาม',
      editorVisuals: {
        color: '#F59E0B',
        lineStyle: 'dashed',
        pathType: 'step',
        strokeWidth: 3,
        labelStyle: {
          backgroundColor: '#F59E0B',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    },
    {
      edgeId: uuidv4(),
      sourceNodeId: nodeIdMapping['choice_tape_decision'],
      sourceHandlePosition: 'bottom',
      targetNodeId: nodeIdMapping['ending_destroy_evidence'],
      targetHandlePosition: 'left',
      triggeringChoiceId: choiceCodeToId['CHOICE_BURN_TAPE'],
      label: 'เผาเทปทิ้ง',
      editorVisuals: {
        color: '#6B7280',
        lineStyle: 'dotted',
        pathType: 'step',
        strokeWidth: 2,
        labelStyle: {
          backgroundColor: '#6B7280',
          color: '#FFFFFF',
          borderRadius: 6
        }
      }
    }
  ];

  // สร้าง StoryMap สำหรับ Episode 1 เฉพาะ
  const storyMap = new StoryMapModel({
    novelId,
    episodeId, // 🎯 เชื่อมโยงกับ Episode เฉพาะ
    title: `Episode 1: ย้ายเข้า - โครงเรื่อง`,
    version: 1, // Episode-specific version (แยกจาก Novel-level version)
    description: 'แผนผังเรื่องราวสำหรับตอนที่ 1 ของนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"',
    nodes,
    edges,
    storyVariables,
    startNodeId: nodeIdMapping['start_whisper999'],
    lastModifiedByUserId: authorId,
    isActive: true,
    editorMetadata: {
      zoomLevel: 0.8, // ย่อขนาดเพื่อให้เห็นภาพรวม
      viewOffsetX: -50,
      viewOffsetY: -100,
      gridSize: 20,
      showGrid: true,
      showSceneThumbnails: true,
      showNodeLabels: true,
      autoLayoutAlgorithm: 'custom',
      layoutPreferences: {
        defaultOrientation: 'horizontal', // แนวนอนเป็นหลัก
        nodeSpacing: { x: TIER_SPACING, y: NODE_SPACING },
        tierSpacing: TIER_SPACING,
        autoAlign: true,
        preserveManualPositions: false,
        flowDirection: 'left-right'
      },
      uiPreferences: {
        nodeDefaultColor: '#3B82F6',
        edgeDefaultColor: '#6B7280',
        connectionLineStyle: 'smooth',
        showConnectionLines: true,
        autoSaveEnabled: false, // ตามที่ผู้ใช้ตั้งค่า
        autoSaveIntervalSec: 30,
        snapToGrid: true,
        enableAnimations: true,
        nodeDefaultOrientation: 'horizontal',
        edgeDefaultPathType: 'smooth',
        showMinimap: true,
        enableNodeThumbnails: true
      },
      performanceSettings: {
        virtualizeNodes: false, // กราฟไม่ใหญ่มาก
        maxVisibleNodes: 50,
        enableCaching: true
      }
    }
  });

  const savedStoryMap = await storyMap.save();
  console.log(`✅ สร้าง StoryMap สำเร็จ: ${savedStoryMap._id} (${savedStoryMap.nodes.length} nodes, ${savedStoryMap.edges.length} edges)`);
  
  return {
    storyMap: savedStoryMap,
    nodeIdMapping
  };
};

/**
 * สร้าง StoryMap เปล่าสำหรับ Episode ใหม่
 * @param novelId - ID ของนิยาย
 * @param episodeId - ID ของตอน
 * @param authorId - ID ของผู้แต่ง
 * @param episodeTitle - ชื่อตอน
 * @returns StoryMap document ที่สร้างเสร็จแล้ว (เปล่า)
 */
export const createEmptyStoryMapForEpisode = async (
  novelId: mongoose.Types.ObjectId,
  episodeId: mongoose.Types.ObjectId,
  authorId: mongoose.Types.ObjectId,
  episodeTitle: string
) => {
  console.log(`📊 กำลังสร้าง StoryMap เปล่าสำหรับ Episode: ${episodeTitle}...`);

  // สร้าง start node เดียวสำหรับ episode ใหม่
  const startNodeId = uuidv4();
  
  const nodes: IStoryMapNode[] = [
    {
      nodeId: startNodeId,
      nodeType: StoryMapNodeType.START_NODE,
      title: 'จุดเริ่มต้น',
      position: { x: 400, y: 300 }, // ตำแหน่งกลางของ canvas
      nodeSpecificData: {},
      notesForAuthor: `จุดเริ่มต้นของ ${episodeTitle} - พร้อมสำหรับการพัฒนาเนื้อเรื่อง`,
      authorDefinedEmotionTags: ['beginning', 'neutral'],
      authorDefinedPsychologicalImpact: 0,
      editorVisuals: {
        color: '#10B981', // สีเขียวสำหรับ start node
        icon: 'play-circle',
        orientation: 'horizontal',
        borderRadius: 12,
        borderStyle: 'solid',
        gradient: {
          from: '#10B981',
          to: '#059669',
          direction: 'horizontal'
        },
        animation: {
          enter: 'fadeIn',
          exit: 'fadeOut'
        }
      },
      layoutConfig: {
        mode: 'manual',
        tier: 0,
        order: 0
      },
      lastEdited: new Date()
    }
  ];

  // ไม่มี edges สำหรับ StoryMap เปล่า
  const edges: IStoryMapEdge[] = [];

  // ตัวแปรเรื่องราวพื้นฐาน (สามารถแก้ไขได้ภายหลัง)
  const storyVariables: IStoryVariableDefinition[] = [
    {
      variableId: uuidv4(),
      variableName: 'episode_progress',
      dataType: StoryVariableDataType.NUMBER,
      initialValue: 0,
      description: 'ความคืบหน้าของตอนนี้ (0-100)',
      allowedValues: [0, 100],
      isGlobal: false,
      isVisibleToPlayer: false
    },
    {
      variableId: uuidv4(),
      variableName: 'scene_count',
      dataType: StoryVariableDataType.NUMBER,
      initialValue: 0,
      description: 'จำนวนฉากที่ผู้เล่นผ่านมาแล้วในตอนนี้',
      isGlobal: false,
      isVisibleToPlayer: false
    }
  ];

  // สร้าง StoryMap document
  const storyMap = new StoryMapModel({
    novelId,
    episodeId,
    title: `${episodeTitle} - โครงเรื่อง`,
    version: 1,
    description: `แผนผังเรื่องราวสำหรับ ${episodeTitle}`,
    nodes,
    edges,
    storyVariables,
    startNodeId,
    lastModifiedByUserId: authorId,
    isActive: true,
    editorMetadata: {
      zoomLevel: 1,
      viewOffsetX: -200, // เลื่อนมุมมองให้เห็น start node ตรงกลาง
      viewOffsetY: -100,
      gridSize: 20,
      showGrid: true,
      showSceneThumbnails: false, // เริ่มต้นไม่แสดง thumbnails สำหรับ StoryMap เปล่า
      showNodeLabels: true,
      autoLayoutAlgorithm: 'dagre',
      layoutPreferences: {
        defaultOrientation: 'horizontal',
        nodeSpacing: { x: 200, y: 300 },
        tierSpacing: 300,
        autoAlign: false, // ให้ผู้ใช้จัดเรียงเอง
        preserveManualPositions: true,
        flowDirection: 'left-right'
      },
      uiPreferences: {
        nodeDefaultColor: '#3B82F6',
        edgeDefaultColor: '#6B7280',
        connectionLineStyle: 'smooth',
        showConnectionLines: true,
        autoSaveEnabled: false, // ให้ผู้ใช้เลือกเปิดเอง
        autoSaveIntervalSec: 30,
        snapToGrid: true,
        enableAnimations: true,
        nodeDefaultOrientation: 'horizontal',
        edgeDefaultPathType: 'smooth',
        showMinimap: false, // ปิด minimap สำหรับ StoryMap เปล่า
        enableNodeThumbnails: false
      },
      collaborationSettings: {
        allowMultipleEditors: true,
        showCursors: true,
        showUserAvatars: true,
        lockTimeout: 300 // 5 นาที
      },
      performanceSettings: {
        virtualizeNodes: false, // ไม่จำเป็นสำหรับ StoryMap เปล่า
        maxVisibleNodes: 100,
        chunkSize: 50,
        enableCaching: true
      }
    }
  });

  const savedStoryMap = await storyMap.save();
  console.log(`✅ สร้าง StoryMap เปล่าสำเร็จ: ${savedStoryMap._id} สำหรับ ${episodeTitle}`);
  
  return savedStoryMap;
};

export const createWhisper999Novel = async (authorId: mongoose.Types.ObjectId) => {

  // Find or create necessary categories before creating the novel
  console.log('🔍 Finding or creating necessary categories...');
  const langCatId = await findOrCreateCategory('ภาษาไทย', CategoryType.LANGUAGE, 'th');
  const themeCatId = await findOrCreateCategory('สยองขวัญ', CategoryType.GENRE, 'horror');
  const subThemeCatId1 = await findOrCreateCategory('จิตวิทยา', CategoryType.GENRE, 'psychological');
  const subThemeCatId2 = await findOrCreateCategory('ปริศนา', CategoryType.GENRE, 'mystery');
  const moodToneCatId1 = await findOrCreateCategory('ลึกลับ', CategoryType.MOOD_AND_TONE, 'mysterious');
  const moodToneCatId2 = await findOrCreateCategory('น่ากลัว', CategoryType.MOOD_AND_TONE, 'scary');
  const ageRatingCatId = await findOrCreateCategory('18+', CategoryType.AGE_RATING, '18-plus');
  const narrativePerspectiveCatId = await findOrCreateCategory('บุคคลที่หนึ่ง', CategoryType.NARRATIVE_PERSPECTIVE, 'first-person');
  const artStyleCatId = await findOrCreateCategory('สมจริง', CategoryType.ART_STYLE, 'realistic');
  const interactivityLevelCatId = await findOrCreateCategory('สูง', CategoryType.INTERACTIVITY_LEVEL, 'high');
  const lengthTagCatId = await findOrCreateCategory('เรื่องสั้น', CategoryType.LENGTH_TAG, 'short-story');

  console.log('✅ Categories are ready.');

  const novel = new NovelModel({
    title: 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999',
    slug: 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999',
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
        { categoryId: subThemeCatId1, customName: 'จิตวิทยา' },
        { categoryId: subThemeCatId2, customName: 'ปริศนา' }
      ],
      moodAndTone: [moodToneCatId1, moodToneCatId2],
      contentWarnings: [],
      customTags: ['สยองขวัญ', 'จิตวิทยา', 'ปริศนา', 'บ้านผีสิง', 'ยอดนิยม', 'แนะนำ']
    },
    narrativeFocus: {
      narrativePerspective: narrativePerspectiveCatId,
      artStyle: artStyleCatId,
      interactivityLevel: interactivityLevelCatId,
      lengthTag: lengthTagCatId,
    },
    worldBuildingDetails: {
      loreSummary: 'อพาร์ตเมนท์เก่าแก่ที่มีประวัติศาสตร์ดำมืดซ่อนอยู่ ทุกห้องมีเรื่องราวของตัวเอง และไม่ใช่ทุกเรื่องที่จะจบลงด้วยดี',
      technologyPrinciples: 'เรื่องราวเกิดขึ้นในยุคปัจจุบัน ไม่มีเทคโนโลยีล้ำยุค แต่เน้นบรรยากาศและความเชื่อเหนือธรรมชาติ'
    },
    ageRatingCategoryId: ageRatingCatId,
    language: langCatId,
    status: NovelStatus.PUBLISHED,
    accessLevel: NovelAccessLevel.PUBLIC,
    isCompleted: false,
    endingType: NovelEndingType.MULTIPLE_ENDINGS,
    sourceType: {
      type: NovelContentType.INTERACTIVE_FICTION
    },
    totalEpisodesCount: 1, // ปัจจุบันมีแค่ episode 1 เท่านั้น
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

  const characters = await createWhisper999Characters(novel._id, authorId);
  const choices = await createWhisper999Choices(novel._id, authorId);

  // สร้าง Episode 1 (ปัจจุบันมีแค่ episode เดียว)
  console.log('📖 กำลังสร้าง Episode 1...');
  const episode1 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'บทที่ 1: ย้ายเข้า',
    slug: 'บทที่-1-ย้ายเข้า',
    episodeOrder: 1,
    status: EpisodeStatus.PUBLISHED,
    accessType: EpisodeAccessType.PAID_UNLOCK,
    priceCoins: 10,
    teaserText: 'การมาถึงบ้านหลังใหม่ที่ดูเหมือนจะสมบูรณ์แบบ... ยกเว้นก็แต่ข่าวลือและราคาที่ถูกจนน่าสงสัย',
    publishedAt: new Date(),
    isPreviewAllowed: true,
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 0,
      estimatedReadingTimeMinutes: 0,
      purchasesCount: 0,
    }
  });

  await episode1.save();

  // สร้าง scenes สำหรับ Episode 1
  console.log('🎬 กำลังสร้าง scenes สำหรับ Episode 1...');
  const episode1Scenes = await createWhisper999Scenes(novel._id, episode1._id, characters, choices);

  // อัปเดต Episode 1 ด้วย sceneIds และ firstSceneId
  await EpisodeModel.findByIdAndUpdate(episode1._id, {
    firstSceneId: episode1Scenes[0]?._id,
    sceneIds: episode1Scenes.map(s => s._id)
  });

  // อัปเดต Novel ด้วย firstEpisodeId
  await NovelModel.findByIdAndUpdate(novel._id, {
    firstEpisodeId: episode1._id
  });

  // ดึง episodes ที่อัปเดตแล้ว
  const updatedEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

  // สร้าง StoryMap สำหรับ Episode 1
  console.log('📊 กำลังสร้าง StoryMap สำหรับ Episode 1...');
  const storyMapResult = await createWhisper999Episode1StoryMap(novel._id, episode1._id, authorId, choices);
  const { storyMap: episode1StoryMap, nodeIdMapping } = storyMapResult;

  // อัปเดต scenes ให้มี storyMapNodeId
  console.log('🔗 กำลังเชื่อมโยง scenes กับ StoryMap nodes...');
  const sceneToNodeMapping: Record<string, string> = {
    'scene_arrival': nodeIdMapping['scene_arrival'],
    'scene_key_exchange': nodeIdMapping['scene_key_exchange'],
    'scene_nira_thoughts': nodeIdMapping['scene_nira_thoughts'],
    'scene_agent_warning': nodeIdMapping['scene_agent_warning'],
    'scene_enter_house': nodeIdMapping['scene_enter_house'],
    'scene_explore_downstairs_1': nodeIdMapping['scene_explore_downstairs_1'],
    'scene_found_box': nodeIdMapping['scene_found_box'],
    'scene_found_tape': nodeIdMapping['scene_found_tape']
  };

  for (const scene of episode1Scenes) {
    if (scene.nodeId && sceneToNodeMapping[scene.nodeId]) {
      await SceneModel.findByIdAndUpdate(scene._id, {
        storyMapNodeId: sceneToNodeMapping[scene.nodeId]
      });
    }
  }

  console.log('✅ เชื่อมโยง scenes กับ StoryMap เสร็จสิ้น');

  // สร้าง Episodes เพิ่มเติม (2-5) พร้อม StoryMap เปล่า
  console.log('📖 กำลังสร้าง Episodes เพิ่มเติม (2-5) พร้อม StoryMap เปล่า...');
  const additionalEpisodes = [];
  const allStoryMaps = [episode1StoryMap]; // เริ่มด้วย StoryMap ของ Episode 1
  
  for (let i = 2; i <= 5; i++) {
    const episodeTitle = `บทที่ ${i}: ${i === 2 ? 'การสำรวจ' : i === 3 ? 'ความจริงเริ่มเผย' : i === 4 ? 'ใจกลางความมืด' : 'บทสรุป'}`;
    const episodeSlug = `บทที่-${i}-${i === 2 ? 'การสำรวจ' : i === 3 ? 'ความจริงเริ่มเผย' : i === 4 ? 'ใจกลางความมืด' : 'บทสรุป'}`;
    
    const episode = new EpisodeModel({
      novelId: novel._id,
      authorId,
      title: episodeTitle,
      slug: episodeSlug,
      episodeOrder: i,
      status: EpisodeStatus.DRAFT,
      accessType: EpisodeAccessType.PAID_UNLOCK,
      priceCoins: 10,
      teaserText: `ตอนที่ ${i} ของเรื่องราวสยองขวัญที่จะทำให้คุณลุ้นระทึก...`,
      publishedAt: null,
      isPreviewAllowed: true,
      stats: {
        viewsCount: 0,
        uniqueViewersCount: 0,
        likesCount: 0,
        commentsCount: 0,
        totalWords: 0,
        estimatedReadingTimeMinutes: 0,
        purchasesCount: 0,
      }
    });

    await episode.save();
    additionalEpisodes.push(episode);

    // สร้าง StoryMap เปล่าสำหรับแต่ละ Episode
    const emptyStoryMap = await createEmptyStoryMapForEpisode(novel._id, episode._id, authorId, episodeTitle);
    allStoryMaps.push(emptyStoryMap);
    console.log(`✅ สร้าง Episode ${i} และ StoryMap เปล่าสำเร็จ (Episode ID: ${episode._id}, StoryMap ID: ${emptyStoryMap._id})`);
  }

  // อัปเดต Novel ด้วยข้อมูลสถิติ
  await NovelModel.findByIdAndUpdate(novel._id, {
    totalEpisodesCount: 5,
    publishedEpisodesCount: 1,
    firstEpisodeId: episode1._id
  });

  // ดึง episodes ที่อัปเดตแล้วทั้งหมด
  const allEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

  console.log(`✅ สร้างข้อมูลครบถ้วน: ${allEpisodes.length} Episodes, ${allStoryMaps.length} StoryMaps`);

  return {
    novel,
    episodes: allEpisodes,
    characters,
    choices,
    scenes: episode1Scenes, // scenes ของ episode 1 เท่านั้น
    storyMap: episode1StoryMap, // StoryMap หลักของ Episode 1
    storyMaps: allStoryMaps // StoryMaps ทั้งหมด
  };
};