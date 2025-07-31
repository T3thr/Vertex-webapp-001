import mongoose from 'mongoose';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelContentType, NovelEndingType } from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import SceneModel, { EndingType as SceneEndingType, TimelineEventType } from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import UserModel, { IUser } from '@/backend/models/User';
import UserProfileModel, { IUserProfile } from '@/backend/models/UserProfile';
import CategoryModel, { CategoryType } from '@/backend/models/Category'; // Import CategoryModel
import redis from '@/backend/lib/redis'; // Import Redis client
import dbConnect from '@/backend/lib/mongodb'; // Import the centralized dbConnect

config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

/**
 * Finds or creates a category and returns its ID.
 * @param name - The name of the category.
 * @param type - The type of the category.
 * @param slug - The slug for the category.
 * @returns The ObjectId of the category.
 */
const findOrCreateCategory = async (name: string, type: CategoryType, slug: string): Promise<mongoose.Types.ObjectId> => {
  let category = await CategoryModel.findOne({ slug, categoryType: type });
  if (!category) {
    console.log(`- Creating new category: "${name}" (Type: ${type})`);
    category = new CategoryModel({
      name,
      slug,
      categoryType: type,
      description: `Category for ${name}`,
      visibility: 'public',
      isSystemDefined: true,
      isActive: true,
    });
    await category.save();
  }
  return category._id;
};


const createMockAuthor = async () => {
  const author = await UserModel.findOne({ username: AUTHOR_USERNAME });
  if (author) {
    // Ensure profile exists
    if (!author.profile) {
        let userProfile = await UserProfileModel.findOne({ userId: author._id });
        if (!userProfile) {
            userProfile = new UserProfileModel({
                userId: author._id,
                displayName: 'นักเขียนเงา',
                penNames: ['ผู้เขียนเสียงกระซิบ', 'Shadow Scribe'],
                bio: 'นักเขียนผู้หลงใหลในเรื่องราวลึกลับและสยองขวัญ',
            });
            await userProfile.save();
        }
        author.profile = userProfile._id;
        await author.save();
    }
    console.log(`✅ พบผู้แต่งในฐานข้อมูล: ${author.username} (${author._id})`);
    return author._id;
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const newAuthor = new UserModel({
    username: AUTHOR_USERNAME,
    email: 'author_whisper@novelmaze.com',
    password: hashedPassword,
    accounts: [{
      provider: 'credentials',
      providerAccountId: 'author_whisper@novelmaze.com',
      type: 'credentials'
    }],
    roles: ['Writer'],
    primaryPenName: 'นักเขียนเงา',
    isEmailVerified: true,
    isActive: true,
    isBanned: false,
    isDeleted: false,
  });

  const savedAuthor = await newAuthor.save();

  const authorProfile = new UserProfileModel({
      userId: savedAuthor._id,
      displayName: 'นักเขียนเงา',
      penNames: ['ผู้เขียนเสียงกระซิบ', 'Shadow Scribe'],
      bio: 'นักเขียนผู้หลงใหลในเรื่องราวลึกลับและสยองขวัญ',
  });
  await authorProfile.save();
  
  savedAuthor.profile = authorProfile._id;
  await savedAuthor.save();

  console.log(`✅ สร้างผู้แต่งใหม่: ${savedAuthor.username} (${savedAuthor._id})`);
  return savedAuthor._id;
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
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_explore_downstairs_1' } }],
      isMajorChoice: true,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CLEAN',
      text: 'ทำความสะอาดห้องนั่งเล่นและเปิดผ้าม่าน',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }],
      isMajorChoice: true,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CALL',
      text: 'โทรหาเพื่อนเพื่อเล่าเรื่องบ้านใหม่',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }],
      isMajorChoice: true,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_NOW',
      text: 'กดฟังเทปทันที',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_listen_tape_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LISTEN_LATER',
      text: 'รอให้ถึงตีสาม แล้วฟังตามที่เขียน',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_BURN_TAPE',
      text: 'เผาเทปทิ้งทันที',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_end_of_prologue' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_OPEN_SECRET_DOOR',
      text: 'เปิดประตูลับและลงไปทันที',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_enter_basement_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_TAKE_PHOTO',
      text: 'ถ่ายรูปส่งให้เพื่อนก่อนเปิด',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_send_photo_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_LOCK_DOOR',
      text: 'ปิดมันไว้แล้วล็อกด้วยตู้เย็นทับ',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_lock_door_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_REINFORCE_DOOR',
      text: '🪚 เสริมโครงไม้ทับตู้เย็นอีกชั้น',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_reinforce_door_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_SETUP_CAMERA',
      text: '📷 ตั้งกล้องวงจรปิดไว้หน้าตู้เย็น แล้วออกไปนอนข้างนอกสักคืน',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_setup_camera_1' } }],
      isMajorChoice: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_DESTROY_DOOR',
      text: '🧨 หาวัสดุระเบิดฝังตรงนั้นแล้วเผาทำลายให้หมด',
      actions: [{ actionId: 'action1', type: 'go_to_node', parameters: { targetNodeId: 'scene_destroy_door_1' } }],
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

