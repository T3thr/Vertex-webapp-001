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
    },
    {
        novelId,
        authorId,
        characterCode: 'pim',
        name: 'พิม',
        fullName: 'พิม',
        description: 'เพื่อนสนิทของนิราที่มาค้างคืนด้วย',
        age: '25',
        gender: 'female',
        roleInStory: 'supporting_character',
        colorTheme: '#EC4899', // A pinkish color
        expressions: [
          { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
          { expressionId: 'scared', name: 'หวาดกลัว', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
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
      actions: [{
          actionId: uuidv4(),
          type: ChoiceActionType.GO_TO_NODE,
          parameters: { targetNodeId: 'scene_clean_mirror_girl' }
      }],
      isMajorChoice: true,
      isArchived: false,
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_CALL',
      text: 'โทรหาเพื่อนสนิทเพื่อเล่าเรื่องบ้านและชวนมาค้าง',
      actions: [{
        actionId: uuidv4(),
        type: ChoiceActionType.GO_TO_NODE,
        parameters: { targetNodeId: 'scene_friend_arrival' }
      }],
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
          actionId: uuidv4(),
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
    },
    // New choices for the cleaning branch
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_INVESTIGATE_GIRL',
      text: '👧 ออกไปดูรอบบ้านว่าเด็กคนนั้นเป็นใคร',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_investigate_backyard' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_LOCK_EVERYTHING',
      text: '🚪 ล็อกประตูหน้าต่างทุกบานทันที',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_lock_everything' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_COVER_MIRRORS',
      text: '🪞 เอาผ้ามาปิดกระจกทั้งหมดในบ้าน',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_cover_mirrors' } }],
      isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_FOLLOW_LAUGH',
        text: '🏃‍♀️ วิ่งกลับเข้าบ้านไปหาเสียง',
        actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_follow_laugh_closet' } }],
        isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_BURN_PHOTO',
        text: '🔥 จุดไฟเผาภาพถ่าย',
        actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_burn_photo' } }],
        isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_CALL_POLICE_AGAIN',
        text: '☎️ โทรแจ้งตำรวจทันที',
        actions: [{
            actionId: uuidv4(),
            type: ChoiceActionType.END_NOVEL_BRANCH,
            parameters: {
                endingNodeId: 'ENDING_POLICE_FIND_NOTHING',
                outcomeDescription: 'ตำรวจมาถึง แต่ไม่พบร่องรอยใดๆ พวกเขาคิดว่าคุณแค่จินตนาการไปเองและกลับไป คุณเหลืออยู่กับความหวาดระแวงในบ้านเพียงลำพัง',
                endingTitle: 'ไม่มีอะไรในกอไผ่',
                endingType: 'NORMAL'
            }
        }],
        isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_SMASH_MIRRORS',
        text: '🔨 ทุบกระจกทั้งหมด',
        actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_smash_mirrors' } }],
        isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_PHOTOGRAPH_MIRRORS',
        text: '📸 ถ่ายรูปกระจกไว้เป็นหลักฐาน',
        actions: [{
            actionId: uuidv4(),
            type: ChoiceActionType.END_NOVEL_BRANCH,
            parameters: {
                endingNodeId: 'ENDING_PHOTO_SHOWS_NOTHING',
                outcomeDescription: 'คุณถ่ายรูปกระจก แต่ในภาพไม่มีอะไรผิดปกติ ไม่มีเด็กสาว ไม่มีเงาสะท้อนแปลกๆ คุณเริ่มไม่แน่ใจว่าสิ่งที่เห็นเป็นเรื่องจริงหรือไม่',
                endingTitle: 'ภาพลวงตา',
                endingType: 'NORMAL'
            }
        }],
        isMajorChoice: false,
    },
    {
        novelId, authorId, version: 1, choiceCode: 'CHOICE_LOCK_IN_BEDROOM',
        text: '🛏️ ปิดห้องนอน ล็อกตัวเองไว้ทั้งคืน',
        actions: [{
            actionId: uuidv4(),
            type: ChoiceActionType.END_NOVEL_BRANCH,
            parameters: {
                endingNodeId: 'ENDING_SAFE_FOR_NOW_AGAIN',
                outcomeDescription: 'คุณขังตัวเองในห้องนอนทั้งคืน ไม่มีอะไรเกิดขึ้น แต่คุณก็รู้ดีว่านี่เป็นเพียงการซื้อเวลาเท่านั้น... พรุ่งนี้คุณจะทำอย่างไรต่อไป?',
                endingTitle: 'ปลอดภัย...แค่คืนนี้',
                endingType: 'NORMAL'
            }
        }],
        isMajorChoice: false,
    },
    // === START: Modified choices for friend branch (as per user request) ===
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_INVESTIGATE_WITH_FRIEND',
      text: '🔦 ถือไฟฉายไปสำรวจรอบบ้านกับพิม',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_investigate_with_friend' } }],
      isMajorChoice: true,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_CALL_POLICE_FRIEND',
      text: '☎️ โทรหาตำรวจหรือเพื่อนบ้าน',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_call_police_friend' } }],
      isMajorChoice: true,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_READ_DIARY',
      text: '📖 เปิดไดอารี่เก่า ๆ ที่พบในห้องใต้บันไดมาตรวจดู',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_diary_revelation' } }], // Leads to new scene
      isMajorChoice: true,
    },
    // -- Choices for Path 1 (Investigate) -> 1st new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_OPEN_BASEMENT_DOOR',
      text: '🚪 เปิดประตูลงไปทันที',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_basement_doll' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_TAKE_PHOTO_BASEMENT',
      text: '📷 ถ่ายรูปไว้ก่อน',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_photo_glitch' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_SEAL_BASEMENT',
      text: '🧱 ปิดทางและไม่ยุ่งกับมันอีก',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_sealing_consequences' } }],
      isMajorChoice: false,
    },
    // -- Choices for Path 1.1 -> 2nd new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_INSPECT_DOLL',
      text: 'สำรวจตุ๊กตา',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_doll_locket' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_CHECK_ROCKING_CHAIR',
      text: 'ตรวจสอบเก้าอี้โยก',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_chair_writing' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_LEAVE_BASEMENT',
      text: 'รีบออกจากห้องใต้ดิน',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_basement_door_slams' } }],
      isMajorChoice: false,
    },
    // -- Choices for Path 2 (Call Police) -> 1st new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_WATCH_CCTV',
      text: '📺 เฝ้าจอทั้งคืนเพื่อรอดู',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_cctv_writing' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_GO_CHECK_EXTERIOR',
      text: '👁️‍🗨️ เดินออกไปดูรอบๆ บ้าน',
       actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_exterior_whisper' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_GO_TO_TEMPLE',
      text: '⛪ ไปนอนที่วัดชั่วคราว',
       actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_temple_unease' } }],
      isMajorChoice: false,
    },
    // -- Choices for Path 2.1 -> 2nd new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_GO_CHECK_CAMERA',
      text: 'ออกไปดูที่กล้อง',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_camera_empty' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_REWIND_CCTV',
      text: 'ย้อนดูฟุตเทจ',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_rewind_reveal' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_IGNORE_CCTV',
      text: 'ทำเป็นไม่สนใจแล้วนอนต่อ',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_ignore_knock' } }],
      isMajorChoice: false,
    },
    // -- Choices for Path 3 (Read Diary) -> 1st new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_CALL_KWANKHAO',
      text: 'ลองเรียกชื่อขวัญข้าว',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_kwankhao_appears_sad' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_FIND_KEEPSAKE',
      text: 'หาของดูต่างหน้าที่ขวัญข้าวอาจทิ้งไว้',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_find_locket_diary' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_COMFORT_PIM',
      text: 'ปลอบพิมแล้วชวนหนี',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_comfort_pim_leave' } }],
      isMajorChoice: false,
    },
    // -- Choices for Path 3.1 -> 2nd new choice set
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_PROMISE_TO_STAY',
      text: 'สัญญาว่าจะไม่ไปไหนอีก',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_promise_accepted' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_ASK_TO_MOVE_ON',
      text: 'ขอให้ขวัญข้าวไปสู่สุคติ',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_kwankhao_angry' } }],
      isMajorChoice: false,
    },
    {
      novelId, authorId, version: 1, choiceCode: 'CHOICE_APOLOGIZE_AND_LEAVE',
      text: 'ขอโทษแล้วบอกว่าจะต้องไป',
      actions: [{ actionId: uuidv4(), type: ChoiceActionType.GO_TO_NODE, parameters: { targetNodeId: 'scene_kwankhao_understands' } }],
      isMajorChoice: false,
    },
    // === END: Modified choices for friend branch ===
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
        background: { type: 'image', value: '/images/background/oldwoodbox.png', isOfficialMedia: true, fitMode: 'cover' },
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
        background: { type: 'image', value: '/images/background/cassetinbox.png', isOfficialMedia: true, fitMode: 'cover' },
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
        background: { type: 'image', value: '/images/background/cassetinbox.png', isOfficialMedia: true, fitMode: 'cover' },
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
        background: { type: 'image', value: '/images/background/BG257.png', isOfficialMedia: true, fitMode: 'cover' },
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
        background: { type: 'image', value: '/images/background/cassetinbox.png', isOfficialMedia: true, fitMode: 'cover' },
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
          { instanceId: 'narration_lock_door_shaking', type: 'narration', content: 'นิราตัวสั่น มือไม้เย็นเฉียบ สิ่งที่เธอเพิ่งเห็นใต้ประตูลับ — เงาคล้ายร่างเด็กผอมสูงที่เคลื่อนไหวเร็วผิดธรรมชาติ — มันยังคงลอยอยู่ในดวงตาเธอ' },
          { instanceId: 'narration_lock_door_slam', type: 'narration', content: 'เธอ กระแทก ฝาปิดบันไดใต้พื้นด้วยแรงทั้งหมดที่มี เสียง "ปึง!" ดังขึ้น และตามด้วยเสียงกระแทกเบา ๆ …จาก "ข้างใต้"' },
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
        textContents: [
          {
            instanceId: 'choice_prompt',
            type: 'narration',
            content: 'ตอนนี้คุณจะทำอะไร?',
          },
        ],
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
      },
      // === START: New scenes for the cleaning branch ===
      {
        novelId, episodeId, sceneOrder: 30, nodeId: 'scene_clean_mirror_girl', title: 'เงาในกระจก',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_clean_1', type: 'narration', content: 'หลังจากเปิดม่าน หน้าต่างบ้านก็ส่งแสงอ่อน ๆ เข้ามาเป็นครั้งแรกในรอบหลายปี นิราปัดฝุ่นเก้าอี้และโต๊ะ หยิบผ้ามาเช็ดกระจกเก่า' },
          { instanceId: 'narration_clean_2', type: 'narration', content: 'ทันใดนั้น...เธอสังเกตเห็น "เด็กหญิงผมยาวในชุดเดรสซีด" ยืนอยู่ข้างหลังหน้าต่าง จ้องมาที่เธอผ่านกระจก' },
          { instanceId: 'narration_clean_3', type: 'narration', content: 'เธอหันหลังกลับไปดูจริง ๆ — ไม่มีใครอยู่ที่นั่น นิราหัวเราะแห้ง ๆ คิดว่าคงเป็นเงาหรือจินตนาการ' },
          { instanceId: 'narration_clean_4', type: 'narration', content: 'แต่เมื่อเธอหันกลับไป...บนกระจกมีข้อความเขียนด้วยนิ้วว่า: "เล่นกับฉันไหม?"' },
        ],
        choiceIds: [choiceMap.CHOICE_INVESTIGATE_GIRL, choiceMap.CHOICE_LOCK_EVERYTHING, choiceMap.CHOICE_COVER_MIRRORS]
      },
      {
        novelId, episodeId, sceneOrder: 31, nodeId: 'scene_investigate_backyard', title: 'ตุ๊กตาและภาพถ่าย',
        background: { type: 'image', value: '/images/background/backyard.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_investigate_1', type: 'narration', content: 'นิราหยิบไม้กวาดเป็นอาวุธชั่วคราว แล้วเดินอ้อมไปหลังบ้าน ใต้ต้นไม้ใหญ่ เธอเห็น ตุ๊กตาผ้าขาด ๆ วางอยู่บนพื้น' },
          { instanceId: 'narration_investigate_2', type: 'narration', content: 'ข้างใต้ตุ๊กตา มีภาพถ่ายซีเปียเก่าฉบับหนึ่ง ในภาพเป็น "เด็กหญิงชุดซีด" ยืนคู่กับแม่ของเธอ...แต่ที่น่าขนลุกคือ เด็กคนนั้น หน้าเหมือนนิรา' },
          { instanceId: 'narration_investigate_3', type: 'narration', content: 'ก่อนที่เธอจะทำอะไรต่อ ได้ยินเสียงหัวเราะเด็ก...จากในบ้านของเธอเอง' },
        ],
        choiceIds: [choiceMap.CHOICE_FOLLOW_LAUGH, choiceMap.CHOICE_BURN_PHOTO, choiceMap.CHOICE_CALL_POLICE_AGAIN]
      },
      {
        novelId, episodeId, sceneOrder: 32, nodeId: 'scene_follow_laugh_closet', title: 'คำสัญญา',
        background: { type: 'image', value: '/images/background/closet.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_follow_laugh_1', type: 'narration', content: 'เสียงหัวเราะนั้นพาเธอไปที่ "ตู้เสื้อผ้าเก่า" ใต้บันได' },
          { instanceId: 'narration_follow_laugh_2', type: 'narration', content: 'เมื่อนิราเปิดตู้ พบ "เด็กหญิงชุดซีด" นั่งยอง ๆ อยู่' },
          { instanceId: 'narration_follow_laugh_3', type: 'narration', content: 'เด็กคนนั้นเงยหน้าขึ้นช้า ๆ แล้วพูดว่า: "เธอจำสัญญาไม่ได้เหรอ...แม่บอกว่าเธอต้องกลับมาเล่นกับฉันทุกชาติ"' },
          { instanceId: 'narration_follow_laugh_4', type: 'narration', content: 'เงามืดเริ่มกลืนผนังรอบตัว และเมื่อเธอพยายามวิ่งออกไป…บ้านก็ไม่มีประตูอีกต่อไป' },
        ],
        ending: {
          endingType: 'BAD', title: 'ซ่อนหาชั่วนิรันดร์',
          description: 'นิรากลายเป็นวิญญาณผู้เล่นในเกม "ซ่อนหา" ตลอดกาล คนใหม่ที่ย้ายเข้ามา มักจะฝันถึงเด็กหญิงชวนเล่นซ่อนหา และตื่นมาเจอกระจกเขียนว่า "นิราเล่นกับฉันแล้ว…ต่อไปคือคุณ"',
          endingId: 'bad_ending_hide_and_seek', imageUrl: '/images/background/closet.png'
        }
      },
      {
        novelId, episodeId, sceneOrder: 33, nodeId: 'scene_burn_photo', title: 'สัญญาเลือด',
        background: { type: 'image', value: '/images/background/fire.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_burn_photo_1', type: 'narration', content: 'เปลวไฟกินภาพถ่ายอย่างรวดเร็ว เสียงกรีดร้องของเด็กหญิงดังมาจากทุกทิศ' },
          { instanceId: 'narration_burn_photo_2', type: 'narration', content: 'เธอคิดว่าทุกอย่างจบลงแล้ว...แต่เมื่อเธอกลับเข้าบ้าน ภาพถ่ายใบเดิมยังวางอยู่บนโต๊ะ พร้อมข้อความใหม่: "เผาภาพ…แต่ไม่เคยเผาสัญญาได้"' },
          { instanceId: 'narration_burn_photo_3', type: 'narration', content: 'คืนนั้น ตุ๊กตาที่เธอเห็น...มาอยู่บนเตียงเธอ พร้อมเสียงกระซิบว่า: "สัญญาเลือดจะไม่มีวันตาย..."' },
        ],
        ending: {
          endingType: 'BAD', title: 'เพื่อนใหม่',
          description: 'นิรากลายเป็นคนละคน เธอออกจากบ้านในวันรุ่งขึ้น และหายสาบสูญ มีคนเห็นเธอในกล้องวงจรปิดของบ้านอื่น…เดินจับมือกับเด็กหญิงไม่มีหน้า',
          endingId: 'bad_ending_blood_promise', imageUrl: '/images/background/fire.png'
        }
      },
      {
        novelId, episodeId, sceneOrder: 34, nodeId: 'scene_lock_everything', title: 'เงาสะท้อน',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_lock_everything_1', type: 'narration', content: 'นิราเริ่มรู้สึกไม่ปลอดภัย เธอจึงล็อกหน้าต่าง ประตู และช่องลม จนแน่ใจว่าทุกอย่างปิดตาย' },
          { instanceId: 'narration_lock_everything_2', type: 'narration', content: 'แต่ตอนเธอกลับมาที่ห้องนั่งเล่น เธอพบว่า "กระจกทุกบานเปิดออกอีกครั้ง"…เอง' },
          { instanceId: 'narration_lock_everything_3', type: 'narration', content: 'และที่น่ากลัวคือ ทุกกระจกสะท้อน “เด็กหญิงยืนอยู่ข้างเธอ” แม้ว่าในความเป็นจริงเธออยู่คนเดียว' },
        ],
        choiceIds: [choiceMap.CHOICE_SMASH_MIRRORS, choiceMap.CHOICE_PHOTOGRAPH_MIRRORS, choiceMap.CHOICE_LOCK_IN_BEDROOM]
      },
      {
        novelId, episodeId, sceneOrder: 35, nodeId: 'scene_smash_mirrors', title: 'เศษแก้ว',
        background: { type: 'image', value: '/images/background/broken_mirror.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_smash_mirrors_1', type: 'narration', content: 'เสียงกระจกแตกดังก้องทั่วบ้าน แต่แทนที่จะเงียบลง…เสียงร้องไห้ของเด็กก็ดังขึ้นแทนจากในทุกกำแพง' },
          { instanceId: 'narration_smash_mirrors_2', type: 'narration', content: '"แม่บอกว่าเธอจะดูแลกระจกให้ดี..."' },
          { instanceId: 'narration_smash_mirrors_3', type: 'narration', content: 'ผนังเริ่มมีรอยแตก... เด็กหญิง "ปีนออกมาจากรอยร้าว" และเดินเข้าหานิราท่ามกลางเสียงกระจกป่น' },
        ],
        ending: {
          endingType: 'BAD', title: 'กระจกของฉัน',
          description: 'นิราเหลือเพียงเลือดไหลเป็นทางถึงหน้ากระจกสุดท้าย กระจกเงาบานเดียวที่ไม่แตก…สะท้อนภาพเด็กหญิงยิ้ม พร้อมเสียงกระซิบว่า "กระจกเธออยู่กับฉันแล้ว..."',
          endingId: 'bad_ending_smashed_reflection', imageUrl: '/images/background/broken_mirror.png'
        }
      },
      {
        novelId, episodeId, sceneOrder: 36, nodeId: 'scene_cover_mirrors', title: 'ภาพในกระจก',
        background: { type: 'image', value: '/images/background/covered_mirror.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_cover_mirrors_1', type: 'narration', content: 'นิราใช้ผ้าห่มเก่าและผ้าม่านปิดกระจกทั่วบ้าน เธอคิดว่าหากไม่เห็นเงา ทุกอย่างจะสงบ...' },
          { instanceId: 'narration_cover_mirrors_2', type: 'narration', content: 'และมันได้ผล—คืนแรกไม่มีอะไรเกิดขึ้น แต่คืนที่สอง มี "เสียงลากผ้าม่าน" ทีละบาน...' },
          { instanceId: 'narration_cover_mirrors_3', type: 'narration', content: 'เมื่อเธอออกมาดูในเช้า…กระจกทุกบานถูกเปิดออกอีกครั้ง แต่เธอไม่เห็นตัวเองในกระจกอีกเลย' },
        ],
        ending: {
          endingType: 'BAD', title: 'คนในกระจก',
          description: 'นิรากลายเป็นสิ่งที่สะท้อนอยู่ “ด้านใน” ของกระจก ทุกคนที่ยืนหน้ากระจกในบ้านหลังนี้ จะเห็นเธอยืนอยู่ข้างหลัง',
          endingId: 'bad_ending_trapped_in_reflection', imageUrl: '/images/background/covered_mirror.png'
        }
      },
      // === END: New scenes for the cleaning branch ===

      // === START: Modified friend branch scenes ===
      {
        novelId, episodeId, sceneOrder: 37, nodeId: 'scene_friend_arrival', title: 'เพื่อนมาถึง',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        characters: [
          { instanceId: 'nira_char', characterId: characterMap.nira, expressionId: 'normal', transform: { positionX: -50 }, isVisible: true },
          { instanceId: 'pim_char', characterId: characterMap.pim, expressionId: 'normal', transform: { positionX: 50 }, isVisible: true },
        ],
        textContents: [
          { instanceId: 'narration_friend_1', type: 'narration', content: 'นิราโทรหาเพื่อนสนิทชื่อ พิม ชักชวนให้มาค้างที่บ้านเลขที่ 9 แม้พิมจะลังเลเพราะข่าวลือรอบบ้านนี้ แต่สุดท้ายก็ยอมมา' },
          { instanceId: 'dialogue_pim_1', type: 'dialogue', characterId: characterMap.pim, speakerDisplayName: 'พิม', content: '“ถ้าเจอผีจริง จะได้ถามว่า…ผีเธออยู่นี่มานานยัง”' },
          { instanceId: 'narration_friend_2', type: 'narration', content: 'ทั้งสองหัวเราะกันสนุก จนราวตีหนึ่ง ไฟในบ้านดับวูบไป พร้อมเสียงบางอย่าง เคาะเบา ๆ ที่หน้าต่าง “แกร๊ง... แกร๊ง... แกร๊ง...”' },
          { instanceId: 'dialogue_pim_2', type: 'dialogue', characterId: characterMap.pim, speakerDisplayName: 'พิม', content: '“มีเด็กอะไรอยู่หน้าบ้านเธออะนิรา…?”', expressionId: 'scared' },
          { instanceId: 'narration_friend_3', type: 'narration', content: 'นิราใจเย็นพอจะเดินไปเปิดผ้าม่านดู แต่จู่ ๆ พิมจับแขนเธอแน่น พร้อมพูดเสียงสั่น: “มะ…เมื่อกี้เด็กมันยิ้มให้ แล้วมันก็เดินผ่านหน้าต่างเข้าไปทางหลังบ้าน…”' },
        ],
        choiceIds: [choiceMap.CHOICE_INVESTIGATE_WITH_FRIEND, choiceMap.CHOICE_CALL_POLICE_FRIEND, choiceMap.CHOICE_READ_DIARY]
      },
      // === Path 1: Investigate with Pim ===
      {
        novelId, episodeId, sceneOrder: 38, nodeId: 'scene_investigate_with_friend', title: 'รอยเล็บที่ผนัง',
        background: { type: 'image', value: '/images/background/backyard.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_investigate_friend_1', type: 'narration', content: 'ทั้งคู่ค่อย ๆ เดินไปยังหลังบ้าน เจอประตูเปิดแง้มอยู่เบา ๆ... เมื่อเดินผ่านเข้าไป พิมก็ชี้ไปที่ “ผนังไม้” ใกล้ตู้เก่า' },
          { instanceId: 'dialogue_pim_3', type: 'dialogue', characterId: characterMap.pim, speakerDisplayName: 'พิม', content: '“นิรา…ดูนี่สิ…”' },
          { instanceId: 'narration_investigate_friend_2', type: 'narration', content: 'ผนังมี รอยเล็บขูดเป็นทางยาว และประตูไม้เล็ก ๆ ที่เหมือนซ่อนทางลงใต้ดิน' },
        ],
        choiceIds: [choiceMap.CHOICE_OPEN_BASEMENT_DOOR, choiceMap.CHOICE_TAKE_PHOTO_BASEMENT, choiceMap.CHOICE_SEAL_BASEMENT]
      },
      // Path 1.1: Open Basement
      {
        novelId, episodeId, sceneOrder: 39, nodeId: 'scene_basement_doll', title: 'ตุ๊กตาพอร์ซเลน',
        background: { type: 'image', value: '/images/background/basement.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_basement_doll_1', type: 'narration', content: 'พวกเขาลงไปในห้องใต้ดินที่ชื้นและเหม็นอับ ตรงมุมห้องมีเก้าอี้โยกสำหรับเด็กกำลังโยกไปมาเบาๆ บนเก้าอี้มีตุ๊กตาพอร์ซเลนที่ตาข้างหนึ่งแตกร้าว...' },
            { instanceId: 'narration_basement_doll_2', type: 'narration', content: 'เสียงเพลงจากกล่องดนตรีแผ่วเบาดังออกมาจากตัวตุ๊กตา' },
        ],
        choiceIds: [choiceMap.CHOICE_INSPECT_DOLL, choiceMap.CHOICE_CHECK_ROCKING_CHAIR, choiceMap.CHOICE_LEAVE_BASEMENT]
      },
      {
        novelId, episodeId, sceneOrder: 40, nodeId: 'scene_doll_locket', title: 'คำสัญญาในล็อกเก็ต',
        background: { type: 'image', value: '/images/background/basement.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'BAD', title: 'เล่นด้วยกันตลอดไป',
            description: 'นิราหยิบล็อกเก็ตรูปหัวใจขึ้นมาเปิด ข้างในเป็นรูปของเธอกับขวัญข้าวในวัยเด็ก ทันใดนั้นตาของตุ๊กตาก็ส่องแสงสีแดง เสียงเด็กกระซิบว่า "ทีนี้พี่ต้องอยู่เล่นกับหนูตลอดไปแล้วนะ" ประตูห้องใต้ดินปิดลงทันที',
            endingId: 'ending_locket_memory'
        }
      },
      {
        novelId, episodeId, sceneOrder: 41, nodeId: 'scene_chair_writing', title: 'คำเตือนที่ถูกทิ้งไว้',
        background: { type: 'image', value: '/images/background/basement.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'NORMAL', title: 'คำเตือนที่แตกสลาย',
            description: 'พิมหยุดเก้าอี้โยกและพบบางอย่างที่แกะสลักไว้ข้างใต้: "หนีไป" ทันใดนั้น ตุ๊กตากรีดร้องและลอยไปกระแทกกำแพงจนแตกกระจาย พวกเขาวิ่งหนีออกจากบ้านอย่างไม่คิดชีวิต แต่ก็ยังสงสัยว่าใครหรืออะไรพยายามจะเตือนพวกเขา',
            endingId: 'ending_shattered_warning'
        }
      },
      {
        novelId, episodeId, sceneOrder: 42, nodeId: 'scene_basement_door_slams', title: 'รอดอย่างหวุดหวิด',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'NORMAL', title: 'รอดอย่างหวุดหวิด',
            description: 'เมื่อตัดสินใจว่ามันเสี่ยงเกินไป พวกเขาก็รีบกลับขึ้นมา แต่ประตูห้องใต้ดินก็ปิดกระแทกตามหลังเสียงดังสนั่น! พวกเขารีบเอาของมาขวางประตูและขดตัวอยู่ด้วยกันทั้งคืน รอให้เช้ามาถึงเพื่อที่จะได้หนีไปจากที่นี่',
            endingId: 'ending_narrow_escape'
        }
      },
       // Path 1.2: Take Photo
       {
        novelId, episodeId, sceneOrder: 43, nodeId: 'scene_photo_glitch', title: 'ภาพถ่ายติดวิญญาณ',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_photo_glitch_1', type: 'narration', content: 'นิราถ่ายรูปประตูใต้ดิน แต่เมื่อดูภาพในมือถือ... ภาพกลับบิดเบี้ยวและมี "หน้าของเด็กผู้หญิง" ซ้อนทับอยู่' },
        ],
        ending: { // This branch ends here as requested by original file structure logic
            endingType: 'BAD', title: 'อีกคนต้องอยู่',
            description: 'นิรากับพิมพยายามลบรูป แต่โทรศัพท์ของพิม ระเบิดไฟลุก เธอถูกไฟคลอก และนิราก็ได้ยินเสียงจากกระจกมือถือว่า “อีกคน…ต้องอยู่เล่นกับฉัน”',
            endingId: 'bad_ending_one_must_stay', imageUrl: '/images/background/fire.png'
        }
      },
       // Path 1.3: Seal Basement
       {
        novelId, episodeId, sceneOrder: 44, nodeId: 'scene_sealing_consequences', title: 'ผลของการปิดผนึก',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_seal_1', type: 'narration', content: 'นิราเอากระดานไม้ตอกปิดทางทันที พิมแอบบ่นว่าเสียดาย แต่ก็ยอม' },
            { instanceId: 'narration_seal_2', type: 'narration', content: 'คืนนั้นไม่มีอะไรผิดปกติ แต่ในฝันของทั้งคู่...เด็กหญิงผมยาวมากระซิบข้างหูว่า: “เธอปิดบ้านไว้...แต่ไม่ได้ปิดสัญญา”' },
        ],
        ending: { // This branch ends here as requested by original file structure logic
            endingType: 'BAD', title: 'ไปเล่นกับเพื่อน',
            description: 'หลังจากนั้นหนึ่งอาทิตย์ พิมเริ่มพูดกับใครบางคนในห้องที่ว่างเปล่า และจู่ ๆ ก็หายตัวไปกลางวันแสก ๆ ในบ้าน นิราพบแค่กระดาษแผ่นหนึ่งวางอยู่บนเตียงเขียนว่า: “หนูไปเล่นกับเพื่อนแล้วค่ะ”',
            endingId: 'bad_ending_gone_to_play', imageUrl: '/images/background/emptychair.png'
        }
      },
      // === Path 2: Call Police ===
      {
        novelId, episodeId, sceneOrder: 45, nodeId: 'scene_call_police_friend', title: 'เฝ้าดู',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_police_friend_1', type: 'narration', content: 'เจ้าหน้าที่มาดูที่บ้าน ทุกอย่างดูปกติ ไม่มีร่องรอยบุกรุก แต่เมื่อตรวจกล้องวงจรปิด (ที่นิราติดไว้ใหม่) กลับเห็น "เด็กหญิงคนหนึ่ง" ยืนอยู่หน้าประตูตลอดทั้งคืน' },
            { instanceId: 'narration_police_friend_2', type: 'narration', content: 'เธอ ไม่เคยขยับ เพียงยืนนิ่ง ๆ มองเข้าไปในบ้าน' },
        ],
        choiceIds: [choiceMap.CHOICE_WATCH_CCTV, choiceMap.CHOICE_GO_CHECK_EXTERIOR, choiceMap.CHOICE_GO_TO_TEMPLE]
      },
       // Path 2.1: Watch CCTV
       {
        novelId, episodeId, sceneOrder: 46, nodeId: 'scene_cctv_writing', title: 'ข้อความบนเลนส์',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
          { instanceId: 'narration_cctv_writing_1', type: 'narration', content: 'พวกเขานั่งดูภาพจากกล้อง เด็กหญิงคนนั้นยืนนิ่งอยู่เป็นชั่วโมง จากนั้นเธอก็ค่อยๆ ยกนิ้วขึ้นมาเขียนอะไรบางอย่างบนเลนส์กล้อง ไอน้ำที่เกาะทำให้เห็นคำว่า: "สัญญา"' },
        ],
        choiceIds: [choiceMap.CHOICE_GO_CHECK_CAMERA, choiceMap.CHOICE_REWIND_CCTV, choiceMap.CHOICE_IGNORE_CCTV]
      },
      {
        novelId, episodeId, sceneOrder: 47, nodeId: 'scene_camera_empty', title: 'สัญญาที่เย็นยะเยือก',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'BAD', title: 'สัญญาที่เย็นยะเยือก',
            description: 'พวกเขาออกไปดูแต่ไม่พบใคร ไม่มีรอยคำบนเลนส์ แต่เมื่อกลับเข้ามาในบ้าน กระจกทุกบานก็มีฝ้าขึ้นเป็นคำว่า "สัญญา" พิมลองแตะดูและถูกดึงเข้าไปในกระจก นิราถูกทิ้งให้อยู่ลำพังกับเสียงกรีดร้องเงียบๆ ของเพื่อนจากในกระจก',
            endingId: 'ending_cold_promise'
        }
      },
      {
        novelId, episodeId, sceneOrder: 48, nodeId: 'scene_rewind_reveal', title: 'เงาสะท้อนในอนาคต',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'BAD', title: 'เงาสะท้อนในอนาคต',
            description: 'เมื่อย้อนดูวิดีโอ พวกเขาสังเกตเห็นเงาสะท้อนบนเลนส์กล้อง มันไม่ใช่เงาของเด็กหญิง แต่เป็นนิราในเวอร์ชั่นที่แก่และน่ากลัวกว่า ทันใดนั้นภาพก็ตัดมาที่ปัจจุบัน แต่มีร่างที่น่ากลัวนั้นยืนอยู่ข้างหลังพวกเขาแล้ว',
            endingId: 'ending_future_self'
        }
      },
      {
        novelId, episodeId, sceneOrder: 49, nodeId: 'scene_ignore_knock', title: 'เสียงเคาะที่ไม่สิ้นสุด',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'NORMAL', title: 'เสียงเคาะที่ไม่สิ้นสุด',
            description: 'พวกเขาปิดจอและขังตัวเองอยู่ในห้องนอน แต่ไม่นานก็มีเสียงเคาะประตูเบาๆ และต่อเนื่อง เสียงเคาะดังอยู่ทั้งคืนและหยุดลงในตอนเช้า พวกเขารู้ว่ามันยังไม่จบ มันแค่รอเวลาเท่านั้น',
            endingId: 'ending_endless_knock'
        }
      },
      // === Path 3: Read Diary ===
      {
        novelId, episodeId, sceneOrder: 50, nodeId: 'scene_diary_revelation', title: 'ขวัญข้าว',
        background: { type: 'image', value: '/images/background/diary.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_diary_1', type: 'narration', content: 'นิราพบสมุดจดที่ดูเหมือนเขียนด้วยลายมือเด็ก หน้าแรกเขียนว่า: “หนูชื่อขวัญข้าวค่ะ ถ้าหนูหายไป...แปลว่าพี่ไม่เล่นด้วยแล้ว”' },
            { instanceId: 'narration_diary_2', type: 'narration', content: 'หน้าถัดไปเป็นภาพวาดเด็กผู้หญิง 2 คนจับมือกัน หนึ่งในนั้นหน้าเหมือนนิราในวัยเด็ก' },
            { instanceId: 'narration_diary_3', type: 'narration', content: 'นิราเริ่มจำได้…เธอเคยมาที่บ้านนี้กับครอบครัวตอนอายุ 5 ขวบ และมีเพื่อนเล่นคนหนึ่ง...ที่เธอลืมไปสนิท' },
            { instanceId: 'narration_diary_4', type: 'narration', content: '“หนูอยู่ตรงนี้ตลอดนะพี่นิรา” เสียงกระซิบดังขึ้นรอบตัว' },
        ],
        choiceIds: [choiceMap.CHOICE_CALL_KWANKHAO, choiceMap.CHOICE_FIND_KEEPSAKE, choiceMap.CHOICE_COMFORT_PIM]
      },
      // Path 3.1: Call Kwankhao's name
      {
        novelId, episodeId, sceneOrder: 51, nodeId: 'scene_kwankhao_appears_sad', title: 'การปรากฏตัว',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        textContents: [
            { instanceId: 'narration_kwankhao_appears_1', type: 'narration', content: 'นิรารวบรวมความกล้าและเรียกชื่อ "ขวัญข้าว... พี่ขอโทษที่ลืม" ร่างโปร่งแสงของเด็กหญิงปรากฏขึ้นที่บันได เธอดูเศร้ามาก "พี่ทิ้งหนูไป" เธอพูดเสียงแผ่ว' },
        ],
        choiceIds: [choiceMap.CHOICE_PROMISE_TO_STAY, choiceMap.CHOICE_ASK_TO_MOVE_ON, choiceMap.CHOICE_APOLOGIZE_AND_LEAVE]
      },
      {
        novelId, episodeId, sceneOrder: 52, nodeId: 'scene_promise_accepted', title: 'กลับมาเล่นด้วยกัน',
        background: { type: 'image', value: '/images/background/goodend.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'TRUE', title: 'กลับมาเล่นด้วยกัน',
            description: 'นิราสัญาว่าจะไม่ไปไหนอีก รอยยิ้มปรากฏบนใบหน้าของขวัญข้าว ความหนาวเย็นในบ้านหายไป และร่างของเธอก็ค่อยๆ จางหายไปอย่างสงบ นิราตัดสินใจอยู่ที่บ้านหลังนี้ต่อและรู้สึกถึงการมีอยู่ของเพื่อนเก่าเสมอ',
            endingId: 'true_ending_reunited'
        }
      },
      {
        novelId, episodeId, sceneOrder: 53, nodeId: 'scene_kwankhao_angry', title: 'สัญญาที่แตกสลาย',
        background: { type: 'image', value: '/images/background/badend1.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'BAD', title: 'สัญญาที่แตกสลาย',
            description: '"ไปสู่สุคติเหรอ? แล้วสัญญาล่ะ!" ใบหน้าของขวัญข้าวบิดเบี้ยวด้วยความโกรธ บ้านทั้งหลังเริ่มสั่นไหวอย่างรุนแรงและพังทลายลงมา',
            endingId: 'ending_broken_promise'
        }
      },
      {
        novelId, episodeId, sceneOrder: 54, nodeId: 'scene_kwankhao_understands', title: 'การจากลาอันแสนเศร้า',
        background: { type: 'image', value: '/images/background/home.png', isOfficialMedia: true, fitMode: 'cover' },
        ending: {
            endingType: 'GOOD', title: 'การจากลาอันแสนเศร้า',
            description: 'นิราขอโทษอย่างจริงใจและอธิบายว่าเธออยู่ไม่ได้ ขวัญข้าวร้องไห้แต่ก็พยักหน้ายอมรับ "ไปเถอะ...แต่อย่าลืมหนูอีกนะ" วิญญาณของเธอหายไป ทิ้งไว้เพียงความเศร้าแต่ก็รู้สึกถึงการปลดปล่อย นิราขายบ้านหลังนั้นแต่จะกลับมาวางดอกไม้ทุกปี',
            endingId: 'ending_bittersweet_goodbye'
        }
      }
      // === END: Modified friend branch scenes ===
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

  ];

  // อัปเดต defaultNextSceneId
  console.log('🔗 กำลังเชื่อมต่อ scenes...');
  for (const update of sceneUpdates) {
    const fromSceneId = sceneNodeIdMap[update.from];
    const toSceneId = sceneNodeIdMap[update.to];

    if (fromSceneId && toSceneId) {
      // Find the source scene to check if it has choices
      const fromScene = savedScenes.find(s => s._id.toString() === fromSceneId);
      if (fromScene && (!fromScene.choiceIds || fromScene.choiceIds.length === 0)) {
        await SceneModel.findByIdAndUpdate(fromSceneId, {
          defaultNextSceneId: new mongoose.Types.ObjectId(toSceneId)
        });
      }
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
const createWhisper999StoryMap = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId, choices: any[]) => {
  console.log('📊 กำลังสร้าง StoryMap สำหรับ "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...');

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

    // Scene Nodes
    
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
    // ... (other existing nodes)
    {
      nodeId: 'scene_first_choice',
      nodeId: nodeIdMapping['scene_key_exchange'],
      nodeType: StoryMapNodeType.SCENE_NODE,
      title: 'การตัดสินใจแรก',
      position: { x: 600, y: 300 },
      nodeSpecificData: { sceneId: 'scene_first_choice' },
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
      nodeId: 'choice_first_decision',
      nodeType: StoryMapNodeType.CHOICE_NODE,
      title: 'ทางเลือกแรก',
      position: { x: 800, y: 300 },
      nodeSpecificData: {
        choiceIds: ['CHOICE_EXPLORE', 'CHOICE_CLEAN', 'CHOICE_CALL'],
        promptText: 'ตอนนี้คุณจะทำอะไรเป็นอย่างแรก?'
      }
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
        nodeId: 'scene_explore_downstairs_1',
        nodeType: StoryMapNodeType.SCENE_NODE,
        title: 'สำรวจชั้นล่าง',
        position: { x: 1000, y: 100 },
        nodeSpecificData: { sceneId: 'scene_explore_downstairs_1' },
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
        nodeId: 'scene_clean_mirror_girl',
        nodeType: StoryMapNodeType.SCENE_NODE,
        title: 'เงาในกระจก',
        position: { x: 1000, y: 500 },
        nodeSpecificData: { sceneId: 'scene_clean_mirror_girl' },
    },

    // === START: Modified Friend Branch Map ===
    {
      nodeId: 'scene_friend_arrival', nodeType: StoryMapNodeType.SCENE_NODE, title: 'เพื่อนมาถึง',
      position: { x: 1500, y: 300 }, nodeSpecificData: { sceneId: 'scene_friend_arrival' }
    },
    {
      nodeId: 'choice_friend_knock', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'เด็กที่หน้าต่าง',
      position: { x: 1700, y: 300 },
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
        choiceIds: ['CHOICE_INVESTIGATE_WITH_FRIEND', 'CHOICE_CALL_POLICE_FRIEND', 'CHOICE_READ_DIARY'],
        promptText: 'เด็กคนนั้นหายไปทางหลังบ้าน... คุณจะทำอย่างไร?'
      }
    },

    // Path 1: Investigate
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
      nodeId: 'scene_investigate_with_friend', nodeType: StoryMapNodeType.SCENE_NODE, title: 'รอยเล็บที่ผนัง',
      position: { x: 1900, y: 100 }, nodeSpecificData: { sceneId: 'scene_investigate_with_friend' }
    },
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
      nodeId: 'choice_basement_door', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'ประตูสู่ใต้ดิน',
      position: { x: 2100, y: 100 },
      nodeSpecificData: {
        choiceIds: ['CHOICE_OPEN_BASEMENT_DOOR', 'CHOICE_TAKE_PHOTO_BASEMENT', 'CHOICE_SEAL_BASEMENT'],
        promptText: 'คุณพบประตูลับใต้ดิน... คุณจะทำอย่างไร?'
      }
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
      nodeId: 'scene_basement_doll', nodeType: StoryMapNodeType.SCENE_NODE, title: 'ตุ๊กตาพอร์ซเลน',
      position: { x: 2300, y: 0 }, nodeSpecificData: { sceneId: 'scene_basement_doll' }
    },
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
      nodeId: 'choice_doll_options', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'การตัดสินใจกับตุ๊กตา',
      position: { x: 2500, y: 0 },
      nodeId: nodeIdMapping['choice_tape_decision'],
      nodeType: StoryMapNodeType.CHOICE_NODE,
      title: 'การตัดสินใจกับเทป',
      position: { x: START_X + TIER_SPACING * 10, y: START_Y - NODE_SPACING },
      nodeSpecificData: {
        choiceIds: ['CHOICE_INSPECT_DOLL', 'CHOICE_CHECK_ROCKING_CHAIR', 'CHOICE_LEAVE_BASEMENT'],
        promptText: 'คุณจะทำอย่างไรกับตุ๊กตา?'
      }
    },
    {
      nodeId: 'ending_locket_memory', nodeType: StoryMapNodeType.ENDING_NODE, title: 'เล่นด้วยกันตลอดไป',
      position: { x: 2700, y: -50 }, nodeSpecificData: { endingSceneId: 'scene_doll_locket' }
    },
    {
      nodeId: 'ending_shattered_warning', nodeType: StoryMapNodeType.ENDING_NODE, title: 'คำเตือนที่แตกสลาย',
      position: { x: 2700, y: 50 }, nodeSpecificData: { endingSceneId: 'scene_chair_writing' }
    },
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
      nodeId: 'ending_narrow_escape', nodeType: StoryMapNodeType.ENDING_NODE, title: 'รอดอย่างหวุดหวิด',
      position: { x: 2700, y: 150 }, nodeSpecificData: { endingSceneId: 'scene_basement_door_slams' }
    },

    // Path 2: Call Police
    {
      nodeId: 'scene_call_police_friend', nodeType: StoryMapNodeType.SCENE_NODE, title: 'เฝ้าดู',
      position: { x: 1900, y: 300 }, nodeSpecificData: { sceneId: 'scene_call_police_friend' }
    },
    {
      nodeId: 'choice_cctv_girl', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'เด็กหญิงในกล้อง',
      position: { x: 2100, y: 300 },
      nodeId: nodeIdMapping['ending_bad_1'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'เสียงสุดท้าย',
      position: { x: START_X + TIER_SPACING * 11, y: START_Y - NODE_SPACING * 2 },
      nodeSpecificData: {
        choiceIds: ['CHOICE_WATCH_CCTV', 'CHOICE_GO_CHECK_EXTERIOR', 'CHOICE_GO_TO_TEMPLE'],
        promptText: 'กล้องวงจรปิดเห็นเด็กหญิงยืนนิ่งอยู่หน้าบ้าน... คุณจะทำอย่างไร?'
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
      nodeId: 'scene_cctv_writing', nodeType: StoryMapNodeType.SCENE_NODE, title: 'ข้อความบนเลนส์',
      position: { x: 2300, y: 250 }, nodeSpecificData: { sceneId: 'scene_cctv_writing' }
    },
    {
      nodeId: 'choice_cctv_options', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'การตัดสินใจกับข้อความ',
      position: { x: 2500, y: 250 },
      nodeId: nodeIdMapping['ending_cliffhanger_3am'],
      nodeType: StoryMapNodeType.ENDING_NODE,
      title: 'คำท้าทายตอนตีสาม',
      position: { x: START_X + TIER_SPACING * 11, y: START_Y - NODE_SPACING },
      nodeSpecificData: {
        choiceIds: ['CHOICE_GO_CHECK_CAMERA', 'CHOICE_REWIND_CCTV', 'CHOICE_IGNORE_CCTV'],
        promptText: 'คุณจะทำอย่างไร?'
      }
    },
    {
      nodeId: 'ending_cold_promise', nodeType: StoryMapNodeType.ENDING_NODE, title: 'สัญญาที่เย็นยะเยือก',
      position: { x: 2700, y: 200 }, nodeSpecificData: { endingSceneId: 'scene_camera_empty' }
    },
    {
      nodeId: 'ending_future_self', nodeType: StoryMapNodeType.ENDING_NODE, title: 'เงาสะท้อนในอนาคต',
      position: { x: 2700, y: 300 }, nodeSpecificData: { endingSceneId: 'scene_rewind_reveal' }
    },
    {
      nodeId: 'ending_endless_knock', nodeType: StoryMapNodeType.ENDING_NODE, title: 'เสียงเคาะที่ไม่สิ้นสุด',
      position: { x: 2700, y: 400 }, nodeSpecificData: { endingSceneId: 'scene_ignore_knock' }
    },

    // Path 3: Read Diary
    {
      nodeId: 'scene_diary_revelation', nodeType: StoryMapNodeType.SCENE_NODE, title: 'ขวัญข้าว',
      position: { x: 1900, y: 500 }, nodeSpecificData: { sceneId: 'scene_diary_revelation' }
    },
    {
      nodeId: 'choice_diary_options', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'เมื่อความทรงจำกลับมา',
      position: { x: 2100, y: 500 },
      nodeSpecificData: {
        choiceIds: ['CHOICE_CALL_KWANKHAO', 'CHOICE_FIND_KEEPSAKE', 'CHOICE_COMFORT_PIM'],
        promptText: 'เมื่อจำขวัญข้าวได้แล้ว คุณจะทำอย่างไร?'
      }
    },
    {
      nodeId: 'scene_kwankhao_appears_sad', nodeType: StoryMapNodeType.SCENE_NODE, title: 'การปรากฏตัว',
      position: { x: 2300, y: 450 }, nodeSpecificData: { sceneId: 'scene_kwankhao_appears_sad' }
    },
    {
      nodeId: 'choice_kwankhao_options', nodeType: StoryMapNodeType.CHOICE_NODE, title: 'เผชิญหน้ากับขวัญข้าว',
      position: { x: 2500, y: 450 },
      nodeSpecificData: {
        choiceIds: ['CHOICE_PROMISE_TO_STAY', 'CHOICE_ASK_TO_MOVE_ON', 'CHOICE_APOLOGIZE_AND_LEAVE'],
        promptText: 'คุณจะพูดอะไรกับขวัญข้าว?'
      }
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
      nodeId: 'ending_reunited', nodeType: StoryMapNodeType.ENDING_NODE, title: 'กลับมาเล่นด้วยกัน',
      position: { x: 2700, y: 400 }, nodeSpecificData: { endingSceneId: 'scene_promise_accepted' }
    },
    {
      nodeId: 'ending_broken_promise', nodeType: StoryMapNodeType.ENDING_NODE, title: 'สัญญาที่แตกสลาย',
      position: { x: 2700, y: 500 }, nodeSpecificData: { endingSceneId: 'scene_kwankhao_angry' }
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
      nodeId: 'ending_bittersweet_goodbye', nodeType: StoryMapNodeType.ENDING_NODE, title: 'การจากลาอันแสนเศร้า',
      position: { x: 2700, y: 600 }, nodeSpecificData: { endingSceneId: 'scene_kwankhao_understands' }
    }
    // === END: Modified Friend Branch Map ===
  ];

  // กำหนด Edges (การเชื่อมโยง)
  const edges: IStoryMapEdge[] = [
    { edgeId: uuidv4(), sourceNodeId: 'start_whisper999', targetNodeId: 'scene_arrival', label: 'เริ่มต้นเรื่องราว' },
    { edgeId: uuidv4(), sourceNodeId: 'scene_arrival', targetNodeId: 'scene_first_choice', label: 'ต่อไป' },
    { edgeId: uuidv4(), sourceNodeId: 'scene_first_choice', targetNodeId: 'choice_first_decision', label: 'เผชิญหน้ากับการตัดสินใจ' },
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
        sourceNodeId: 'choice_first_decision',
        targetNodeId: 'scene_explore_downstairs_1',
        triggeringChoiceId: choiceCodeToId['CHOICE_EXPLORE'],
        label: 'สำรวจบ้าน'
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
        sourceNodeId: 'choice_first_decision',
        targetNodeId: 'scene_clean_mirror_girl',
        triggeringChoiceId: choiceCodeToId['CHOICE_CLEAN'],
        label: 'ทำความสะอาด'
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
    // ... (other existing edges)

    // === START: Modified Friend Branch Edges ===
    
    // === เส้นทางสำรวจ (Exploration Path) ===
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_first_decision',
      targetNodeId: 'scene_friend_arrival', triggeringChoiceId: choiceCodeToId['CHOICE_CALL'], label: 'โทรหาเพื่อน'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_friend_arrival', targetNodeId: 'choice_friend_knock', label: 'ต่อไป' },

    // Path 1 Edges
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_friend_knock', targetNodeId: 'scene_investigate_with_friend',
      triggeringChoiceId: choiceCodeToId['CHOICE_INVESTIGATE_WITH_FRIEND'], label: 'ไปดูหลังบ้าน'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_investigate_with_friend', targetNodeId: 'choice_basement_door', label: 'ต่อไป' },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_basement_door', targetNodeId: 'scene_basement_doll',
      triggeringChoiceId: choiceCodeToId['CHOICE_OPEN_BASEMENT_DOOR'], label: 'เปิดประตู'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_basement_doll', targetNodeId: 'choice_doll_options', label: 'ต่อไป' },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_doll_options', targetNodeId: 'ending_locket_memory',
      triggeringChoiceId: choiceCodeToId['CHOICE_INSPECT_DOLL'], label: 'สำรวจตุ๊กตา'
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
      edgeId: uuidv4(), sourceNodeId: 'choice_doll_options', targetNodeId: 'ending_shattered_warning',
      triggeringChoiceId: choiceCodeToId['CHOICE_CHECK_ROCKING_CHAIR'], label: 'ตรวจเก้าอี้'
    },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_doll_options', targetNodeId: 'ending_narrow_escape',
      triggeringChoiceId: choiceCodeToId['CHOICE_LEAVE_BASEMENT'], label: 'หนี'
    },

    // Path 2 Edges
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_friend_knock', targetNodeId: 'scene_call_police_friend',
      triggeringChoiceId: choiceCodeToId['CHOICE_CALL_POLICE_FRIEND'], label: 'โทรหาตำรวจ'
    },
     { edgeId: uuidv4(), sourceNodeId: 'scene_call_police_friend', targetNodeId: 'choice_cctv_girl', label: 'ต่อไป' },
     {
      edgeId: uuidv4(), sourceNodeId: 'choice_cctv_girl', targetNodeId: 'scene_cctv_writing',
      triggeringChoiceId: choiceCodeToId['CHOICE_WATCH_CCTV'], label: 'เฝ้าดู'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_cctv_writing', targetNodeId: 'choice_cctv_options', label: 'ต่อไป' },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_cctv_options', targetNodeId: 'ending_cold_promise',
      triggeringChoiceId: choiceCodeToId['CHOICE_GO_CHECK_CAMERA'], label: 'ตรวจกล้อง'
    },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_cctv_options', targetNodeId: 'ending_future_self',
      triggeringChoiceId: choiceCodeToId['CHOICE_REWIND_CCTV'], label: 'ย้อนดู'
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
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_cctv_options', targetNodeId: 'ending_endless_knock',
      triggeringChoiceId: choiceCodeToId['CHOICE_IGNORE_CCTV'], label: 'ไม่สนใจ'
    },

    // Path 3 Edges
    
    // === จากทางเลือกเทป (Tape Decision Branches) ===
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_friend_knock', targetNodeId: 'scene_diary_revelation',
      triggeringChoiceId: choiceCodeToId['CHOICE_READ_DIARY'], label: 'อ่านไดอารี่'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_diary_revelation', targetNodeId: 'choice_diary_options', label: 'ต่อไป' },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_diary_options', targetNodeId: 'scene_kwankhao_appears_sad',
      triggeringChoiceId: choiceCodeToId['CHOICE_CALL_KWANKHAO'], label: 'เรียกชื่อ'
    },
    { edgeId: uuidv4(), sourceNodeId: 'scene_kwankhao_appears_sad', targetNodeId: 'choice_kwankhao_options', label: 'ต่อไป' },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_kwankhao_options', targetNodeId: 'ending_reunited',
      triggeringChoiceId: choiceCodeToId['CHOICE_PROMISE_TO_STAY'], label: 'สัญญา'
    },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_kwankhao_options', targetNodeId: 'ending_broken_promise',
      triggeringChoiceId: choiceCodeToId['CHOICE_ASK_TO_MOVE_ON'], label: 'ให้ไปสู่สุขติ'
    },
    {
      edgeId: uuidv4(), sourceNodeId: 'choice_kwankhao_options', targetNodeId: 'ending_bittersweet_goodbye',
      triggeringChoiceId: choiceCodeToId['CHOICE_APOLOGIZE_AND_LEAVE'], label: 'ขอโทษและจากไป'
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
    // === END: Modified Friend Branch Edges ===
  ];

  // สร้าง StoryMap
  const storyMap = new StoryMapModel({
    novelId,
    title: `แผนผังเรื่อง - เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999`,
    version: 1,
    description: 'แผนผังเรื่องราวของนิยายสยองขวัญจิตวิทยาที่เต็มไปด้วยทางเลือกและการตัดสินใจที่ส่งผลต่อชะตากรรม',
    nodes,
    edges,
    storyVariables,
    startNodeId: nodeIdMapping['start_whisper999'],
    lastModifiedByUserId: authorId,
    isActive: true,
    editorMetadata: {
      zoomLevel: 0.8,
      viewOffsetX: 0,
      viewOffsetY: 0,
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

  return savedStoryMap;
  
  return {
    storyMap: savedStoryMap,
    nodeIdMapping
  };
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
    slug: 'chapter-1-moving-in',
    episodeOrder: 1,
    status: EpisodeStatus.PUBLISHED,
    accessType: EpisodeAccessType.FREE,
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

  // สร้าง StoryMap สำหรับนิยาย
  console.log('📊 กำลังสร้าง StoryMap...');
  const storyMapResult = await createWhisper999StoryMap(novel._id, authorId, choices);
  const { storyMap, nodeIdMapping } = storyMapResult;

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

  return {
    novel,
    episodes: updatedEpisodes,
    characters,
    choices,
    scenes: episode1Scenes, // scenes ของ episode 1 เท่านั้น
    storyMap
  };
};