const createWhisper999Scenes = async (
  novelId: mongoose.Types.ObjectId, 
  episodeId: mongoose.Types.ObjectId, 
  characters: any[],
  choices: any[]
) => {
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  const choiceMap = choices.reduce((acc, choice) => {
    acc[choice.choiceCode] = choice._id;
    return acc;
  }, {} as Record<string, mongoose.Types.ObjectId>);

  const scenes = [
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene_arrival',
      title: 'การมาถึง',
      background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
      textContents: [
        {
          instanceId: 'narration_1',
          type: 'narration',
          content: 'เสียงล้อกระเป๋าเดินทางบดไปบนพื้นซีเมนต์หน้าบ้านเลขที่ 9 — บ้านเก่าทรงโคโลเนียลสองชั้น หลังคางุ้มด้วยเถาวัลย์ที่เริ่มแห้งเฉา ข้างในมืดสนิทแม้จะเป็นเวลาเย็น เพราะไม่มีใครอยู่มานานหลายปี',
        }
      ],
    },
    {
        novelId,
        episodeId,
        sceneOrder: 2,
        nodeId: 'scene_key_exchange',
        title: 'รับกุญแจ',
        background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
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
            content: '“ยินดีต้อนรับ คุณนิรา” — เสียงของนายหน้าอสังหาริมทรัพย์กล่าว พร้อมยื่นกุญแจบ้านให้',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 3,
        nodeId: 'scene_nira_thoughts',
        title: 'ความคิดของนิรา',
        background: { type: 'image', value: '/images/background/ChurchCourtyardA_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
        characters: [
          { instanceId: 'nira_char_thinking', characterId: characterMap.nira, expressionId: 'curious', transform: { positionX: 0 }, isVisible: true },
        ],
        textContents: [
          {
            instanceId: 'dialogue_nira_internal',
            type: 'dialogue',
            characterId: characterMap.nira,
            speakerDisplayName: 'นิรา (คิดในใจ)',
            content: '“บ้านนี้ราคาถูกจนน่าตกใจ แต่สวยดี” นิราพึมพำกับตัวเอง',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 4,
        nodeId: 'scene_agent_warning',
        title: 'คำเตือน',
        background: { type: 'image', value: '/images/background/ChurchCorridor_Sunset.png', isOfficialMedia: true, fitMode: 'cover' },
        characters: [
            { instanceId: 'agent_char_leaving', characterId: characterMap.agent, expressionId: 'normal', transform: { positionX: 100, opacity: 0.5 }, isVisible: true },
        ],
        textContents: [
          {
            instanceId: 'dialogue_agent_whisper',
            type: 'narration',
            content: '“เพราะมีข่าวลือ…” นายหน้ากระซิบเบาๆ แล้วรีบหันหลังจากไป',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 5,
        nodeId: 'scene_enter_house',
        title: 'เข้าบ้าน',
        background: { type: 'image', value: '/images/background/BG39.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'narration_enter',
            type: 'narration',
            content: 'คุณเดินเข้าบ้านพร้อมกระเป๋าเพียงหนึ่งใบ แสงแดดสุดท้ายลอดผ่านหน้าต่างที่เต็มไปด้วยฝุ่น ก่อนจะดับวูบ...',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 6,
        nodeId: 'scene_first_choice',
        title: 'การตัดสินใจแรก',
        background: { type: 'image', value: '/images/background/BG39.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_EXPLORE, choiceMap.CHOICE_CLEAN, choiceMap.CHOICE_CALL]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 7,
        nodeId: 'scene_explore_downstairs_1',
        title: 'สำรวจชั้นล่าง',
        background: { type: 'image', value: '/images/background/BG43.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'narration_explore_1',
            type: 'narration',
            content: 'เธอเปิดไฟและเดินสำรวจรอบบ้าน พบว่าห้องทุกห้องดูเก่าแต่ไม่มีร่องรอยการอยู่',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 8,
        nodeId: 'scene_found_box',
        title: 'กล่องไม้เก่า',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'narration_found_box',
            type: 'narration',
            content: 'ขณะเดินผ่านห้องใต้บันได เธอสังเกตเห็น “กล่องไม้เก่า” มีตราประทับปี 1974',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 9,
        nodeId: 'scene_found_tape',
        title: 'เทปลึกลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'narration_found_tape',
            type: 'narration',
            content: 'ข้างในมีเครื่องเล่นเทปพกพาและคาสเซ็ตที่เขียนด้วยลายมือว่า “เสียงสุดท้ายของฉัน - ห้ามฟังตอนตีสาม”',
          },
        ],
      },
      {
        novelId,
        episodeId,
        sceneOrder: 10,
        nodeId: 'scene_tape_choice',
        title: 'การตัดสินใจกับเทป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไร?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_LISTEN_NOW, choiceMap.CHOICE_LISTEN_LATER, choiceMap.CHOICE_BURN_TAPE]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 11,
        nodeId: 'scene_listen_tape_1',
        title: 'เสียงจากเทป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_tape_sound',
                type: 'narration',
                content: 'เสียงแทรกซ่าก่อนจะค่อยๆ ชัดขึ้น…'
            },
            {
                instanceId: 'narration_tape_voice',
                type: 'narration',
                content: '“ฉันเห็นผู้ชายไม่มีหน้าในกระจก…เขาบอกให้ฉัน ‘ตามหาเสียงกระซิบในห้องใต้ดิน’…แต่บ้านนี้ไม่มีห้องใต้ดิน…”'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 12,
        nodeId: 'scene_secret_door',
        title: 'ประตูลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_nira_shock',
                type: 'narration',
                content: 'นิราตกใจ ปิดเทป'
            },
            {
                instanceId: 'narration_found_door',
                type: 'narration',
                content: 'วันรุ่งขึ้น เธอสังเกตเห็นพรมในครัวนูนขึ้นเล็กน้อย เมื่อเปิดออกมา พบ “ประตูลับ”'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 13,
        nodeId: 'scene_secret_door_choice',
        title: 'การตัดสินใจกับประตูลับ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไร?',
          },
        ],
        choiceIds: [choiceMap.CHOICE_OPEN_SECRET_DOOR, choiceMap.CHOICE_TAKE_PHOTO, choiceMap.CHOICE_LOCK_DOOR]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 14,
        nodeId: 'scene_enter_basement_1',
        title: 'ห้องใต้ดิน',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_basement_whisper',
                type: 'narration',
                content: 'เสียงกระซิบดังขึ้นทันทีที่เปิดประตู… “ดีใจที่เธอมาจนถึงตรงนี้…”'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 15,
        nodeId: 'scene_basement_encounter',
        title: 'เผชิญหน้า',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_basement_details',
                type: 'narration',
                content: 'ข้างล่างเป็นห้องใต้ดินเก่ามืดสนิท มีผนังที่ขูดด้วยเล็บนับพันเส้น ตรงกลางห้อง มีผู้ชายไม่มีหน้า…ยื่นกล่องไม้กลับมาให้เธอ…'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 16,
        nodeId: 'scene_bad_ending_1',
        title: 'เสียงสุดท้าย',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_final_words',
                type: 'narration',
                content: '“ต่อไป…เสียงสุดท้ายจะเป็นของเธอ”'
            },
            {
                instanceId: 'narration_ending_desc',
                type: 'narration',
                content: 'นิราหายไป อีกสองเดือนต่อมา กล่องไม้และเทปอันเดิมกลับไปวางอยู่ที่เดิม พร้อมเทปล่าสุดว่า “เสียงของนิรา”'
            }
        ],
        timelineEvents: [
          {
            startTimeMs: 0,
            type: TimelineEventType.END_NOVEL,
            parameters: {
              endingType: SceneEndingType.BAD,
              title: 'เสียงสุดท้าย',
              description: 'นิรากลายเป็นเสียงในเทปอันต่อไป หลังจากเผชิญหน้ากับสิ่งลี้ลับในห้องใต้ดิน'
            }
          }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 17,
        nodeId: 'scene_send_photo_1',
        title: 'คำเตือนจากเพื่อน',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_friend_warning',
                type: 'narration',
                content: 'มิน เพื่อนสนิท รีบบอกให้เธอ “อย่าเปิดเด็ดขาด!”'
            },
            {
                instanceId: 'narration_kitchen_door_opens',
                type: 'narration',
                content: 'นิรากำลังจะปิดฝากลับไป… แต่ประตูห้องครัวก็ เปิดเอง…'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 18,
        nodeId: 'scene_other_doors',
        title: 'ประตูบานอื่น',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_whisper_choice',
                type: 'narration',
                content: 'เสียงกระซิบดังขึ้น: “ถ้าไม่เปิดประตูนั้น ประตูอื่นจะเปิดแทน…”'
            },
            {
                instanceId: 'narration_chaos',
                type: 'narration',
                content: 'ทันใดนั้น…หน้าต่างทุกบานเปิดพรึ่บ ไฟดับทั้งหลัง…'
            }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 19,
        nodeId: 'scene_bad_ending_2',
        title: 'เสียงที่ถูกเลือก',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            {
                instanceId: 'narration_disappearance',
                type: 'narration',
                content: 'นิราหายไปกลางสายตาของมินผ่านวิดีโอคอล กล้องดับพร้อมเสียงกระซิบว่า “เสียงของเธอ…ถูกเลือกแล้ว”'
            }
        ],
        timelineEvents: [
          {
            startTimeMs: 0,
            type: TimelineEventType.END_NOVEL,
            parameters: {
              endingType: SceneEndingType.BAD,
              title: 'เสียงที่ถูกเลือก',
              description: 'นิราหายตัวไปอย่างลึกลับระหว่างวิดีโอคอลกับเพื่อน หลังจากเพิกเฉยต่อคำเตือน'
            }
          }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 20,
        nodeId: 'scene_lock_door_1',
        title: 'ผนึกประตู',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_shaking', type: 'narration', content: 'นิราตัวสั่น มือไม้เย็นเฉียบ สิ่งที่เธอเพิ่งเห็นใต้ประตูลับ — เงาคล้ายร่างเด็กผอมสูงที่เคลื่อนไหวเร็วผิดธรรมชาติ — มันยังคงลอยอยู่ในดวงตาเธอ' },
          { instanceId: 'narration_slam_door', type: 'narration', content: 'เธอ กระแทก ฝาปิดบันไดใต้พื้นด้วยแรงทั้งหมดที่มี เสียง “ปึง!” ดังขึ้น และตามด้วยเสียงกระแทกเบา ๆ …จาก “ข้างใต้”' },
          { instanceId: 'narration_climbing', type: 'narration', content: 'กึก… กึก… ตึง… เหมือนบางอย่างกำลังปีนขึ้นมา' },
          { instanceId: 'narration_move_fridge', type: 'narration', content: 'นิรารีบลากตู้เย็นขนาดใหญ่ไปทับไว้ทันที ต้องใช้แรงมากกว่าที่เคยใช้มาในชีวิต กล้ามเนื้อสั่นระริกเมื่อเธอลากขอบมันผ่านพื้นไม้เก่าเสียงครูด ๆ อย่างน่าขนลุก' },
          { instanceId: 'narration_lock_fridge', type: 'narration', content: 'ในที่สุด… ตู้เย็นก็ขวางไว้ตรงกลางพอดี เธอรีบเอาโซ่ที่เคยใช้รัดประตูคลังอาหาร มารัดไว้กับหูเหล็กของตู้เย็น และตรึงกับตะขอบนพื้น ล็อกไว้แล้ว' },
          { instanceId: 'narration_hope', type: 'narration', content: 'สิ่งที่อยู่ข้างล่าง…จะไม่มีวันขึ้นมาอีก หรืออย่างน้อย…เธอก็หวังเช่นนั้น' },
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 21,
        nodeId: 'scene_vigil',
        title: 'เฝ้าระวัง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_vigil', type: 'narration', content: 'คืนนั้น เธอนั่งเฝ้าตู้เย็นทั้งคืน โดยถือมีดครัวไว้ในมือ เสียงเคาะยังคงมีเป็นระยะ…' },
            { instanceId: 'narration_knocking', type: 'narration', content: 'ไม่แรง…แต่สม่ำเสมอ เหมือน “มันรู้” ว่าเธอยังนั่งฟังอยู่ เหมือนการย้ำเตือนว่า “ฉันยังอยู่ตรงนี้”' },
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 22,
        nodeId: 'scene_lock_door_choice',
        title: 'ทางเลือกต่อไป',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        choiceIds: [choiceMap.CHOICE_REINFORCE_DOOR, choiceMap.CHOICE_SETUP_CAMERA, choiceMap.CHOICE_DESTROY_DOOR]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 23,
        nodeId: 'scene_reinforce_door_1',
        title: 'เสริมความแข็งแกร่ง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_reinforce', type: 'narration', content: 'นิราใช้เวลาทั้งเช้า เลื่อยไม้จากลังเก่า ตอกโครงเหล็กกับผนังสองด้านของห้องครัว เธอเอาไม้หนา ๆ ทับบนตู้เย็น ตอกตะปูแน่นทุกมุม จนกลายเป็น “หลุมฝังศพ” ที่ไม่มีวจะเปิดอีก' },
          { instanceId: 'narration_whisper_plug', type: 'narration', content: 'เสียงเคาะเงียบลงในคืนที่สาม แต่สิ่งที่ดังแทนคือ… เสียง “กระซิบจากปลั๊กไฟ” เมื่อเธอเอาหูแนบผนัง กลับได้ยินเสียงเด็กพูดคำว่า… “เธอฝังฉัน… แต่ฉันฝันถึงเธอทุกคืน…”' },
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 24,
        nodeId: 'scene_bad_ending_3',
        title: 'มืออีกข้าง',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_sleepwalk', type: 'narration', content: 'นิราเริ่มละเมอ เธอลุกขึ้นกลางดึก เดินมาที่ห้องครัว และ… แกะตะปูออกทีละตัว… ทั้งที่หลับตาอยู่' },
          { instanceId: 'narration_other_hand', type: 'narration', content: 'กล้องวงจรปิดที่เธอลืมไว้ในมุมห้องจับภาพได้ชัดเจน ว่า “มือที่เปิดไม้แผ่นสุดท้าย” ไม่ใช่มือเธอคนเดียว… มี “อีกมือ” ที่ผิวซีดขาว…จับตะปูอีกด้าน พร้อมกัน' },
        ],
        timelineEvents: [
          {
            startTimeMs: 0,
            type: TimelineEventType.END_NOVEL,
            parameters: {
              endingType: SceneEndingType.BAD,
              title: 'มืออีกข้าง',
              description: 'การเพิกเฉยไม่ได้ช่วยอะไร สิ่งลี้ลับได้เข้ามาอยู่ในตัวเธอเรียบร้อยแล้ว'
            }
          }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 25,
        nodeId: 'scene_setup_camera_1',
        title: 'ติดตั้งกล้อง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_setup_camera', type: 'narration', content: 'นิราซื้อกล้องวงจรปิดแบบมีอินฟราเรดมาติดไว้ หันตรงไปยังตู้เย็นกับพื้น เธอออกไปนอนโรงแรมเล็ก ๆ ในตัวเมือง พร้อมโน้ตบุ๊กเพื่อดูฟุตเทจแบบเรียลไทม์' },
          { instanceId: 'narration_camera_shake', type: 'narration', content: 'ตีสองสิบห้า — จู่ ๆ กล้องเริ่มสั่น ในภาพปรากฏ “ร่างดำซีดสูงเกินคน” ปีนออกจากช่องแคบ ๆ ใต้ตู้เย็น แม้ตู้เย็นไม่ขยับเลยสักนิด' },
          { instanceId: 'narration_faceless', type: 'narration', content: 'มัน ทะลุผ่าน อย่างไร้แรงต้าน มันยืนนิ่ง…แล้ว “หันหน้ามาทางกล้องโดยตรง” ใบหน้าขาวซีดไม่มีลูกตา แต่กลับมี “ปาก” อยู่ตรงกลางหน้าผาก ปากนั้น… ยิ้ม' },
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 26,
        nodeId: 'scene_bad_ending_4',
        title: 'ถึงตาเธอ',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_camera_destroyed', type: 'narration', content: 'นิรากลับบ้านในวันรุ่งขึ้น กล้องถูกบิดหักพังลง หน้าประตูบ้านมีโน้ตเขียนด้วยลายมือเด็ก: “ออกไปได้แล้ว… ถึงตาเธอลงมาหาฉันบ้าง”' },
        ],
        timelineEvents: [
          {
            startTimeMs: 0,
            type: TimelineEventType.END_NOVEL,
            parameters: {
              endingType: SceneEndingType.BAD,
              title: 'ถึงตาเธอ',
              description: 'การพยายามสังเกตการณ์จากระยะไกลไม่ได้ผล สิ่งลี้ลับสามารถเข้าถึงตัวนิราได้อยู่ดี'
            }
          }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 27,
        nodeId: 'scene_destroy_door_1',
        title: 'ทำลายล้าง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_destroy_plan', type: 'narration', content: 'นิราตัดสินใจว่า จะไม่ทนอีกต่อไป เธอรู้จักเพื่อนเก่าที่เป็นช่างโยธา เขาช่วยเอาวัตถุระเบิดแรงต่ำมาฝังไว้ใต้พื้นห้อง เธอเตือนเพื่อนว่า “อย่ามองเข้าไปข้างในเด็ดขาด”' },
          { instanceId: 'narration_explosion', type: 'narration', content: 'เวลา 05:03 น. นิรากดสวิตช์จุดระเบิดในระยะไกล ตูม! เสียงดังสะท้อนทั่วหมู่บ้าน ไฟไหม้ลุกลามเฉพาะ “บริเวณห้องครัว”' },
          { instanceId: 'narration_shadow', type: 'narration', content: 'เธอเห็นเงาดำ ๆ พุ่งขึ้นไปในเปลวเพลิง เหมือนกำลังดิ้น…และ “หัวเราะ”' },
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 28,
        nodeId: 'scene_bad_ending_5',
        title: 'รอยยิ้มสุดท้าย',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_no_basement', type: 'narration', content: 'เจ้าหน้าที่ดับเพลิงพบว่า ใต้บ้านไม่มีทางเดิน ไม่มีห้องใต้ดิน ไม่มีอุโมงค์ใด ๆ ทั้งสิ้น “มันแค่ดินตัน ๆ… ไม่มีช่องเลยครับ”' },
          { instanceId: 'narration_camera_reveal', type: 'narration', content: 'แต่…ในภาพจากกล้องเพื่อนช่าง ก่อนระเบิดจะลง 3 วินาที มีเด็กหญิงตัวเล็ก ๆ เดินขึ้นจากช่องพื้น หันหน้ามา… แล้วยิ้มให้กล้อง…' },
        ],
        timelineEvents: [
          {
            startTimeMs: 0,
            type: TimelineEventType.END_NOVEL,
            parameters: {
              endingType: SceneEndingType.TRUE,
              title: 'รอยยิ้มสุดท้าย',
              description: 'การทำลายสถานที่ได้ปลดปล่อยวิญญาณเด็กสาว และรอยยิ้มสุดท้ายของเธอคือการขอบคุณที่ช่วยให้เธอเป็นอิสระจากคำสาปนี้',
            }
          }
        ]
      },
      {
        novelId,
        episodeId,
        sceneOrder: 29,
        nodeId: 'scene_end_of_prologue',
        title: 'จะเกิดอะไรขึ้นต่อไป...',
        background: { type: 'image', value: '/images/background/main.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          {
            instanceId: 'ending_message',
            type: 'narration',
            content: 'เรื่องราวในบทแรกจบลงเพียงเท่านี้... การตัดสินใจของคุณจะนำไปสู่อะไร โปรดติดตามตอนต่อไป',
          },
        ],
      }
    ];

  const savedScenes = [];
  for (const scene of scenes) {
    const sceneDoc = new SceneModel(scene);
    // Link scenes sequentially
    if (savedScenes.length > 0) {
        const previousScene = savedScenes[savedScenes.length - 1];
        if (!previousScene.choiceIds || previousScene.choiceIds.length === 0) {
            await SceneModel.findByIdAndUpdate(previousScene._id, { defaultNextSceneId: sceneDoc._id });
        }
    }
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
  }
  
  return savedScenes;
};

const createWhisper999Novel = async (authorId: mongoose.Types.ObjectId) => {
  
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

  const characters = await createWhisper999Characters(novel._id, authorId);
  const choices = await createWhisper999Choices(novel._id, authorId);

  const episodeData = [
    {
      novelId: novel._id,
      authorId,
      title: 'บทที่ 1: ย้ายเข้า',
      slug: 'chapter-1-moving-in',
      episodeOrder: 1,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'การมาถึงบ้านหลังใหม่ที่ดูเหมือนจะสมบูรณ์แบบ... ยกเว้นก็แต่ข่าวลือและราคาที่ถูกจนน่าสงสัย',
      publishedAt: new Date(),
      isPreviewAllowed: true,
    }
  ];

  const episodes = await EpisodeModel.insertMany(episodeData);
  const firstEpisode = episodes[0];

  const scenes = await createWhisper999Scenes(novel._id, firstEpisode._id, characters, choices);

  await EpisodeModel.findByIdAndUpdate(firstEpisode._id, {
    firstSceneId: scenes[0]?._id,
    sceneIds: scenes.map(s => s._id)
  });
  
  const updatedEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

  return { novel, episodes: updatedEpisodes, characters, choices, scenes };
};

export const seedWhisper999Data = async () => {
  try {
    console.log('🌱 เริ่มต้นการสร้างข้อมูลนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');

    // Use the centralized dbConnect instead of mongoose.connect directly
    await dbConnect();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    // Ensure Character collection indexes are up to date (drops legacy unique indexes like characterCode_1)
    console.log('🔄 กำลังตรวจสอบและปรับปรุงดัชนีของคอลเลกชัน Character...');
    await CharacterModel.syncIndexes();
    console.log('✅ ดัชนีของ Character collection พร้อมใช้งาน');
    
    // --- START: Cleanup Logic ---
    const novelSlug = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';
    const novelTitle = 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999';

    // --- START: Category Cleanup --- 
    const categorySlugsToClean = [
      'horror', 'psychological', 'mystery', 'haunted-house', 'popular', 'recommended',
      'dark', 'suspenseful', '18-plus', 'thai', 'first-person', 'realistic', 'high', 'short-story'
    ];
    console.log('🧹 เริ่มการล้างข้อมูลหมวดหมู่ที่เกี่ยวข้อง...');
    const deleteResult = await CategoryModel.deleteMany({ slug: { $in: categorySlugsToClean }, isSystemDefined: true });
    if (deleteResult.deletedCount > 0) {
      console.log(`✅ ลบหมวดหมู่เก่า ${deleteResult.deletedCount} รายการ`);
    }
    // --- END: Category Cleanup ---

    // --- START: Redis Cache Cleanup ---
    const cacheKey = `novel:${novelSlug}`;
    console.log(`🧹 Clearing Redis cache for key: ${cacheKey}`)
    if (!redis.isOpen) {
      await redis.connect();
    }
    await redis.del(cacheKey);
    console.log('✅ ลบ Cache ใน Redis เรียบร้อย')
    // --- END: Redis Cache Cleanup ---
    console.log(`🧹 เริ่มการล้างข้อมูลเก่าสำหรับนิยาย: slug="${novelSlug}" หรือ title="${novelTitle}"...`);

    // ค้นหา novel ทั้งหมดที่มี slug หรือตรงกับชื่อเรื่อง (เผื่อมีข้อมูลซ้ำ)
    const novelsToDelete = await NovelModel.find({
      $or: [
        { slug: novelSlug },
        { title: { $regex: new RegExp(`^${novelTitle}$`, 'i') } }, // case-insensitive exact title match
      ]
    }).select('_id title');

    if (novelsToDelete.length > 0) {
      const novelIds = novelsToDelete.map(n => n._id);

      // ลบข้อมูลที่เกี่ยวข้องทั้งหมดแบบ bulk
      await Promise.all([
        EpisodeModel.deleteMany({ novelId: { $in: novelIds } }),
        SceneModel.deleteMany({ novelId: { $in: novelIds } }),
        ChoiceModel.deleteMany({ novelId: { $in: novelIds } }),
        CharacterModel.deleteMany({ novelId: { $in: novelIds } }),
      ]);
      await NovelModel.deleteMany({ _id: { $in: novelIds } });
      console.log(`✅ ลบข้อมูลเก่านิยายทั้งหมด ${novelsToDelete.length} รายการเรียบร้อยแล้ว`);
    } else {
      console.log('🧐 ไม่พบข้อมูลนิยายเก่า, ข้ามขั้นตอนการลบ');
    }
    // --- END: Cleanup Logic ---

    console.log('👤 กำลังสร้างข้อมูลผู้แต่ง...');
    const authorId = await createMockAuthor();
    console.log(`✅ สร้างผู้แต่งสำเร็จ: ${authorId}`);

    console.log('📚 กำลังสร้างนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');
    const whisperData = await createWhisper999Novel(authorId);
    console.log(`✅ สร้างนิยาย "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999" สำเร็จ:
    - นิยาย: ${whisperData.novel._id}
    - ตอน: ${whisperData.episodes.length} ตอน
    - ตัวละคร: ${whisperData.characters.length} ตัว
    - ตัวเลือก: ${whisperData.choices.length} ตัวเลือก
    - ฉาก: ${whisperData.scenes.length} ฉาก`);

    console.log('🎉 สร้างข้อมูลนิยายจำลองเสร็จสิ้น!');
    
    return {
      author: { _id: authorId },
      novel: whisperData.novel,
      episodes: whisperData.episodes,
      characters: whisperData.characters,
      choices: whisperData.choices,
      scenes: whisperData.scenes
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล:', error);
    throw error;
  }
};

export const runSeedWhisper999Data = async () => {
  try {
    await seedWhisper999Data();
    console.log('✅ Seeding script finished successfully.');
  } catch (error) {
    console.error('💥 การสร้างข้อมูลล้มเหลว:', error);
  } finally {
    // Disconnect after seeding
    await mongoose.disconnect();
    console.log('🚪 Database connection closed.');
    process.exit(0);
  }
};

if (require.main === module) {
  runSeedWhisper999Data();
}
