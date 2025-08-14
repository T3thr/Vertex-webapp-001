import mongoose from 'mongoose';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelEndingType, NovelContentType } from '@/backend/models/Novel';
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

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;

// ข้อมูลผู้แต่งจำลอง - ใช้ผู้ใช้ที่มีอยู่แล้วในฐานข้อมูล
export const createMockAuthor = async () => {
    const existingAuthor = await UserModel.findOne({ username: AUTHOR_USERNAME });
    if (existingAuthor) {
        console.log(`✅ พบผู้แต่งในฐานข้อมูล: ${existingAuthor.username} (${existingAuthor._id})`);
        return existingAuthor._id;
    }

    // ถ้าไม่พบผู้ใช้ ให้หาผู้ใช้คนแรกที่เป็น Writer
    const anyWriter = await UserModel.findOne({ roles: { $in: ['Writer'] } });
    if (anyWriter) {
        console.log(`✅ ใช้ผู้เขียนที่มีอยู่: ${anyWriter.username} (${anyWriter._id})`);
        return anyWriter._id;
    }

    // ถ้าไม่มีเลย ให้สร้างใหม่
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const author = new UserModel({
        username: AUTHOR_USERNAME || 'novelmaze_author',
        email: 'author@novelmaze.com',
        password: hashedPassword,
        accounts: [{
            provider: 'credentials',
            providerAccountId: 'author@novelmaze.com',
            type: 'credentials'
        }],
        roles: ['Writer'],
        primaryPenName: 'นักเขียนจำลอง',
        isEmailVerified: true,
        isActive: true,
        isBanned: false,
        isDeleted: false,
    });

    await author.save();
    console.log(`✅ สร้างผู้แต่งใหม่: ${author.username} (${author._id})`);
    return author._id;

    
};

// ChoiceActionType is now imported from '@/backend/models/Choice'


// ตัวละคร
const createTheYearbookSecretCharacters = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
    const characters = [
        {
            novelId,
            authorId,
            characterCode: 'lisa',
            name: 'ลิสา',
            fullName: 'ลิสา [นามสกุลตัวเอกของคุณ]',
            description: 'นักเรียนใหม่ที่เพิ่งย้ายมาโรงเรียนแสงอรุณ เธอพยายามปรับตัวและค้นหาตัวเองในสภาพแวดล้อมใหม่',
            age: '17',
            gender: 'female',
            roleInStory: 'main_protagonist',
            colorTheme: '#87CEEB',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'confused', name: 'สับสน', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'happy', name: 'มีความสุข', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'shy', name: 'เขินอาย', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 162, eyeColor: 'น้ำตาลเข้ม', hairColor: 'ดำ', ageAppearance: 'ปลายวัยรุ่น' },
            personalityTraits: {
                goals: ['หาเพื่อนแท้', 'ทำความเข้าใจตัวเอง', 'ค้นหาสิ่งที่ชอบ'],
                fears: ['การถูกปฏิเสธ', 'การเป็นคนนอก', 'การทำผิดพลาด'],
                strengths: ['จริงใจ', 'อ่อนโยน', 'เปิดใจเรียนรู้'],
                weaknesses: ['ขี้อายเล็กน้อย', 'ตัดสินใจยากบางครั้ง', 'ซุ่มซ่ามบ้าง'],
                likes: ['หนังสือ', 'ดนตรีเบาๆ', 'การได้ลองสิ่งใหม่ๆ'],
                dislikes: ['การเผชิญหน้า', 'ความเข้าใจผิด', 'การโกหก']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'fah_sai',
            name: 'ฟ้าใส',
            fullName: 'ฟ้าใส [นามสกุลตัวละครสมมติ]',
            description: 'ดาวโรงเรียนประจำชั้น ม.5/1 สวย น่ารัก ใจดี และเป็นที่รักของทุกคน',
            age: '17',
            gender: 'female',
            roleInStory: 'supporting_character',
            colorTheme: '#FFC0CB',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'smiling', name: 'ยิ้มแย้ม', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'concerned', name: 'เป็นห่วง', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'supportive', name: 'ให้กำลังใจ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 167, eyeColor: 'น้ำตาลอ่อน', hairColor: 'น้ำตาลธรรมชาติ', ageAppearance: 'ปลายวัยรุ่น' },
            personalityTraits: {
                goals: ['ทำให้คนรอบข้างมีความสุข', 'เป็นเพื่อนที่ดี', 'ประสบความสำเร็จในการเรียน'],
                fears: ['การทำให้คนอื่นผิดหวัง', 'ความขัดแย้ง'],
                strengths: ['ใจดี', 'เป็นมิตร', 'เข้าอกเข้าใจผู้อื่น', 'เป็นที่พึ่งพาได้'],
                weaknesses: ['อ่อนไหวง่าย', 'เก็บความรู้สึกบางอย่างไว้คนเดียว'],
                likes: ['ดนตรี', 'การช่วยเหลือผู้อื่น', 'กิจกรรมชมรม'],
                dislikes: ['การทะเลาะเบาะแว้ง', 'ความไม่ยุติธรรม']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'din',
            name: 'ดิน',
            fullName: 'ดิน [นามสกุลตัวละครสมมติ]',
            description: 'หนุ่มฮอตสุดเย็นชาประจำห้อง ม.5/2 นิ่งขรึม ไม่ค่อยยุ่งกับใคร แต่ลึกๆ แล้วจิตใจดีและมีความสามารถ',
            age: '17',
            gender: 'male',
            roleInStory: 'supporting_character',
            colorTheme: '#5A5A5A',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'annoyed', name: 'หงุดหงิด', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'slight_smile', name: 'ยิ้มเล็กน้อย', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'thoughtful', name: 'ครุ่นคิด', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 178, eyeColor: 'ดำ', hairColor: 'ดำสนิท', ageAppearance: 'ปลายวัยรุ่น' },
            personalityTraits: {
                goals: ['ทำสิ่งที่ตัวเองสนใจให้ดีที่สุด', 'หลีกเลี่ยงปัญหาที่ไม่จำเป็น'],
                fears: ['การถูกเข้าใจผิด', 'การแสดงความอ่อนแอ'],
                strengths: ['เฉลียวฉลาด', 'สังเกตการณ์เก่ง', 'มีความเป็นส่วนตัว'],
                weaknesses: ['เย็นชา', 'ปากไม่ตรงกับใจ', 'เข้าถึงยาก'],
                likes: ['ความสงบ', 'คณิตศาสตร์ (อย่างเงียบๆ)', 'การอยู่คนเดียว'],
                dislikes: ['เสียงดัง', 'ความวุ่นวาย', 'การถูกรบกวน']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'somsri',
            name: 'ครูสมศรี',
            fullName: 'สมศรี [นามสกุลครูสมมติ]',
            description: 'ครูประจำวิชาคณิตศาสตร์ ใจดี แต่ก็มีความเข้มงวดเรื่องการบ้านและความรับผิดชอบ',
            age: '40s',
            gender: 'female',
            roleInStory: 'supporting_character',
            colorTheme: '#A9A9A9',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'kind', name: 'ใจดี', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'strict', name: 'เข้มงวด', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'explaining', name: 'อธิบาย', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 160, eyeColor: 'น้ำตาล', hairColor: 'ดำ', ageAppearance: '40 ต้นๆ' },
            personalityTraits: {
                goals: ['ให้นักเรียนเข้าใจบทเรียน', 'สอนให้มีวินัย'],
                fears: ['นักเรียนไม่ตั้งใจเรียน', 'นักเรียนไม่รับผิดชอบ'],
                strengths: ['อดทน', 'รอบคอบ', 'มีความรู้ดี'],
                weaknesses: ['อาจจะดูดุบ้างในบางครั้ง', 'คาดหวังกับนักเรียนสูง'],
                likes: ['การสอน', 'นักเรียนที่ขยัน', 'ความสงบในห้องเรียน'],
                dislikes: ['นักเรียนที่ไม่ส่งการบ้าน', 'ความวุ่นวาย']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'mew', // แก้ไข characterCode ให้ตรงกับที่ใช้ใน scenes
            name: 'พี่มิว',
            fullName: 'มิว [นามสกุลสมมติ]',
            description: 'รุ่นพี่ชมรมดนตรีผู้ใจดีและมีความสามารถ เป็นกันเองและชอบช่วยเหลือรุ่นน้อง',
            age: '18',
            gender: 'male',
            roleInStory: 'supporting_character',
            colorTheme: '#FFD700',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'smiling', name: 'ยิ้มแย้ม', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'encouraging', name: 'ให้กำลังใจ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'playing_instrument', name: 'เล่นดนตรี', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 175, eyeColor: 'น้ำตาลเข้ม', hairColor: 'ดำ', ageAppearance: 'ปลายวัยรุ่น' },
            personalityTraits: {
                goals: ['พัฒนาชมรมดนตรี', 'เป็นพี่ที่ดีของรุ่นน้อง'],
                fears: ['การแสดงไม่สมบูรณ์แบบ', 'ชมรมขาดสมาชิก'],
                strengths: ['ใจดี', 'เป็นผู้นำ', 'มีความรับผิดชอบ', 'เล่นดนตรีเก่ง'],
                weaknesses: ['อาจจะแบกรับภาระมากเกินไป'],
                likes: ['ดนตรีทุกประเภท', 'การรวมกลุ่มซ้อม', 'ช่วยเหลือน้องๆ'],
                dislikes: ['ความไม่สามัคคี', 'ความเกียจคร้าน']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'aida',
            name: 'ไอด้า',
            fullName: 'ไอด้า [นามสกุลสมมติ]',
            description: 'นักเรียนชมรมศิลปะ ผู้เงียบขรึมและช่างสังเกต มีความสามารถด้านศิลปะโดยเฉพาะการปั้นดินเผา',
            age: '17',
            gender: 'female',
            roleInStory: 'supporting_character',
            colorTheme: '#8B4513',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'thoughtful', name: 'ครุ่นคิด', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'curious', name: 'อยากรู้อยากเห็น', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'focused', name: 'ตั้งใจ (ปั้น/วาด)', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 158, eyeColor: 'ดำ', hairColor: 'ดำสนิท', ageAppearance: 'วัยรุ่น' },
            personalityTraits: {
                goals: ['สร้างสรรค์ผลงานศิลปะตามจินตนาการ', 'เข้าใจตัวเองให้มากขึ้น'],
                fears: ['ผลงานไม่เป็นที่ยอมรับ', 'การถูกตัดสิน'],
                strengths: ['มีความคิดสร้างสรรค์สูง', 'ช่างสังเกต', 'สุขุม'],
                weaknesses: ['ขี้อาย', 'พูดน้อย', 'ดูเข้าถึงยากในตอนแรก'],
                likes: ['ศิลปะ', 'ความสงบเงียบ', 'ธรรมชาติ'],
                dislikes: ['เสียงดัง', 'ความวุ่นวาย', 'การโกหก']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'p_oak', // แก้ไข characterCode ให้ตรงกับที่ใช้ใน scenes
            name: 'พี่โอ๊ค',
            fullName: 'โอ๊ค [นามสกุลสมมติ]',
            description: 'รุ่นพี่ผู้ประสานงานโซนศิลปะ มีความรับผิดชอบสูง จริงจังกับงาน แต่ก็มีมุมที่ผ่อนคลายเมื่ออยู่กับคนที่สนิท',
            age: '18',
            gender: 'male',
            roleInStory: 'supporting_character',
            colorTheme: '#4CAF50',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'serious', name: 'จริงจัง', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'satisfied', name: 'พึงพอใจ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'thoughtful', name: 'ครุ่นคิด', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 175, eyeColor: 'น้ำตาลเข้ม', hairColor: 'ดำ', ageAppearance: 'ปลายวัยรุ่น' },
            personalityTraits: {
                goals: ['ทำให้งานกิจกรรมสำเร็จลุล่วง', 'สร้างสรรค์ผลงานที่ดี'],
                fears: ['ความผิดพลาดในงาน', 'ความไม่เป็นระเบียบ'],
                strengths: ['มีความรับผิดชอบสูง', 'เป็นผู้นำ', 'จัดการเก่ง', 'แก้ปัญหาเฉพาะหน้าได้ดี'],
                weaknesses: ['อาจดูเคร่งเครียด', 'คาดหวังสูง'],
                likes: ['ความเป็นระเบียบ', 'ผลงานศิลปะที่สมบูรณ์แบบ', 'การทำงานเป็นทีม'],
                dislikes: ['ความไม่ตั้งใจ', 'ความวุ่นวาย']
            },
            isArchived: false
        },
        {
            novelId,
            authorId,
            characterCode: 'somchai',
            name: 'ครูสมชาย',
            fullName: 'สมชาย [นามสกุลสมมติ]',
            description: 'ครูผู้ดูแลงานกิจกรรมโรงเรียน มีความรับผิดชอบสูง จริงจังกับงาน แต่ก็อาจดูตื่นตระหนกเล็กน้อยเมื่อเกิดเหตุการณ์ไม่คาดฝัน',
            age: '40s',
            gender: 'male',
            roleInStory: 'supporting_character',
            colorTheme: '#4682B4',
            expressions: [
                { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'serious', name: 'จริงจัง', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'flustered', name: 'ลนลาน', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
                { expressionId: 'relieved', name: 'โล่งใจ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
            ],
            defaultExpressionId: 'normal',
            physicalAttributes: { heightCm: 170, eyeColor: 'น้ำตาลเข้ม', hairColor: 'ดำ (แซมขาวเล็กน้อย)', ageAppearance: '40 ต้นๆ' },
            personalityTraits: {
                goals: ['ทำให้งานโรงเรียนสำเร็จด้วยดี', 'รักษากฎระเบียบ'],
                fears: ['ความผิดพลาดในงาน', 'การควบคุมสถานการณ์ไม่ได้'],
                strengths: ['มีความรับผิดชอบ', 'จัดระเบียบเก่ง', 'ตั้งใจทำงาน'],
                weaknesses: ['ลนลานง่ายเมื่อเจอสถานการณ์ฉุกเฉิน', 'อาจจะเครียดเกินไป'],
                likes: ['ความเป็นระเบียบ', 'นักเรียนที่ตั้งใจ', 'กิจกรรมโรงเรียนที่ราบรื่น'],
                dislikes: ['ความวุ่นวาย', 'ความไม่พร้อม', 'ปัญหาที่คาดไม่ถึง']
            },
            isArchived: false
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

// ตัวเลือก
const createtheyearbooksecretchoices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
    const choices = [
        // Choices for Episode 1
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_FRIENDLY',
            text: 'ยิ้มตอบและแนะนำตัวเองอย่างเป็นมิตร: "ฉันชื่อ [ชื่อคุณ] ค่ะ ยินดีที่ได้รู้จักนะคะฟ้าใส"',
            hoverText: 'แสดงความเป็นมิตรกับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_A',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_A'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['เป็นมิตร', 'ยินดี', 'สุภาพ'],
            psychologicalImpactScore: 3,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกเป็นมิตรกับคุณมากขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_CONFUSED_DIN',
            text: 'ทำหน้างงๆ กับท่าทีของดิน: "เขาเป็นคนแบบนี้เหรอคะ? ดูน่ากลัวจัง..."',
            hoverText: 'แสดงความสับสนเกี่ยวกับดินต่อฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_2',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 8,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_B',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_B'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สับสน', 'สงสัย', 'ไร้เดียงสา'],
            psychologicalImpactScore: 2,
            feedbackTextAfterSelection: 'ฟ้าใสพยายามอธิบายดินให้คุณเข้าใจ',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep1_choices',
            choiceCode: 'CHOICE_INTRO_QUESTION_DIN',
            text: 'สงสัยในตัวดิน: "ทำไมเขาดูเหมือนไม่ชอบฉันเลย ทั้งที่เราเพิ่งเจอกัน..."',
            hoverText: 'ตั้งคำถามถึงท่าทีของดินกับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_3',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 7,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_next_node_C',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_C'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สงสัย', 'ข้องใจ', 'ช่างสังเกต'],
            psychologicalImpactScore: 3,
            feedbackTextAfterSelection: 'ฟ้าใสปลอบใจและอธิบายให้คุณสบายใจ',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 2
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_THANK_DIN',
            text: 'ขอบคุณดินอย่างจริงใจ: "ขอบคุณนะดิน เข้าใจขึ้นเยอะเลย!"',
            hoverText: 'แสดงความขอบคุณต่อดิน',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep2',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2A',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_2A'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['ขอบคุณ', 'ประทับใจ', 'เป็นมิตร'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_IGNORE_DIN',
            text: 'แกล้งทำเป็นไม่ได้ยิน แล้วหันไปสนใจครู: "เข้าใจแล้วค่ะคุณครู"',
            hoverText: 'เลือกที่จะไม่ตอบโต้ดิน',
            actions: [
                {
                    actionId: 'action_din_rel_down_ep2',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: -5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2B',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_2B'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['หลีกเลี่ยง', 'ไม่แน่ใจ'],
            psychologicalImpactScore: 2,
            feedbackTextAfterSelection: 'ความสัมพันธ์กับดินลดลงเล็กน้อย',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep2_choices',
            choiceCode: 'CHOICE_MATH_QUESTION_DIN',
            text: 'แอบสงสัยว่าเขาช่วยเพราะอะไร: "นาย...ช่วยฉันทำไม?"',
            hoverText: 'แสดงความสงสัยในตัวดิน',
            actions: [
                {
                    actionId: 'action_din_rel_neutral_ep2',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 0,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_node_2C',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'node_after_choice_2C'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['สงสัย', 'ตรงไปตรงมา'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'ดินตอบกลับด้วยท่าทีเฉยเมย',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 3
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_JOIN_MUSIC_CLUB_FAHSAI',
            text: 'ตอบรับคำชวนของฟ้าใสอย่างกระตือรือร้น: "ได้เลยค่ะ! ฟ้าใสชวนขนาดนี้ต้องไปลองดูแล้ว"',
            hoverText: 'แสดงความสนใจในชมรมดนตรีและเข้าหาฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep3_A',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 15,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep4_choice_A_music_club',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep4_choice_A_music_club'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['กระตือรือร้น', 'เป็นมิตร', 'ความสนใจ'],
            psychologicalImpactScore: 6,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกยินดีอย่างมาก! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_BUMP_INTO_DIN',
            text: 'แกล้งเดินไปชนดิน เพื่อพูดคุย: (เดินไปชนดินเบาๆ) "โอ๊ย! ขอโทษค่ะดิน ฉันไม่ได้ตั้งใจ"',
            hoverText: 'พยายามสร้างปฏิสัมพันธ์กับดิน',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep3_B',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep4_choice_B_art_club',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep4_choice_B_art_club'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['กล้าหาญ', 'อยากรู้อยากเห็น', 'ซุ่มซ่าม'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'ดินดูจะรำคาญ แต่ก็อาจจะเริ่มสนใจคุณขึ้นมาบ้าง! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep3_choices',
            choiceCode: 'CHOICE_EP3_EXPLORE_ALONE',
            text: 'บอกฟ้าใสว่าขอเดินดูเองก่อน: "ขอบคุณนะฟ้าใส แต่ฉันขอเดินดูอีกสักหน่อยดีกว่า" (แล้วแอบมองดินที่กำลังเดินห่างออกไป)',
            hoverText: 'เลือกที่จะสำรวจด้วยตัวเองและแอบสนใจดิน',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_down_ep3_C',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: -5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_din_rel_up_ep3_C',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep4_choice_C_explore_art',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep4_choice_C_explore_art'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['เป็นตัวของตัวเอง', 'อยากรู้อยากเห็น', 'ลังเล'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'ฟ้าใสดูจะผิดหวังเล็กน้อย แต่คุณก็มีโอกาสสังเกตดินมากขึ้น',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 8
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_HELP_FAHSAI_MUSIC',
            text: 'พยายามเข้าช่วยเหลือฟ้าใสและชมรมดนตรี: (วิ่งไปหาฟ้าใส) "ฟ้าใส! ไม่เป็นไรนะ? มีอะไรให้ฉันช่วยไหม?"',
            hoverText: 'ให้ความสำคัญกับความรู้สึกของฟ้าใสและพยายามช่วยแก้ไขปัญหาที่เกิดกับชมรมดนตรี',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep8_A',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 15,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep9_path_fahsai',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep9_path_fahsai'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ห่วงใย', 'เสียสละ', 'มิตรภาพ'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกซาบซึ้งใจ! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้นอย่างมาก',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_OBSERVE_DIN',
            text: 'เข้าไปสังเกตการณ์ใกล้ๆ ดินและสายไฟที่ชำรุด: (เดินไปใกล้ดิน) "ดิน...นายรู้อะไรเกี่ยวกับเรื่องนี้ไหม?"',
            hoverText: 'สงสัยในตัวดินและพยายามหาข้อมูลจากเขา',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep8_B',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep9_path_din',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep9_path_din'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['อยากรู้อยากเห็น', 'ช่างสังเกต', 'รอบคอบ'],
            psychologicalImpactScore: 6,
            feedbackTextAfterSelection: 'ดินดูจะประหลาดใจเล็กน้อย! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep8_choices',
            choiceCode: 'CHOICE_EP8_REPORT_TEACHER',
            text: 'แจ้งคุณครูผู้ดูแลงานและรอคำสั่ง: (เดินไปหาคุณครู) "คุณครูคะ! หนูเห็นสายไฟตรงนั้นมีปัญหาค่ะ"',
            hoverText: 'เลือกที่จะทำตามระเบียบและแจ้งผู้มีอำนาจ',
            actions: [
                {
                    actionId: 'action_teacher_rel_up_ep8_C',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'somchai', // CORRECTED characterCode
                        changeValue: 5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep9_path_neutral',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep9_path_neutral'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['มีวินัย', 'รอบคอบ', 'เคารพกฎ'],
            psychologicalImpactScore: 4,
            feedbackTextAfterSelection: 'คุณครูขอบคุณคุณ! ความสัมพันธ์กับครูสมชายเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 11
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_ACCEPT_DIN_INVITE',
            text: 'เลือกตอบรับคำชวนของดิน: "ฟังนายเล่นดนตรีเหรอ...ก็น่าสนใจดีนะ ฉันอยากลองฟังดู"',
            hoverText: 'เลือกที่จะใกล้ชิดดินมากขึ้นและสำรวจมุมที่ซ่อนอยู่ของเขา',
            actions: [
                {
                    actionId: 'action_din_rel_up_ep11_A',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 20,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_fah_sai_rel_down_ep11_A',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: -5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep12_path_din',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep12_path_din'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['อยากรู้อยากเห็น', 'ความกล้า', 'โรแมนติก'],
            psychologicalImpactScore: 8,
            feedbackTextAfterSelection: 'คุณตัดสินใจที่จะใกล้ชิดดินมากขึ้น! ความสัมพันธ์กับดินเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_ACCEPT_FAHSAI_INVITE',
            text: 'เลือกตอบรับคำชวนของฟ้าใส: "แน่นอนสิฟ้าใส! เรื่องหนังก็ดีนะ ส่วนเรื่องเลือกเพลงฉันก็ช่วยเต็มที่อยู่แล้ว!"',
            hoverText: 'เลือกที่จะใกล้ชิดฟ้าใสมากขึ้นและให้ความสำคัญกับมิตรภาพ/ความรู้สึกของเธอ',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_up_ep11_B',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 20,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_din_rel_down_ep11_B',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: -5,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep12_path_fahsai',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep12_path_fahsai'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['เป็นมิตร', 'ความภักดี', 'ความสุข'],
            psychologicalImpactScore: 8,
            feedbackTextAfterSelection: 'ฟ้าใสรู้สึกดีใจอย่างมาก! ความสัมพันธ์กับฟ้าใสเพิ่มขึ้น',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep11_choices',
            choiceCode: 'CHOICE_EP11_NO_DECISION_YET',
            text: 'เลือกที่จะยังไม่ตัดสินใจทันที: "ฉันขอคิดดูก่อนนะ...ทั้งสองเรื่องเลย" (แล้วพยายามหาทางพูดคุยกับทั้งคู่ในภายหลัง)',
            hoverText: 'ต้องการเวลาตัดสินใจและประเมินสถานการณ์',
            actions: [
                {
                    actionId: 'action_din_rel_neutral_ep11_C',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 0,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_fah_sai_rel_neutral_ep11_C',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 0,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep12_path_neutral',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep12_path_neutral'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ลังเล', 'รอบคอบ', 'ช่างคิด'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ทั้งดินและฟ้าใสรับทราบการตัดสินใจของคุณ...แต่ก็ยังคงรอคำตอบ',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 13
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_COMMIT_FAHSAI',
            text: 'เลือกที่จะเริ่มต้นความสัมพันธ์แบบคนรักกับฟ้าใส: "ฟ้าใส...ฉัน...ฉันก็รู้สึกพิเศษกับเธอจริงๆ นะ ฉันอยากให้เราได้อยู่ข้างๆ กันแบบนี้ต่อไป"',
            hoverText: 'ตัดสินใจคบหากับฟ้าใส',
            actions: [
                {
                    actionId: 'action_fah_sai_rel_huge_up_ep13',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'fah_sai',
                        changeValue: 50,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_game_state_set_fahsai_route',
                    type: ChoiceActionType.SET_STORY_VARIABLE, // CORRECTED
                    parameters: {
                        variableId: 'chosen_love_interest', // Changed from variableName to variableId
                        value: 'fah_sai'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep13_path_fahsai_couple',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep13_path_fahsai_couple'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ความรัก', 'ความผูกพัน', 'ความสุข'],
            psychologicalImpactScore: 9,
            feedbackTextAfterSelection: 'คุณกับฟ้าใสได้เริ่มต้นเส้นทางบทใหม่ด้วยกัน!',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_COMMIT_DIN',
            text: 'เลือกที่จะเริ่มต้นความสัมพันธ์แบบคนรักกับดิน: "ดิน...ฉันอยากอยู่ข้างๆ นาย และเรียนรู้โลกของนายให้มากกว่านี้"',
            hoverText: 'ตัดสินใจคบหากับดิน',
            actions: [
                {
                    actionId: 'action_din_rel_huge_up_ep13',
                    type: ChoiceActionType.UPDATE_RELATIONSHIP, // CORRECTED
                    parameters: {
                        characterCode: 'din',
                        changeValue: 50,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_game_state_set_din_route',
                    type: ChoiceActionType.SET_STORY_VARIABLE, // CORRECTED
                    parameters: {
                        variableId: 'chosen_love_interest',
                        value: 'din'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep13_path_din_couple',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep13_path_din_couple'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['ความรัก', 'ความท้าทาย', 'ความเข้าใจ'],
            psychologicalImpactScore: 9,
            feedbackTextAfterSelection: 'คุณกับดินได้เริ่มต้นเส้นทางบทใหม่ด้วยกัน!',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep13_choices',
            choiceCode: 'CHOICE_EP13_FRIENDSHIP_ONLY',
            text: 'เลือกที่จะรักษาความเป็นเพื่อนที่ดีกับทั้งคู่ และยังไม่คบใคร: "ฉันรู้สึกดีกับพวกเธอทั้งคู่มากนะ...แต่ตอนนี้ฉันยังไม่พร้อมที่จะตัดสินใจเรื่องความรัก ฉันอยากให้เรายังคงเป็นเพื่อนที่ดีต่อกันเสมอไปนะ"',
            hoverText: 'ตัดสินใจที่จะเน้นมิตรภาพและค้นหาตัวเองต่อไป',
            actions: [
                {
                    actionId: 'action_game_state_set_friendship_route',
                    type: ChoiceActionType.SET_STORY_VARIABLE, // CORRECTED
                    parameters: {
                        variableId: 'chosen_love_interest',
                        value: 'none'
                    }
                },
                {
                    actionId: 'action_go_to_scene_ep13_path_friendship_only',
                    type: ChoiceActionType.GO_TO_NODE,
                    parameters: {
                        targetNodeId: 'scene_ep13_path_friendship_only'
                    }
                }
            ],
            isMajorChoice: true,
            associatedEmotionTags: ['มิตรภาพ', 'การค้นหาตัวเอง', 'ความเป็นอิสระ'],
            psychologicalImpactScore: 7,
            feedbackTextAfterSelection: 'มิตรภาพกับเพื่อนๆ ยังคงอยู่เสมอ! คุณพร้อมสำหรับชีวิตบทใหม่แล้ว',
            isArchived: false,
            displayOrder: 3
        },
        // Choices for Episode 15
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_FOCUS_STUDY',
            text: 'มองไปยังป้ายคณะที่ตนเองกำลังจะเข้าเรียน: "นี่แหละ...จุดเริ่มต้นเส้นทางความฝันของฉัน!"',
            hoverText: 'เน้นการเรียนรู้และเป้าหมายในอนาคต',
            actions: [
                {
                    actionId: 'action_player_stat_add_academics',
                    type: ChoiceActionType.MODIFY_PLAYER_STAT, // CORRECTED
                    parameters: {
                        statName: 'academics',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season_academics',
                    type: ChoiceActionType.END_NOVEL_BRANCH,
                    parameters: {
                        endingNodeId: 'ENDING_ACADEMICS',
                        outcomeDescription: 'คุณเต็มเปี่ยมไปด้วยความมุ่งมั่น!'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['มุ่งมั่น', 'ตั้งใจ', 'ความฝัน'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'คุณเต็มเปี่ยมไปด้วยความมุ่งมั่น!',
            isArchived: false,
            displayOrder: 1
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_OPEN_TO_NEW_PEOPLE',
            text: 'มองไปยังกลุ่มนักศึกษาที่ดูเหมือนกำลังหาเพื่อนใหม่: "บางที...ฉันอาจจะได้เจอใครที่น่าสนใจอีกก็ได้นะ"',
            hoverText: 'เปิดใจรับโอกาสและความสัมพันธ์ใหม่ๆ',
            actions: [
                {
                    actionId: 'action_player_stat_add_social',
                    type: ChoiceActionType.MODIFY_PLAYER_STAT, // CORRECTED
                    parameters: {
                        statName: 'social_skills',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season_social',
                    type: ChoiceActionType.END_NOVEL_BRANCH,
                    parameters: {
                        endingNodeId: 'ENDING_SOCIAL',
                        outcomeDescription: 'คุณพร้อมที่จะเปิดรับสิ่งใหม่ๆ!'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['เปิดใจ', 'อยากรู้อยากเห็น', 'สดใส'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'คุณพร้อมที่จะเปิดรับสิ่งใหม่ๆ!',
            isArchived: false,
            displayOrder: 2
        },
        {
            novelId,
            authorId,
            version: 1,
            originStoryMapNodeId: 'scene_ep15_final_choice',
            choiceCode: 'CHOICE_EP15_REFLECT_ON_PAST',
            text: 'มองย้อนกลับไปยังเส้นทางที่ผ่านมาและคิดถึงเพื่อนเก่า: "ฉันจะไม่ลืมเรื่องราวที่แสงอรุณเลย...พวกเธอจะเป็นส่วนหนึ่งของฉันเสมอ"',
            hoverText: 'ให้ความสำคัญกับความทรงจำและมิตรภาพที่ผ่านมา',
            actions: [
                {
                    actionId: 'action_player_stat_add_nostalgia',
                    type: ChoiceActionType.MODIFY_PLAYER_STAT, // CORRECTED
                    parameters: {
                        statName: 'nostalgia',
                        changeValue: 10,
                        operation: 'add'
                    }
                },
                {
                    actionId: 'action_end_season_nostalgia',
                    type: ChoiceActionType.END_NOVEL_BRANCH,
                    parameters: {
                        endingNodeId: 'ENDING_NOSTALGIA',
                        outcomeDescription: 'ความทรงจำที่ผ่านมาจะอยู่กับคุณเสมอ!'
                    }
                }
            ],
            isMajorChoice: false,
            associatedEmotionTags: ['ซาบซึ้ง', 'ความคิดถึง', 'ความผูกพัน'],
            psychologicalImpactScore: 5,
            feedbackTextAfterSelection: 'ความทรงจำที่ผ่านมาจะอยู่กับคุณเสมอ!',
            isArchived: false,
            displayOrder: 3
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
 * สร้าง scenes สำหรับ Episode ของนิยาย "The Yearbook's Secret"
 * @param novelId - ID ของนิยาย
 * @param episodeId - ID ของ episode
 * @param characters - Array ของ characters ที่ถูกสร้างแล้ว
 * @returns Array ของ Scene documents ที่สร้างเสร็จแล้ว
 */
const createtheyearbooksecretscenes = async (
    novelId: mongoose.Types.ObjectId,
    episodeId: mongoose.Types.ObjectId,
    characters: any[],
    choices: any[] = []
) => {
    // แก้ไขข้อมูล audios ที่มี type: 'sound_effect' เป็น 'audio_effect'
    const fixAudioTypes = (audios: any[]) => {
        if (!audios) return [];
        return audios.map(audio => {
            if (audio.type === 'sound_effect') {
                return { ...audio, type: 'audio_effect' };
            }
            return audio;
        });
    };

    // ตรวจสอบความถูกต้องของ character objects
    const validateCharacters = (characters: any[]) => {
        if (!characters) return [];
        return characters.map(character => {
            if (!character.characterId && character.instanceId) {
                console.warn(`⚠️ พบ character ที่ไม่มี characterId: ${character.instanceId}`);
                // ใช้ characterId ของ lisa เป็นค่าเริ่มต้น (ถ้ามี)
                const lisaChar = characters.find(c => c.characterId && c.instanceId && c.instanceId.includes('lisa'));
                if (lisaChar) {
                    console.log(`🔧 กำหนด characterId จาก lisa ให้กับ ${character.instanceId}`);
                    return { ...character, characterId: lisaChar.characterId };
                }
            }
            return character;
        });
    };
    const characterMap = characters.reduce((acc, char) => {
        acc[char.characterCode] = char._id;
        return acc;
    }, {} as Record<string, mongoose.Types.ObjectId>);
    
    const choiceMap = choices.reduce((acc, choice) => {
        acc[choice.choiceCode] = choice._id;
        return acc;
    }, {} as Record<string, mongoose.Types.ObjectId>);
    
    // แปลง nodeId เป็น ObjectId ในภายหลัง
    const updateDefaultNextSceneIds = (scenes: any[]) => {
        const nodeIdToSceneMap = new Map(scenes.map(s => [s.nodeId, s]));
        
        for (const scene of scenes) {
            if (scene.defaultNextSceneId && typeof scene.defaultNextSceneId === 'string' && scene.defaultNextSceneId.startsWith('scene_')) {
                const nextScene = nodeIdToSceneMap.get(scene.defaultNextSceneId);
                if (nextScene && nextScene._id) {
                    scene.defaultNextSceneId = nextScene._id;
                } else {
                    console.warn(`⚠️ ไม่พบฉากถัดไปที่มี nodeId: ${scene.defaultNextSceneId} สำหรับฉาก ${scene.nodeId}`);
                    scene.defaultNextSceneId = null;
                }
            }
        }
        
        return scenes;
    };

    // ใช้ฟังก์ชัน validateCharacters กับ characters array ในทุก scene
    const processScene = (sceneData: any) => {
        if (sceneData.characters && Array.isArray(sceneData.characters)) {
            sceneData.characters = validateCharacters(sceneData.characters);
        }
        if (sceneData.audios && Array.isArray(sceneData.audios)) {
            sceneData.audios = fixAudioTypes(sceneData.audios);
        }
        
        // เพิ่ม ending ให้กับฉากจบ
        if (sceneData.nodeId && sceneData.nodeId.includes('_ending_')) {
            const endingType = sceneData.nodeId.includes('_good_ending_') ? 'GOOD' :
                              sceneData.nodeId.includes('_bad_ending_') ? 'BAD' :
                              sceneData.nodeId.includes('_true_ending_') ? 'TRUE' : 
                              sceneData.nodeId.includes('_normal_ending_') ? 'NORMAL' : 'ALTERNATE';
            
            sceneData.ending = {
                endingType,
                title: sceneData.title || `${endingType} ENDING`,
                description: `คุณได้พบกับ ${endingType} ENDING ของเรื่องราวนี้`,
                endingId: `yearbook_${endingType.toLowerCase()}_ending_${uuidv4().slice(0, 8)}`
            };
            
            console.log(`✅ เพิ่ม ${endingType} ENDING ให้กับฉาก ${sceneData.nodeId}`);
        }
        
        return sceneData;
    };

    const scenes = [
        // --- Scenes from Episode 1 (from your previous request) ---
        // Scene 1: บทนำและการชนกัน
        {
            novelId,
            episodeId,
            sceneOrder: 1,
            nodeId: 'scene_ep1_intro', // ใช้ nodeId เป็น unique identifier สำหรับอ้างอิงจาก choices,
            title: 'การพบกันครั้งแรกกับ...ความเข้าใจผิด',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [],
            textContents: [ // ใช้ TextContentType ที่ถูกต้องตาม Scene Model
                {
                    instanceId: 'narration_ep1_intro',
                    type: TextContentType.NARRATION,
                    content: 'วันนี้เป็นวันแรกที่คุณย้ายมาเรียนที่โรงเรียนแสงอรุณ ทุกอย่างดูใหม่และน่าตื่นเต้นไปหมด คุณกำลังเดินหาห้องสมุดตามแผนที่ในมือ แต่จู่ๆ ก็มีใครบางคนเดินชนเข้าอย่างจังจนหนังสือหล่นกระจัดกระจาย',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_school_life',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_din1',
            timelineTracks: [
                {
                    trackId: 'main_track',
                    trackName: 'Main Timeline',
                    events: []
                }
            ]
        },

        // Scene 2: ดินพูดประโยคแรก
        {
            novelId,
            episodeId,
            sceneOrder: 2,
            nodeId: 'scene_ep1_dialogue_din1',
            title: 'บทสนทนา: ดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_cold',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'lisa_ep1_normal',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"นี่เธอ...เดินยังไงไม่ดูตาม้าตาเรือเลย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_lisa1',
            timelineTracks: []
        },

        // Scene 3: คุณ (ลิสา) ตอบกลับ
        {
            novelId,
            episodeId,
            sceneOrder: 3,
            nodeId: 'scene_ep1_dialogue_lisa1',
            title: 'บทสนทนา: คุณ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_cold_2',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'lisa_ep1_sorry',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ขะ...ขอโทษค่ะ ฉันไม่ทันมองจริงๆ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_din2',
            timelineTracks: []
        },

        // Scene 4: ดินพูดต่อพร้อมหยิบหนังสือ
        {
            novelId,
            episodeId,
            sceneOrder: 4,
            nodeId: 'scene_ep1_dialogue_din2',
            title: 'บทสนทนา: ดิน (ต่อ)',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_sarcastic',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'lisa_ep1_listening_2',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"หึ...นักเรียนใหม่สินะ ถึงได้ซุ่มซ่ามขนาดนี้" (ก้มลงหยิบหนังสือเล่มหนึ่งขึ้นมาดูอย่างไม่ใส่ใจ) "หนังสือเรียนเหรอ? ดูท่าทางเธอคงต้องปรับตัวอีกเยอะนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_fahsai1',
            timelineTracks: []
        },

        // Scene 5: ฟ้าใสเข้ามา
        {
            novelId,
            episodeId,
            sceneOrder: 5,
            nodeId: 'scene_ep1_dialogue_fahsai1',
            title: 'บทสนทนา: ฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_present',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'lisa_ep1_present',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep1_friendly',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 2 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fah_sai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดิน อย่าแกล้งเพื่อนใหม่สิ! ขอโทษแทนดินด้วยนะจ๊ะ เธอไม่เป็นไรใช่ไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_lisa2',
            timelineTracks: []
        },

        // Scene 6: คุณ (ลิสา) ตอบฟ้าใสและมองดิน
        {
            novelId,
            episodeId,
            sceneOrder: 6,
            nodeId: 'scene_ep1_dialogue_lisa2',
            title: 'บทสนทนา: คุณ (มองดิน)',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_still',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'lisa_ep1_glance_din',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 2 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep1_waiting',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ไม่เป็นไรค่ะ..." (มองดินที่ยังคงยืนนิ่งๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_din3',
            timelineTracks: []
        },

        // Scene 7: ดินโยนหนังสือคืนและเดินจากไป
        {
            novelId,
            episodeId,
            sceneOrder: 7,
            nodeId: 'scene_ep1_dialogue_din3',
            title: 'บทสนทนา: ดิน (จากไป)',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'din_ep1_leaving',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0, zIndex: 1 }, // ซ่อนตัวละครเมื่อเดินจากไป
                    isVisible: false // เริ่มต้นด้วยการซ่อน เพื่อให้มีการ fade out
                },
                {
                    instanceId: 'lisa_ep1_watching',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep1_present_2',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้าไม่มีอะไรแล้ว ฉันไปล่ะ" (เดินจากไปทันที)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_dialogue_fahsai2',
            timelineTracks: [
                {
                    trackId: 'character_movement',
                    trackName: 'Character Movement',
                    events: [
                        {
                            eventId: 'din_fade_out',
                            startTimeMs: 100, // เริ่มหลังจากบทพูดเล็กน้อย
                            eventType: 'hide_character',
                            targetInstanceId: 'din_ep1_leaving',
                            parameters: {
                                durationMs: 1000 // ใช้เวลา 1 วินาทีในการหายไป
                            }
                        }
                    ]
                }
            ]
        },

        // Scene 8: ฟ้าใสปลอบโยนและแนะนำตัว
        {
            novelId,
            episodeId,
            sceneOrder: 8,
            nodeId: 'scene_ep1_dialogue_fahsai2',
            title: 'บทสนทนา: ฟ้าใส (ปลอบโยน)',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep1_listening_3',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep1_friendly_2',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fah_sai_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ไม่ต้องสนใจเขาหรอกนะ ดินก็เป็นแบบนี้แหละ...บางทีก็ปากไม่ตรงกับใจ" (ยิ้ม) "ฉันฟ้าใสนะ ยินดีที่ได้รู้จัก"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_choices', // ไปยังฉากตัวเลือก
            timelineTracks: []
        },

        // Scene 9: ฉากตัวเลือก ----------------------------
        {
            novelId,
            episodeId,
            sceneOrder: 9,
            nodeId: 'scene_ep1_choices',
            title: 'ตัวเลือกการตอบโต้',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep1_thinking',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep1_waiting_choice',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep1',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะตอบฟ้าใสว่าอย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep1_intro',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },

        // Scene สำหรับแต่ละตัวเลือก (ตัวอย่าง)
        // Scene สำหรับตัวเลือก A: ยิ้มตอบและแนะนำตัวเอง
        {
            novelId,
            episodeId,
            sceneOrder: 10,
            nodeId: 'node_after_choice_A',
            title: 'ผลลัพธ์: เป็นมิตรกับฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'fah_sai_ep1_happier',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fah_sai_A_response',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"มีอะไรให้ช่วยก็บอกได้เลยนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_next_event', // ไปยังฉากถัดไปของเนื้อเรื่อง
            timelineTracks: []
        },

        // Scene สำหรับตัวเลือก B: ทำหน้างงๆ กับท่าทีของดิน
        {
            novelId,
            episodeId,
            sceneOrder: 11,
            nodeId: 'node_after_choice_B',
            title: 'ผลลัพธ์: สับสนเรื่องดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'fah_sai_ep1_explaining',
                    characterId: characterMap.fah_sai,
                    expressionId: 'concerned',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fah_sai_B_response',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ไม่หรอก เขาแค่ไม่ค่อยแสดงออกเฉยๆ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_next_event',
            timelineTracks: []
        },

        // Scene สำหรับตัวเลือก C: สงสัยในตัวดิน
        {
            novelId,
            episodeId,
            sceneOrder: 12,
            nodeId: 'node_after_choice_C',
            title: 'ผลลัพธ์: สงสัยในตัวดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'fah_sai_ep1_reassuring',
                    characterId: characterMap.fah_sai,
                    expressionId: 'supportive',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fah_sai_C_response',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อย่าคิดมากเลย บางทีเขาก็แค่หงุดหงิดน่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep1_next_event',
            timelineTracks: []
        },

        // ฉากถัดไปหลังจากตัวเลือกแรก (สมมติ)
        {
            novelId,
            episodeId,
            sceneOrder: 13,
            nodeId: 'scene_ep1_next_event',
            title: 'เตรียมเข้าสู่บทเรียน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Pasillo1.png', // เปลี่ยนเป็นฉากต่อไป
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [],
            textContents: [
                {
                    instanceId: 'narration_next_event',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากนั้น คุณกับฟ้าใสก็เดินไปที่ห้องเรียนวิชาต่อไป...',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_intro_math_class', // เชื่อมไปยังตอนที่ 2
            timelineTracks: []
        },

        // --- Scenes from Episode 2 (จากคำขอเมื่อกี้) ---
        // Scene 1: บทนำในห้องเรียน
        {
            novelId,
            episodeId,
            sceneOrder: 14, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_intro_math_class',
            title: 'บทเรียนที่ไม่คาดฝัน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png', // รูปห้องเรียนคณิตศาสตร์   
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_sitting',
                    characterId: characterMap.lisa,
                    expressionId: 'worried', // หรือ normal
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_sitting',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep2_intro',
                    type: TextContentType.NARRATION,
                    content: 'วิชาคณิตศาสตร์เป็นวิชาที่คุณไม่ถนัดเอาเสียเลย ยิ่งวันแรกของการเรียน คุณครูก็ให้การบ้านมาเต็มไปหมด คุณพยายามทำความเข้าใจบทเรียน แต่ก็ยังงงๆ อยู่ดี',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_classroom',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศในห้องเรียน
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.5,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep2_teacher_ask',
            timelineTracks: []
        },

        // Scene 2: ครูสมศรีถาม
        {
            novelId,
            episodeId,
            sceneOrder: 15, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_teacher_ask',
            title: 'ครูสมศรีถาม',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_listening',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_listening',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri',
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    expressionId: 'normal', // ครูสมศรี (ใจดี)
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_teacher_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    speakerDisplayName: 'คุณครูสมศรี',
                    content: '"นักเรียนทุกคน การบ้านเรื่องสมการเชิงเส้น มีใครติดตรงไหนบ้างไหมคะ? ถ้ามีก็ยกมือถามได้เลยนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_no_one_raise_hand',
                    type: TextContentType.NARRATION,
                    content: '(ไม่มีใครยกมือเลย...ยกเว้นคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_lisa_raise_hand',
            timelineTracks: []
        },

        // Scene 3: คุณ (ลิสา) ยกมือถาม
        {
            novelId,
            episodeId,
            sceneOrder: 16, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_lisa_raise_hand',
            title: 'คุณยกมือ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_raise_hand',
                    characterId: characterMap.lisa,
                    expressionId: 'confused', // หรือ expression ที่แสดงความลังเล
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_observing',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri_2',
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_ep2_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เอ่อ...คุณครูคะ หนูไม่เข้าใจตรงนี้เลยค่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_teacher_ask_detail',
            timelineTracks: []
        },

        // Scene 4: ครูสมศรีถามรายละเอียด
        {
            novelId,
            episodeId,
            sceneOrder: 17, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_teacher_ask_detail',
            title: 'ครูสมศรีถามรายละเอียด',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_explaining',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_observing_2',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri_3',
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_teacher_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    speakerDisplayName: 'คุณครูสมศรี',
                    content: '"ตรงไหนคะ [ชื่อคุณ] ลองบอกมาสิ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep2_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ตรงที่ต้องย้ายข้างตัวแปรแล้วเครื่องหมายมันเปลี่ยนน่ะค่ะ หนูสับสนไปหมดเลย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_teacher_start_explain',
            timelineTracks: []
        },

        // Scene 5: ครูสมศรีกำลังจะอธิบาย ดินกระซิบ
        {
            novelId,
            episodeId,
            sceneOrder: 18, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_teacher_start_explain',
            title: 'ดินกระซิบ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_surprised',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ surprised
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_whispering',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ expression ที่กำลังกระซิบ
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri_4',
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_teacher_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somsri, // ใช้ ID ของครูสมศรี
                    speakerDisplayName: 'คุณครูสมศรี',
                    content: '"ไม่เป็นไรค่ะ เดี๋ยวครูอธิบายซ้ำให้..." (กำลังจะอธิบาย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep2_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ก็แค่มองว่ามันคือกระจก สลับฝั่งเมื่อไหร่ก็กลับด้านทันที" (กระซิบข้างๆ คุณ เสียงเบาจนแทบไม่ได้ยิน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_lisa_question_din',
            timelineTracks: []
        },

        // Scene 6: คุณ (ลิสา) ถามดิน
        {
            novelId,
            episodeId,
            sceneOrder: 19, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_lisa_question_din',
            title: 'คุณถามดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_ask_din',
                    characterId: characterMap.lisa,
                    expressionId: 'confused', // หรือ surprised
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_being_watched',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_ep2_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"อะ...อะไรนะ?" (หันไปมองดินอย่างแปลกใจ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_din_explain',
            timelineTracks: []
        },

        // Scene 7: ดินอธิบาย
        {
            novelId,
            episodeId,
            sceneOrder: 20, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_din_explain',
            title: 'ดินอธิบาย',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_listening_din',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_explaining',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ expression ที่ดูเฉยชาแต่กำลังอธิบาย
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_din_ep2_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้ามันเป็นบวก ย้ายไปอีกฝั่งก็เป็นลบ ถ้าเป็นคูณก็เป็นหาร ง่ายๆ แค่นี้" (ไม่มองหน้าคุณ แต่พูดต่อด้วยเสียงเรียบนิ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep2_choices', // ไปยังฉากตัวเลือก
            timelineTracks: []
        },

        // Scene 8: ฉากตัวเลือก ----------------------------
        {
            novelId,
            episodeId,
            sceneOrder: 21, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep2_choices',
            title: 'ตัวเลือกการตอบโต้',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_thinking_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_waiting_choice',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep2',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะตอบดินว่าอย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep2_din_help',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },

        // Scene สำหรับตัวเลือก A: ขอบคุณดินอย่างจริงใจ
        {
            novelId,
            episodeId,
            sceneOrder: 22, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'node_after_choice_2A',
            title: 'ผลลัพธ์: ขอบคุณดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_grateful',
                    characterId: characterMap.lisa,
                    expressionId: 'happy', // หรือยิ้มเล็กน้อย
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_response_A',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_2A',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ขอบคุณนะดิน เข้าใจขึ้นเยอะเลย!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_2A_response',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อืม..."',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep3_intro_club_fair', // ไปยังฉากถัดไปของเนื้อเรื่อง
            timelineTracks: []
        },

        // Scene สำหรับตัวเลือก B: แกล้งทำเป็นไม่ได้ยิน แล้วหันไปสนใจครู
        {
            novelId,
            episodeId,
            sceneOrder: 23, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'node_after_choice_2B',
            title: 'ผลลัพธ์: ไม่สนใจดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_focus_teacher',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_ignored',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรืออาจจะแสดงอาการไม่พอใจเล็กน้อย
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_2B',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เข้าใจแล้วค่ะคุณครู" (พยักหน้าให้ครู)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep3_intro_club_fair',
            timelineTracks: []
        },

        // Scene สำหรับตัวเลือก C: แอบสงสัยว่าเขาช่วยเพราะอะไร
        {
            novelId,
            episodeId,
            sceneOrder: 24, // อัพเดต sceneOrder ให้ต่อเนื่อง
            nodeId: 'node_after_choice_2C',
            title: 'ผลลัพธ์: สงสัยดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep2_curious',
                    characterId: characterMap.lisa,
                    expressionId: 'confused', // หรือ expression ที่แสดงความสงสัย
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep2_response_C',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ expression ที่แสดงความหงุดหงิดเล็กน้อย
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_2C',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นาย...ช่วยฉันทำไม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_2C_response',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"รำคาญเสียงบ่นของครูต่างหาก"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep3_intro_club_fair',
            timelineTracks: []
        },

        // --- START Episode 3: กิจกรรมชมรมและจุดเริ่มต้นของมิตรภาพ ---
        // Scene 1: บทนำและบรรยากาศในงานเปิดบ้านชมรม
        {
            novelId,
            episodeId,
            sceneOrder: 1, // เริ่มต้นตอนที่ 3
            nodeId: 'scene_ep3_intro_club_fair',
            title: 'กิจกรรมชมรมและจุดเริ่มต้นของมิตรภาพ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png', // รูปบรรยากาศงานเปิดบ้านชมรม    
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [],
            textContents: [
                {
                    instanceId: 'narration_ep3_intro',
                    type: TextContentType.NARRATION,
                    content: 'โรงเรียนจัดกิจกรรมเปิดบ้านชมรม คุณกำลังเดินเลือกชมรมที่สนใจ สายตาไปสะดุดกับบูธชมรมดนตรี ที่มีเสียงเพลงไพเราะลอยออกมา คุณเห็นฟ้าใสกำลังยิ้มทักทายนักเรียนใหม่ที่สนใจชมรมนี้',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_school_fair',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศงานชมรม
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep3_fahsai_invitation_and_din_sighting', // ไปยังฉากฟ้าใสเชิญชวนและเห็นดิน
            timelineTracks: []
        },

        // Scene 2: ฟ้าใสชวน และเห็นดิน
        {
            novelId,
            episodeId,
            sceneOrder: 2,
            nodeId: 'scene_ep3_fahsai_invitation_and_din_sighting',
            title: 'ฟ้าใสชวนและเห็นดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep3_looking_around',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep3_friendly_booth',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep3_passing_art_bg', // ดินอยู่ฉากหลังแบบเลือนๆ
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ thoughtful
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fahsai_ep3_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อ้าว [ชื่อคุณ]! มาหาชมรมเหรอ? สนใจชมรมดนตรีไหมล่ะ?" (โบกมือทักคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep3_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ก็...ยังไม่แน่ใจน่ะค่ะ กำลังดูๆ อยู่" (คุณมองไปรอบๆ พลันสายตาก็เห็นดินกำลังเดินผ่านบูธชมรมศิลปะไปอย่างช้าๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep3_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"งั้นลองมาฟังพี่ๆ เล่นดนตรีก่อนสิ อาจจะชอบก็ได้นะ" (ยิ้มชวน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep3_choices', // ไปยังฉากตัวเลือก
            timelineTracks: []
        },

        // Scene 3: ตัวเลือกในตอนที่ 3
        {
            novelId,
            episodeId,
            sceneOrder: 3,
            nodeId: 'scene_ep3_choices',
            title: 'ตัวเลือกการตัดสินใจ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep3_thinking_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep3_waiting_choice',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep3',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะตอบฟ้าใสว่าอย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep3_club_selection',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },
        // --- START Episode 3: กิจกรรมชมรมและจุดเริ่มต้นของมิตรภาพ ---
        // Scene 1: บทนำและบรรยากาศในงานเปิดบ้านชมรม
        {
            novelId,
            episodeId,
            sceneOrder: 25, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 2 (ซึ่งจบที่ 24)
            nodeId: 'scene_ep3_intro_club_fair',
            title: 'กิจกรรมชมรมและจุดเริ่มต้นของมิตรภาพ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png', // รูปบรรยากาศงานเปิดบ้านชมรม
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [],
            textContents: [
                {
                    instanceId: 'narration_ep3_intro',
                    type: TextContentType.NARRATION,
                    content: 'โรงเรียนจัดกิจกรรมเปิดบ้านชมรม คุณกำลังเดินเลือกชมรมที่สนใจ สายตาไปสะดุดกับบูธชมรมดนตรี ที่มีเสียงเพลงไพเราะลอยออกมา คุณเห็นฟ้าใสกำลังยิ้มทักทายนักเรียนใหม่ที่สนใจชมรมนี้',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_school_fair',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศงานชมรม
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep3_fahsai_invitation_and_din_sighting', // ไปยังฉากฟ้าใสเชิญชวนและเห็นดิน
            timelineTracks: []
        },

        // Scene 2: ฟ้าใสชวน และเห็นดิน
        {
            novelId,
            episodeId,
            sceneOrder: 26, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep3_fahsai_invitation_and_din_sighting',
            title: 'ฟ้าใสชวนและเห็นดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep3_looking_around',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep3_friendly_booth',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep3_passing_art_bg', // ดินอยู่ฉากหลังแบบเลือนๆ
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ thoughtful
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_fahsai_ep3_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อ้าว [ชื่อคุณ]! มาหาชมรมเหรอ? สนใจชมรมดนตรีไหมล่ะ?" (โบกมือทักคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep3_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ก็...ยังไม่แน่ใจน่ะค่ะ กำลังดูๆ อยู่" (คุณมองไปรอบๆ พลันสายตาก็เห็นดินกำลังเดินผ่านบูธชมรมศิลปะไปอย่างช้าๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep3_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"งั้นลองมาฟังพี่ๆ เล่นดนตรีก่อนสิ อาจจะชอบก็ได้นะ" (ยิ้มชวน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep3_choices', // ไปยังฉากตัวเลือก
            timelineTracks: []
        },

        // Scene 3: ตัวเลือกในตอนที่ 3
        {
            novelId,
            episodeId,
            sceneOrder: 27, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep3_choices',
            title: 'ตัวเลือกการตัดสินใจ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schooloutdoor.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep3_thinking_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep3_waiting_choice',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep3',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะตอบฟ้าใสว่าอย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep3_club_selection',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },
        // episode 4
        // Scene 1 (เชื่อมจาก Choice A ใน Episode 3): เข้าชมรมดนตรีกับฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 28, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 3
            nodeId: 'scene_ep4_choice_A_music_club',
            title: 'ชมรมดนตรี: เสียงแห่งมิตรภาพ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/music.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep4_music_happy',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep4_music_excited',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_ep4_A_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"โอ้โห...เครื่องดนตรีเยอะแยะไปหมดเลยค่ะ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep4_A_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ใช่แล้วล่ะ! ที่นี่คือสวรรค์ของคนรักดนตรีเลยนะ" (เธอยิ้มกว้าง) "มาทางนี้สิ เดี๋ยวฉันแนะนำให้รู้จักพี่ๆ ในชมรม"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep4_A_intro_pmew',
                    type: TextContentType.NARRATION,
                    content: '(ฟ้าใสแนะนำคุณให้รู้จักกับรุ่นพี่และเพื่อนร่วมชมรม คุณได้ลองสัมผัสเครื่องดนตรีต่างๆ และรับรู้ถึงบรรยากาศที่เป็นกันเองและอบอุ่นของชมรมดนตรี)',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_pmew_ep4_A_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.mew, // ID รุ่นพี่มิว
                    speakerDisplayName: 'พี่มิว',
                    content: '"ยินดีต้อนรับสู่ชมรมดนตรีนะน้อง! มีอะไรให้ช่วยบอกได้เลยนะ เรามีกิจกรรมเยอะแยะเลย ทั้งซ้อมดนตรี จัดคอนเสิร์ตเล็กๆ ในโรงเรียน หรือจะแค่มานั่งฟังเพลงก็ได้"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep4_A_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ขอบคุณค่ะพี่มิว หนูรู้สึกดีมากๆ เลยที่นี่" (ยิ้มอย่างสบายใจ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep4_A_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"เห็นไหมล่ะ ฉันบอกแล้วว่าเธอต้องชอบ" (เธอหันมามองคุณด้วยแววตาเป็นประกาย) "อีกไม่นานเราอาจจะได้ขึ้นเวทีด้วยกันก็ได้นะ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep4_A_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'บางทีการมาโรงเรียนใหม่ก็ไม่ได้แย่ไปซะทั้งหมด การได้เจอฟ้าใสและเพื่อนๆ ในชมรมดนตรีก็ทำให้ฉันรู้สึกไม่โดดเดี่ยวอีกต่อไป...',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep5_intro_math_class', // เชื่อมไปยังตอนที่ 5
            timelineTracks: []
        },

        // Scene 2 (เชื่อมจาก Choice B ใน Episode 3): แกล้งเดินไปชนดิน เพื่อพูดคุย (นำไปชมรมศิลปะ)
        {
            novelId,
            episodeId,
            sceneOrder: 29, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep4_choice_B_art_club',
            title: 'ชมรมศิลปะ: ภาพสะท้อนของใครบางคน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/artclub.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep4_art_confused',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep4_art_present', // ดินปรากฏตัวจากทางเดินหลังจากถูกชน
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ annoyed
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_ep4_B_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"โอ๊ย! ขอโทษค่ะดิน ฉันไม่ได้ตั้งใจ" (แกล้งเดินไปชนดินเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep4_B_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อีกแล้วเหรอเธอ..."',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep4_B_art_club_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเหตุการณ์อลหม่านเล็กน้อย ดินก็เดินเข้าไปในห้องชมรมศิลปะ คุณตัดสินใจเดินตามเข้าไปอย่างเงียบๆ ห้องชมรมค่อนข้างเงียบ มีเพียงนักเรียนไม่กี่คนที่กำลังวาดรูปอยู่',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep4_B_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'รูปนี้...ดินหยุดดูมันอยู่พักนึง ทำไมนะ? มันดูเศร้าๆ ยังไงไม่รู้...',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep4_B_art_club_explore',
                    type: TextContentType.NARRATION,
                    content: '(คุณสำรวจรอบๆ ห้อง และเห็นว่ามุมหนึ่งของห้องมีรูปปั้นดินเผาที่ดูแปลกตา มันเป็นรูปปั้นที่ยังไม่เสร็จดี แต่แฝงไปด้วยพลังงานบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_B_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida, // ID ไอด้า
                    speakerDisplayName: 'ไอด้า',
                    content: '"อ้าว! มาสมัครชมรมเหรอ? ไม่ค่อยมีใครมาเลยช่วงนี้" (เดินเข้ามาเห็นคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep4_B_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เปล่าค่ะ พอดี...ผ่านมาเห็นน่ะค่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_B_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida,
                    speakerDisplayName: 'ไอด้า',
                    content: '"อ้อ...งั้นลองดูรอบๆ ก่อนก็ได้นะ ชมรมเราอาจจะเงียบๆ หน่อย แต่ก็มีอะไรให้ทำเยอะนะ" (เธอหันไปมองรูปปั้นดินเผา) "ผลงานของ **\'ดิน\'** น่ะ เขาไม่ค่อยมาชมรมหรอก แต่ถ้ามาทีไรก็สร้างอะไรแปลกๆ ตลอดเลย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep4_B_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...?" (พึมพำ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_B_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida,
                    speakerDisplayName: 'ไอด้า',
                    content: '"ใช่ เขาชื่อดินน่ะ ชอบทำอะไรแปลกๆ แบบนี้แหละ บางทีก็ดูเข้าถึงยากหน่อย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep4_B_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'เขาไม่ได้สนใจแค่รูปวาด แต่เขายังสร้างสรรค์ผลงานเองด้วยงั้นเหรอ? ดิน...นายเป็นคนยังไงกันแน่?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 600, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep5_intro_math_class', // เชื่อมไปยังตอนที่ 5
            timelineTracks: []
        },

        // Scene 3 (เชื่อมจาก Choice C ใน Episode 3): บอกฟ้าใสว่าขอเดินดูเองก่อน (นำไปชมรมศิลปะเอง)
        {
            novelId,
            episodeId,
            sceneOrder: 30, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep4_choice_C_explore_art',
            title: 'ชมรมศิลปะ: สำรวจด้วยตัวเอง',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/artclub.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep4_art_exploring',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_lisa_ep4_C_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ชมรมศิลปะ...ก็เงียบดีนะ น่าจะเหมาะกับการคิดอะไรเพลินๆ',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep4_C_art_club_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณเดินเข้าไปในห้องชมรมศิลปะอย่างเงียบๆ สายตาไปสะดุดกับรูปวาดนามธรรมรูปหนึ่งที่ดูคุ้นตา มันเป็นรูปที่ใช้สีโทนหม่นๆ แต่แฝงไปด้วยความรู้สึกบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep4_C_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'รูปนี้...เหมือนกับที่ฉันเห็นดินหยุดมองเมื่อกี้เลยนี่นา',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep4_C_art_club_explore',
                    type: TextContentType.NARRATION,
                    content: '(คุณสำรวจรอบๆ ห้อง และเห็นว่ามุมหนึ่งของห้องมีรูปปั้นดินเผาที่ดูแปลกตา มันเป็นรูปปั้นที่ยังไม่เสร็จดี แต่แฝงไปด้วยพลังงานบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_C_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida, // ID ไอด้า
                    speakerDisplayName: 'ไอด้า',
                    content: '"อ้าว! มาสมัครชมรมเหรอ? ไม่ค่อยมีใครมาเลยช่วงนี้" (เดินเข้ามาเห็นคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep4_C_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เปล่าค่ะ พอดี...ผ่านมาเห็นน่ะค่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_C_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida,
                    speakerDisplayName: 'ไอด้า',
                    content: '"อ้อ...งั้นลองดูรอบๆ ก่อนก็ได้นะ ชมรมเราอาจจะเงียบๆ หน่อย แต่ก็มีอะไรให้ทำเยอะนะ" (เธอหันไปมองรูปปั้นดินเผา) "ผลงานของ **\'ดิน\'** น่ะ เขาไม่ค่อยมาชมรมหรอก แต่ถ้ามาทีไรก็สร้างอะไรแปลกๆ ตลอดเลย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep4_C_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...?" (พึมพำ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_aida_ep4_C_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.aida,
                    speakerDisplayName: 'ไอด้า',
                    content: '"ใช่ เขาชื่อดินน่ะ ชอบทำอะไรแปลกๆ แบบนี้แหละ บางทีก็ดูเข้าถึงยากหน่อย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep4_C_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'เขาไม่ได้สนใจแค่รูปวาด แต่เขายังสร้างสรรค์ผลงานเองด้วยงั้นเหรอ? ดิน...นายเป็นคนยังไงกันแน่?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep5_intro_math_class', // เชื่อมไปยังตอนที่ 5
            timelineTracks: []
        },
        // --- START Episode 5: ความท้าทายครั้งแรก ---
        // Scene 1: บทนำในห้องเรียนคณิตศาสตร์
        {
            novelId,
            episodeId,
            sceneOrder: 31, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 4
            nodeId: 'scene_ep5_intro_math_class',
            title: 'ความท้าทายครั้งแรก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep5_sitting',
                    characterId: characterMap.lisa,
                    expressionId: 'worried',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep5_sitting',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep5_intro',
                    type: TextContentType.NARRATION,
                    content: 'วิชาคณิตศาสตร์ยังคงเป็นความท้าทายสำหรับคุณ วันนี้คุณครูสมศรีมีการทดสอบย่อยเรื่องสมการเชิงเส้นที่คุณยังไม่ค่อยถนัดเท่าไหร่',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_classroom',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.5,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep5_teacher_ask',
            timelineTracks: []
        },

        // Scene 2: ครูสมศรีถามและคุณรู้สึกกดดัน
        {
            novelId,
            episodeId,
            sceneOrder: 32, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep5_teacher_ask',
            title: 'ครูสมศรีเริ่มสอบ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep5_stressed',
                    characterId: characterMap.lisa,
                    expressionId: 'worried',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri_ep5',
                    characterId: characterMap.somsri,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_teacher_ep5_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somsri,
                    speakerDisplayName: 'คุณครูสมศรี',
                    content: '"เอาล่ะนักเรียนทุกคน วันนี้เราจะมาทดสอบความเข้าใจเรื่องสมการเชิงเส้นกันนะคะ ครูจะให้เวลา 15 นาที ใครเสร็จก่อนส่งได้เลยค่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep5_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ตายแล้ว...ทำไมฉันยังงงอยู่อีกนะ! ถ้าทำไม่ได้คะแนนน้อย คุณครูสมศรีจะต้องผิดหวังแน่ๆ',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep5_din_whisper',
            timelineTracks: []
        },

        // Scene 3: ดินกระซิบช่วย
        {
            novelId,
            episodeId,
            sceneOrder: 33, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep5_din_whisper',
            title: 'ดินช่วยเหลือ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep5_confused_exam',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep5_whispering',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep5_din_whisper_action',
                    type: TextContentType.NARRATION,
                    content: '(คุณก้มหน้ามองข้อสอบอย่างเคร่งเครียด พยายามนึกถึงสิ่งที่ดินเคยกระซิบสอนในคาบที่แล้ว "ก็แค่มองว่ามันคือกระจก สลับฝั่งเมื่อไหร่ก็กลับด้านทันที") (ในขณะที่คุณกำลังขมวดคิ้วคิดอย่างหนัก คุณรู้สึกได้ถึงแรงสะกิดเบาๆ ที่แขน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep5_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ข้อแรก...ดูที่เครื่องหมายให้ดีๆ" (กระซิบเบาๆ ข้างหูคุณ เสียงเย็นชาแต่ชัดเจน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep5_lisa_observe_din',
                    type: TextContentType.NARRATION,
                    content: '(คุณเงยหน้ามองดินเล็กน้อย เขาไม่ได้มองคุณตรงๆ แต่สายตาของเขากลับมองไปที่ข้อสอบของคุณแวบหนึ่ง ก่อนจะกลับไปจดจ่อที่ข้อสอบของตัวเอง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep5_2',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'จริงด้วย...มันไม่ได้ยากอย่างที่คิดนี่นา! ดิน...เขากำลังช่วยฉันเหรอเนี่ย?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep5_end_of_class',
            timelineTracks: []
        },

        // Scene 4: จบคาบเรียนและคุยกับฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 34, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep5_end_of_class',
            title: 'จบคาบเรียน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep5_relieved',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ happy
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'teacher_som_sri_ep5_end',
                    characterId: characterMap.somsri,
                    expressionId: 'kind', // ยิ้ม
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep5_leaving_class', // ดินเก็บของเดินออกไป
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep5_approach',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0, zIndex: 2 }, // เริ่มต้นซ่อน
                    isVisible: false
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep5_finish_exam',
                    type: TextContentType.NARRATION,
                    content: '(คุณเริ่มลงมือทำข้อสอบข้ออื่นๆ ด้วยความมั่นใจมากขึ้น และส่งข้อสอบทันเวลา)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_teacher_ep5_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somsri,
                    speakerDisplayName: 'คุณครูสมศรี',
                    content: '"ดีมากค่ะ [ชื่อคุณ] ดูท่าจะเข้าใจขึ้นแล้วนะ" (ยิ้มให้เล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep5_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ค่ะคุณครู ขอบคุณค่ะ" (คุณหันไปมองดินอีกครั้ง เขากำลังเก็บของเตรียมออกจากห้องเรียนเหมือนไม่มีอะไรเกิดขึ้น)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep5_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"เป็นไงบ้างข้อสอบคณิต? ยากไหม? ฉันเห็นเธอทำหน้าเครียดเชียว" (เดินมาหาคุณหลังเลิกเรียน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep5_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ก็เกือบไปแล้วค่ะฟ้าใส โชคดีที่พอทำได้บ้าง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep5_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดีเลย! ถ้ามีอะไรให้ช่วยเรื่องการเรียนบอกฉันได้เลยนะ ฉันพอจะช่วยได้บ้าง" (เธอยิ้มให้กำลังใจ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep5_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันควรจะบอกฟ้าใสดีไหมนะว่าดินช่วยฉัน? หรือเก็บเป็นความลับระหว่างฉันกับเขาดี?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: null, // แก้ไขตรงนี้ให้ชี้ไปยังฉากต่อไป (ตอนที่ 6)
            timelineTracks: [
                {
                    trackId: 'fah_sai_entry',
                    trackName: 'Fah Sai Entry',
                    events: [
                        {
                            eventId: 'show_fah_sai',
                            startTimeMs: 3000,
                            eventType: 'show_character',
                            targetInstanceId: 'fah_sai_ep5_approach',
                            parameters: {
                                transitionDurationMs: 500
                            }
                        }
                    ]
                }
            ]
        },
        // --- START Episode 6: ปมเล็กๆ ที่ซ่อนอยู่ ---
        // Scene 1: บทนำในห้องสมุดและความคิดของลิสา
        {
            novelId,
            episodeId,
            sceneOrder: 35, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 5
            nodeId: 'scene_ep6_intro_library',
            title: 'ปมเล็กๆ ที่ซ่อนอยู่',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/library.png', // รูปห้องสมุดยามเย็น
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep6_thinking_library',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ thoughtful
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep6_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากคาบเรียนที่ผ่านมา คุณยังคงคิดถึงเรื่องที่ดินแอบช่วยในวิชาคณิตศาสตร์ คุณตั้งใจจะมาหาหนังสือเพิ่มเติมในห้องสมุดเพื่อทำความเข้าใจเนื้อหาให้มากขึ้น และก็ต้องประหลาดใจกับสิ่งที่ได้เห็น',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep6_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันควรจะบอกฟ้าใสเรื่องดินดีไหมนะ...หรือว่าปล่อยไปแบบนี้แหละ? ช่างเถอะ ตอนนี้ไปหาหนังสือคณิตศาสตร์ก่อนดีกว่า',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_library_quiet',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศห้องสมุดเงียบๆ
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep6_fahsai_bracelet', // ไปยังฉากฟ้าใสกังวล
            timelineTracks: []
        },

        // Scene 2: ลิสาเห็นฟ้าใสกังวลเรื่องกำไล
        {
            novelId,
            episodeId,
            sceneOrder: 36, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep6_fahsai_bracelet',
            title: 'ฟ้าใสผู้กังวล',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/library.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep6_observing_fahsai',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep6_worried',
                    characterId: characterMap.fah_sai,
                    expressionId: 'worried', // อาจจะต้องเพิ่ม expression 'worried' ให้ฟ้าใส
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep6_fahsai_spot',
                    type: TextContentType.NARRATION,
                    content: '(คุณเดินเข้าไปในโซนหนังสือเรียน แต่สายตาก็พลันเห็นร่างคุ้นเคยที่มุมหนึ่งของห้องสมุด **ฟ้าใส** กำลังนั่งก้มหน้าอยู่กับโต๊ะ ปกติเธอจะยิ้มแย้มสดใสเสมอ แต่วันนี้กลับดูหม่นหมอง เธอถือกำไลข้อมืออันหนึ่งไว้ในมือและพึมพำกับตัวเองเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep6_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ไม่น่าทำหายเลย...แม่ต้องโกรธแน่ๆ เลย" (เสียงแผ่วเบา สังเกตเห็นได้ถึงความกังวล)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep6_2',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฟ้าใส...ดูไม่เหมือนปกติเลยแฮะ เกิดอะไรขึ้นกับเธอนะ?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep6_din_sighting_library', // ไปยังฉากเห็นดิน
            timelineTracks: []
        },

        // Scene 3: ลิสาเห็นดินอ่านหนังสือและดูเศร้าหมอง
        {
            novelId,
            episodeId,
            sceneOrder: 37, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep6_din_sighting_library',
            title: 'ดินกับความลับ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/library.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep6_observing_din',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep6_reading_gloomy',
                    characterId: characterMap.din,
                    expressionId: 'thoughtful', // อาจจะต้องเพิ่ม expression 'gloomy' หรือ 'sad' ให้ดิน
                    transform: { positionX: 200, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep6_still_worried_bg', // ฟ้าใสยังอยู่ในฉากหลังแต่เลือนๆ
                    characterId: characterMap.fah_sai,
                    expressionId: 'worried',
                    transform: { positionX: -200, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.5, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep6_din_spot',
                    type: TextContentType.NARRATION,
                    content: '(ในเวลาเดียวกัน คุณก็ได้ยินเสียงกระดาษพลิกเบาๆ จากอีกมุมหนึ่งของห้องสมุด คุณหันไปมอง และเห็น **ดิน** กำลังนั่งอ่านหนังสือเล่มหนึ่งที่ไม่ได้ดูเหมือนตำราเรียน มันเป็นหนังสือปกเก่าๆ ดูลึกลับ เขาอ่านอย่างจดจ่อ แต่สีหน้าของเขากลับดูเหม่อลอยคล้ายกำลังครุ่นคิดอะไรบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep6_3',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'หนังสืออะไรน่ะ...ไม่เคยเห็นดินอ่านหนังสือแบบนี้มาก่อนเลย...แล้วทำไมเขาถึงดูเศร้าๆ แบบนั้นนะ?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep6_lisa_hesitates',
                    type: TextContentType.NARRATION,
                    content: '(คุณลังเลว่าจะเข้าไปทักใครดี แต่สุดท้ายก็ตัดสินใจว่าจะไม่เข้าไปขัดจังหวะทั้งคู่ในตอนนี้ เพราะดูเหมือนต่างคนต่างก็มีเรื่องของตัวเองให้คิด)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep7_intro_festival_prep', // แก้ไขตรงนี้ให้ชี้ไปยังฉากแรกของตอนที่ 7
            timelineTracks: []
        },
        // --- START Episode 7: กิจกรรมโรงเรียน: การเตรียมงาน ---
        // Scene 1: บทนำในห้องโถงอเนกประสงค์
        {
            novelId,
            episodeId,
            sceneOrder: 38, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 6
            nodeId: 'scene_ep7_intro_festival_prep',
            title: 'กิจกรรมโรงเรียน: การเตรียมงาน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolhall.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep7_carrying_box',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep7_intro',
                    type: TextContentType.NARRATION,
                    content: 'โรงเรียนกำลังเตรียมจัดงานวัฒนธรรมประจำปี "แสงอรุณเฟสติวัล" ซึ่งเป็นงานใหญ่ที่นักเรียนทุกคนต้องมีส่วนร่วม คุณเองก็ถูกมอบหมายให้เข้ามาช่วยงานนี้เช่นกัน ไม่ว่าจะในฐานะสมาชิกชมรมที่คุณเลือก หรืออาสาสมัครทั่วไป',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep7_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"โห...งานใหญ่กว่าที่คิดไว้เยอะเลยแฮะ" (ถือกล่องอุปกรณ์เดินเข้าไปในห้องโถง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_festival_prep',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.5,
                    loop: true,
                    autoplayOnLoad: true
                },
                {
                    instanceId: 'sfx_chatter',
                    type: 'audio_effect',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.3,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep7_senior_assign_task', // ไปยังฉากรุ่นพี่มอบหมายงาน
            timelineTracks: []
        },

        // Scene 2: รุ่นพี่มอบหมายงาน (ตามเส้นทางความสัมพันธ์)
        {
            novelId,
            episodeId,
            sceneOrder: 39, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep7_senior_assign_task',
            title: 'รุ่นพี่มอบหมายงาน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolhall.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep7_ready_to_help',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                // ใช้ตัวละครรุ่นพี่ตามที่สัมพันธ์ด้วยมากที่สุด
                {
                    instanceId: 'senior_ep7_assigning',
                    characterId: characterMap.mew, // แก้ไข characterId เป็น 'p_mew' หรือ 'aida' ตามแต่เส้นทาง
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'dialogue_senior_ep7_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.mew, // แก้ไข characterId เป็น 'p_mew' หรือ 'aida'
                    speakerDisplayName: 'พี่มิว', // หรือ พี่ไอด้า
                    content: '"อ้าว [ชื่อคุณ]! มาพอดีเลย มาช่วยพี่ทางนี้หน่อยสิ เรากำลังจัดเตรียมบูธเกมส์อยู่พอดีเลย"', // หรือ "มาช่วยพี่ดูเรื่องพร็อพบนเวทีหน่อยสิ"
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep7_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ได้เลยค่ะ!" (วางกล่องและเริ่มช่วยงาน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep7_fahsai_rehearsal', // ไปยังฉากฟ้าใสซ้อม
            timelineTracks: []
        },

        // Scene 3: เห็นฟ้าใสซ้อมดนตรี
        {
            novelId,
            episodeId,
            sceneOrder: 40, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep7_fahsai_rehearsal',
            title: 'ฟ้าใสกับการซ้อมดนตรี',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/small.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep7_observing_fahsai',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep7_rehearsing',
                    characterId: characterMap.fah_sai,
                    expressionId: 'normal', // หรือ worried (ตามบท)
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep7_fahsai_spot',
                    type: TextContentType.NARRATION,
                    content: '(คุณช่วยงานไปเรื่อยๆ จนกระทั่งเดินผ่านเวทีหลัก ที่นั่น **ฟ้าใส** กำลังซ้อมเล่นเปียโนกับเพื่อนในชมรมดนตรี เธอเล่นได้อย่างไพเราะ แต่สีหน้ายังแฝงความกังวลเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep7_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"โอ๊ย! เหนื่อยจัง [ชื่อคุณ]! การแสดงของเราต้องออกมาดีที่สุดเลยนะ" (เห็นคุณและโบกมือยิ้มเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep7_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"สู้ๆ นะฟ้าใส! เสียงเปียโนฟ้าใสเพราะมากๆ เลย" (ยิ้มตอบ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep7_din_art_prep', // ไปยังฉากดินจัดแสดงศิลปะ
            timelineTracks: []
        },

        // Scene 4: เห็นดินจัดแสดงผลงานศิลปะ
        {
            novelId,
            episodeId,
            sceneOrder: 41, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep7_din_art_prep',
            title: 'ดินกับผลงานศิลปะ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/artwork.png', // รูปโซนจัดแสดงศิลปะ
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep7_observing_din',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep7_arranging_art',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ thoughtful
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'p_oak_ep7_coordinating',
                    characterId: characterMap.p_oak, // ID รุ่นพี่โอ๊ค
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep7_din_spot',
                    type: TextContentType.NARRATION,
                    content: '(หลังจากนั้น คุณเดินไปที่โซนจัดแสดงผลงานศิลปะเพื่อนำอุปกรณ์ไปเก็บ และเห็น **ดิน** กำลังช่วยรุ่นพี่จัดเรียงรูปภาพบนแผงจัดแสดง เขาดูนิ่งเงียบแต่ทำงานได้คล่องแคล่วและจัดวางได้อย่างแม่นยำ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_p_oak_ep7_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.p_oak,
                    speakerDisplayName: 'พี่โอ๊ค',
                    content: '"ดิน! ช่วยยกรูปปั้นอันนี้มาวางตรงกลางหน่อยสิ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep7_din_action_sculpture',
                    type: TextContentType.NARRATION,
                    content: '(ดินพยักหน้าเล็กน้อยและค่อยๆ ยกรูปปั้นดินเผาขนาดเล็กชิ้นหนึ่ง ซึ่งดูคุ้นตาคุณ...มันคือรูปปั้นชิ้นเดียวกับที่คุณเคยเห็นในชมรมศิลปะ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep7_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'รูปปั้นนั้น...มันของดินจริงๆ ด้วย! เขาทำมันได้ยังไงกันนะ...',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep8_festival_pre_incident', // แก้ไขตรงนี้ให้ชี้ไปยังฉากแรกของตอนที่ 8
            timelineTracks: []
        },
        // --- START Episode 8: เหตุการณ์พลิกผันในงานกิจกรรม ---
        // Scene 1: บรรยากาศงานเทศกาลก่อนเหตุการณ์
        {
            novelId,
            episodeId,
            sceneOrder: 42, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 7
            nodeId: 'scene_ep8_festival_pre_incident',
            title: 'เหตุการณ์พลิกผันในงานกิจกรรม',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/festivalday.png', // รูปห้องโถงวันงาน
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep8_at_booth',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ happy
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep8_intro',
                    type: TextContentType.NARRATION,
                    content: 'งาน "แสงอรุณเฟสติวัล" ดำเนินไปอย่างราบรื่น ผู้คนมากมายมาร่วมงาน เสียงเพลงและเสียงหัวเราะดังไปทั่ว คุณกำลังช่วยงานอยู่หลังบูธของคุณ...',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep8_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'งานสนุกกว่าที่คิดไว้เยอะเลยแฮะ! ผู้คนก็เยอะมากๆ ด้วย',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_festival_lively',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศเทศกาลคึกคัก
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.7,
                    loop: true,
                    autoplayOnLoad: true
                },
                {
                    instanceId: 'sfx_crowd_chatter',
                    type: 'audio_effect',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเสียงผู้คนคุยกัน
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep8_power_outage', // ไปยังฉากไฟดับ
            timelineTracks: []
        },

        // Scene 2: เหตุการณ์ไฟดับกะทันหัน
        {
            novelId,
            episodeId,
            sceneOrder: 43, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep8_power_outage',
            title: 'ไฟดับ!',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/festivaldayfddark.png', // รูปห้องโถงมืดลง/มีปัญหาไฟ
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep8_shocked',
                    characterId: characterMap.lisa,
                    expressionId: 'confused', // หรือ shocked
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep8_power_loss',
                    type: TextContentType.NARRATION,
                    content: '(จู่ๆ เสียงเพลงที่กำลังบรรเลงอยู่บนเวทีก็ขาดหายไป มีเสียงซ่าๆ ดังขึ้นแทนที่ ไฟบนเวทีกระพริบสองสามครั้งแล้วก็ดับลง บรรยากาศที่คึกคักเมื่อครู่พลันเงียบลง มีเสียงพึมพำและเสียงฮือฮาดังขึ้นแทนที่)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_teacher_ep8_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.somchai,
                    speakerDisplayName: 'คุณครูผู้ดูแลงาน',
                    content: '"เกิดอะไรขึ้นน่ะ! ระบบไฟมีปัญหาเหรอ!?" (เสียงลนลาน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep8_2',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'อะไรกันเนี่ย! ระบบไฟดับเหรอ? แล้วการแสดงของชมรมดนตรีจะทำยังไง? ฟ้าใสจะเป็นยังไงบ้างนะ?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'sfx_power_cut',
                    type: 'audio_effect',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเสียงไฟดับ/เสียงซ่า
                    mediaSourceType: 'OfficialMedia',
                    volume: 1.0,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep8_observe_characters', // ไปยังฉากสังเกตตัวละคร
            timelineTracks: []
        },

        // Scene 3: สังเกตฟ้าใส ดิน และพี่มิว
        {
            novelId,
            episodeId,
            sceneOrder: 44, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep8_observe_characters',
            title: 'สถานการณ์ฉุกเฉิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/festivaldayfddark.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep8_observing',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep8_panicked',
                    characterId: characterMap.fah_sai,
                    expressionId: 'worried', // หรือ alarmed
                    transform: { positionX: -200, positionY: 0, scaleX: 0.9, scaleY: 0.9, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep8_analyzing',
                    characterId: characterMap.din,
                    expressionId: 'thoughtful', // หรือ normal_cold
                    transform: { positionX: 200, positionY: 0, scaleX: 0.9, scaleY: 0.9, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'p_mew_ep8_worried_run',
                    characterId: characterMap.mew, // แก้ไข characterId เป็น 'p_mew'
                    expressionId: 'worried',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0, zIndex: 2 }, // เริ่มต้นซ่อน
                    isVisible: false
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep8_observe_fahsai',
                    type: TextContentType.NARRATION,
                    content: '(คุณมองไปที่เวที เห็นฟ้าใสยืนอยู่ข้างเปียโนด้วยสีหน้าตื่นตระหนกเล็กน้อย ใกล้ๆ กัน มีสายไฟบางเส้นที่ดูเหมือนถูกเหยียบจนขาด หรือมีปลั๊กหลุดออกมา)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep8_observe_din',
                    type: TextContentType.NARRATION,
                    content: '(จากอีกมุมหนึ่งของห้องโถง ดินซึ่งปกติจะอยู่เงียบๆ กำลังจ้องมองไปที่สายไฟที่ชำรุดนั้นด้วยสีหน้าเรียบนิ่ง แต่แววตาของเขาดูเหมือนกำลังวิเคราะห์อะไรบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_p_mew_ep8_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.mew, // แก้ไข characterId เป็น 'p_mew'
                    speakerDisplayName: 'พี่มิว',
                    content: '"แย่แล้ว! สายไฟขาด! แบบนี้การแสดงต้องหยุดชะงักแน่ๆ!" (วิ่งเข้ามาด้วยสีหน้ากังวล)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep8_choices', // ไปยังฉากตัวเลือก
            timelineTracks: [
                {
                    trackId: 'p_mew_entry',
                    trackName: 'P Mew Entry',
                    events: [
                        {
                            eventId: 'show_p_mew',
                            startTimeMs: 2000,
                            eventType: 'show_character',
                            targetInstanceId: 'p_mew_ep8_worried_run',
                            parameters: {
                                transitionDurationMs: 500
                            }
                        }
                    ]
                }
            ]
        },

        // Scene 4: ฉากตัวเลือก
        {
            novelId,
            episodeId,
            sceneOrder: 45, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep8_choices',
            title: 'ตัดสินใจช่วยเหลือ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/festivaldayfddark.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep8_deciding',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep8',
                    type: TextContentType.NARRATION,
                    content: 'ในสถานการณ์ฉุกเฉินนี้ คุณจะตัดสินใจทำอย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep8_incident_response',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },

        // --- START Episode 9: บทสนทนาที่จริงใจ (เส้นทาง ดิน) ---
        // Scene 2: บทนำในห้องเรียนว่างๆ กับดิน
        {
            novelId,
            episodeId,
            sceneOrder: 2, // ลำดับสำหรับเส้นทางดิน
            nodeId: 'scene_ep9_path_din',
            title: 'บทสนทนาที่จริงใจ: ดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon4.png', // รูปห้องเรียนว่างๆ ยามเย็น
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep9_din_talk',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep9_reading_quiet',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep9_din_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังเหตุการณ์ระบบไฟขัดข้องที่ดินดูเหมือนจะรู้อะไรบางอย่างแต่ก็ยังนิ่งเงียบ คุณรู้สึกสนใจในตัวเขามากขึ้นและตัดสินใจเข้าไปคุยกับเขาหลังจากเหตุการณ์วุ่นวายจบลง คุณพบเขาอยู่ที่ห้องเรียนว่างๆ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...นายอยู่ที่นี่เอง" (เดินเข้าไปในห้องเรียนอย่างระมัดระวัง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"มีอะไร?" (เงยหน้าขึ้นจากหนังสือเล่มเก่าที่อ่านอยู่ สีหน้าเรียบนิ่งเหมือนเดิม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เรื่องเมื่อกี้...ตอนที่ไฟดับน่ะ นายดูเหมือนจะรู้อะไรบางอย่าง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ก็แค่...เคยเจอเหตุการณ์คล้ายๆ กันมาก่อน" (หลบสายตาเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แล้วทำไมนายไม่บอกใครล่ะ? ถ้าบอกเร็วกว่านี้ อาจจะไม่วุ่นวายขนาดนั้นก็ได้นะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"มันไม่ใช่เรื่องของฉัน...อีกอย่าง พวกนั้นก็คงไม่ฟังคนที่ชอบเก็บตัวอย่างฉันหรอก" (ถอนหายใจเล็กน้อย) "แต่...ฉันก็ไม่ได้อยากให้งานมันพังหรอกนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นาย...เป็นห่วงใช่ไหม?" (สังเกตเห็นแววตาบางอย่างในตัวดิน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"เปล่า...แค่รำคาญเฉยๆ" (หันมามองคุณตรงๆ แววตาแฝงความประหลาดใจเล็กน้อย ก่อนจะเบือนหน้าหนี แต่เสียงของเขาไม่ได้เย็นชาเท่าครั้งก่อน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_5',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นายไม่จำเป็นต้องเย็นชาตลอดเวลาก็ได้นะดิน...บางทีการเปิดใจก็ไม่ได้แย่อย่างที่คิดหรอก" (ยิ้มเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep9_din_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ดินคนนี้...เขาไม่ได้แค่เย็นชา แต่เขายังมีมุมที่เป็นห่วงคนอื่น และอาจจะยังซ่อนความรู้สึกอะไรบางอย่างไว้มากกว่าที่ฉันคิด',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 600, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_classroom_quiet_evening',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศห้องเรียนเงียบๆ ยามเย็น
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: null, // จบเส้นทางนี้, จะเชื่อมไปยังตอนที่ 10 (ถ้าเป็นไปได้คือตอนที่ 10 ที่เน้นดิน)
            timelineTracks: []
        },
        // --- START Episode 9: บทสนทนาที่จริงใจ (เส้นทาง ฟ้าใส) ---
        // Scene 1: บทนำบนดาดฟ้ากับฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 46, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 8
            nodeId: 'scene_ep9_path_fahsai',
            title: 'บทสนทนาที่จริงใจ: ฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolrooftop.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep9_fahsai_talk',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep9_distressed',
                    characterId: characterMap.fah_sai,
                    expressionId: 'worried',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep9_fahsai_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังเหตุการณ์ระบบไฟขัดข้องที่ดินดูเหมือนจะรู้อะไรบางอย่างแต่ก็ยังนิ่งเงียบ คุณรู้สึกสนใจในตัวเขามากขึ้นและตัดสินใจเข้าไปคุยกับเขาหลังจากเหตุการณ์วุ่นวายจบลง คุณพบเขาอยู่ที่ห้องเรียนว่างๆ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส...เธอไม่เป็นไรนะ? ฉันเห็นตอนนั้นเธอตกใจมากเลย"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep9_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ก็...นิดหน่อยน่ะลิสา ฉันแค่กลัวว่าทุกอย่างจะพังเพราะฉันน่ะ...เพราะว่าฉัน...ทำกำไลนำโชคของแม่หาย" (มองเหม่อไปที่ท้องฟ้า)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_fahsai_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"กำไลนำโชคเหรอ?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep9_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ใช่...มันเป็นกำไลที่แม่ให้ฉันไว้ตั้งแต่เด็กๆ บอกว่าเป็นเครื่องรางนำโชคให้ฉันทำทุกอย่างสำเร็จ วันงานเปิดบ้านชมรมฉันคงทำมันหายที่ไหนสักแห่งน่ะ พอเกิดเรื่องไฟดับขึ้นมา ฉันก็เลยคิดว่า...มันเป็นเพราะฉันไม่มีกำไลนั่นแล้ว" (เสียงสั่นเล็กน้อย) "มันฟังดูงี่เง่าใช่ไหมล่ะ?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_fahsai_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ไม่เลยฟ้าใส...มันไม่ใช่ความผิดของเธอหรอกนะ กำไลนั่นอาจจะสำคัญกับเธอมาก แต่มันไม่ใช่สิ่งที่ทำให้ฟ้าใสเป็นฟ้าใสที่เก่งและสดใสอย่างทุกวันนี้หรอกนะ ที่ผ่านมาเธอก็ทำทุกอย่างได้ดีมาตลอดไม่ใช่เหรอ?" (จับมือฟ้าใสเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep9_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ลิสา..." (เธอค่อยๆ ยิ้มออกมาเล็กน้อย) "ขอบคุณนะ...ขอบคุณจริงๆ ที่เข้าใจ" (เงยหน้ามองคุณช้าๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep9_fahsai_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฟ้าใสที่อ่อนแอแบบนี้...เป็นอีกมุมที่ฉันไม่เคยเห็นเลย เธอไม่ได้เป็นแค่ดาวโรงเรียนที่สมบูรณ์แบบเสมอไปจริงๆ ด้วย',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_rooftop_calm',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศดาดฟ้าเงียบสงบ
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.5,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep10_path_fahsai_feelings', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 10
            timelineTracks: []
        },

        // --- START Episode 9: บทสนทนาที่จริงใจ (เส้นทาง ดิน) ---
        // Scene 2: บทนำในห้องเรียนว่างๆ กับดิน
        {
            novelId,
            episodeId,
            sceneOrder: 47, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep9_path_din',
            title: 'บทสนทนาที่จริงใจ: ดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Salon4.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep9_din_talk',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep9_reading_quiet',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep9_din_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังเหตุการณ์ระบบไฟขัดข้องที่ดินดูเหมือนจะรู้อะไรบางอย่างแต่ก็ยังนิ่งเงียบ คุณรู้สึกสนใจในตัวเขามากขึ้นและตัดสินใจเข้าไปคุยกับเขาหลังจากเหตุการณ์วุ่นวายจบลง คุณพบเขาอยู่ที่ห้องเรียนว่างๆ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...นายอยู่ที่นี่เอง" (เดินเข้าไปในห้องเรียนอย่างระมัดระวัง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"มีอะไร?" (เงยหน้าขึ้นจากหนังสือเล่มเก่าที่อ่านอยู่ สีหน้าเรียบนิ่งเหมือนเดิม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เรื่องเมื่อกี้...ตอนที่ไฟดับน่ะ นายดูเหมือนจะรู้อะไรบางอย่าง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ก็แค่...เคยเจอเหตุการณ์คล้ายๆ กันมาก่อน" (หลบสายตาเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แล้วทำไมนายไม่บอกใครล่ะ? ถ้าบอกเร็วกว่านี้ อาจจะไม่วุ่นวายขนาดนั้นก็ได้นะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"มันไม่ใช่เรื่องของฉัน...อีกอย่าง พวกนั้นก็คงไม่ฟังคนที่ชอบเก็บตัวอย่างฉันหรอก" (ถอนหายใจเล็กน้อย) "แต่...ฉันก็ไม่ได้อยากให้งานมันพังหรอกนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นาย...เป็นห่วงใช่ไหม?" (สังเกตเห็นแววตาบางอย่างในตัวดิน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep9_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"เปล่า...แค่รำคาญเฉยๆ" (หันมามองคุณตรงๆ แววตาแฝงความประหลาดใจเล็กน้อย ก่อนจะเบือนหน้าหนี แต่เสียงของเขาไม่ได้เย็นชาเท่าครั้งก่อน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep9_din_5',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นายไม่จำเป็นต้องเย็นชาตลอดเวลาก็ได้นะดิน...บางทีการเปิดใจก็ไม่ได้แย่อย่างที่คิดหรอก" (ยิ้มเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep9_din_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ดินคนนี้...เขาไม่ได้แค่เย็นชา แต่เขายังมีมุมที่เป็นห่วงคนอื่น และอาจจะยังซ่อนความรู้สึกอะไรบางอย่างไว้มากกว่าที่ฉันคิด',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 600, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_classroom_quiet_evening',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID ของเพลงบรรยากาศห้องเรียนเงียบๆ ยามเย็น
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep10_path_din_feelings', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 10
            timelineTracks: []
        },
        // --- START Episode 11: การแข่งขันเพื่อความรัก (หรือมิตรภาพ) ---

        // Scene 1: บทนำที่สนามบาสเกตบอล (กรณีดินเริ่มแสดงออกชัดเจนขึ้น)
        {
            novelId,
            episodeId,
            sceneOrder: 48, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 9
            nodeId: 'scene_ep11_din_approach_basketball_court',
            title: 'ดินกับคำชวนที่คาดไม่ถึง',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/basketball.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep11_walking_court',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep11_sitting_court',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep11_intro_din_path',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเหตุการณ์ในห้องเรียนคณิตฯ และการค้นพบมุมใหม่ของดิน ความสัมพันธ์ระหว่างคุณกับเขาเริ่มพัฒนาไปในทิศทางที่ซับซ้อนขึ้น วันนี้ คุณบังเอิญเห็นเหตุการณ์ที่ไม่คาดฝันในสนามบาสฯ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ทางนี้" (โบกมือเรียกคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep11_1_din_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"มีอะไรเหรอดิน? ทำไมมานั่งอยู่ตรงนี้คนเดียว?" (เดินไปหาเขาด้วยความแปลกใจเล็กน้อย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"เธอ...ชอบเสียงเพลงใช่ไหม?" (เขาไม่ตอบทันที แต่จ้องมองคุณนิ่งๆ เหมือนกำลังตัดสินใจอะไรบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep11_2_din_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"อ่า...ก็ชอบค่ะ ทำไมเหรอ?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้าอย่างนั้น...มาฟังฉันเล่นดนตรีไหม?" (เขาลุกขึ้นยืน ก้าวเข้ามาใกล้คุณเล็กน้อย) "ไม่ใช่เปียโน...แต่เป็นกีตาร์" (เขาพูดด้วยเสียงเรียบๆ แต่แววตาจริงจัง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_basketball_court',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep11_fahsai_intervenes_din_path',
            timelineTracks: []
        },

        // Scene 2: ฟ้าใสเข้ามาแทรก (ในเส้นทางที่ดินเริ่มแสดงออก)
        {
            novelId,
            episodeId,
            sceneOrder: 49, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep11_fahsai_intervenes_din_path',
            title: 'ฟ้าใสเข้ามาแทรก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/basketball.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep11_confused_fahsai_din',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep11_challenged',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep11_intervening',
                    characterId: characterMap.fah_sai,
                    expressionId: 'concerned',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 2 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep11_fahsai_appears_din_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้นเอง **ฟ้าใส** ที่เพิ่งเดินผ่านมาพร้อมเพื่อนอีกคน ก็หยุดชะงักเมื่อได้ยินคำชวนของดิน เธอมองมาที่คุณกับดินสลับกัน แววตาของเธอเปลี่ยนไปเล็กน้อยจากความสดใสเป็นความประหลาดใจและแฝงความกังวลบางอย่าง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep11_1_din_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อ้าว...คุยอะไรกันอยู่เหรอจ๊ะ?" (เดินเข้ามาหาคุณกับดินด้วยรอยยิ้มที่ดูพยายาม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ไม่มีอะไร...แค่ชวนเธอไปฟังดนตรี" (หันไปมองฟ้าใสเพียงครู่เดียว ก่อนจะกลับมาจ้องมองคุณอีกครั้ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep11_2_din_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"เหรอ...แต่ [ชื่อคุณ] อยู่ชมรมดนตรีกับฉันนะ ถ้าชอบดนตรีก็มาซ้อมด้วยกันที่ชมรมสิ" (ยิ้มเจื่อนๆ) (เธอยื่นมือมาจับแขนคุณเบาๆ เหมือนจะดึงให้ไปกับเธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep11_din_path_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ดินชวนฉันฟังเขาเล่นดนตรี? นี่เขาจริงจังเหรอ? แล้วฟ้าใส...ทำไมเธอถึงดูแปลกๆ ไปนะ?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep11_choices',
            timelineTracks: []
        },

        // Scene 3: บทนำที่โรงอาหาร (กรณีฟ้าใสพยายามเข้าใกล้ลิสามากขึ้น)
        {
            novelId,
            episodeId,
            sceneOrder: 50, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep11_fahsai_approach_cafeteria',
            title: 'ฟ้าใสผู้ใกล้ชิด',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Cafeteria1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep11_walking_cafeteria',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep11_clingy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'happy',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep11_intro_fahsai_path',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเหตุการณ์ในห้องเรียนคณิตฯ และการค้นพบมุมใหม่ของฟ้าใส ความสัมพันธ์ระหว่างคุณกับเธอก็เริ่มพัฒนาไปในทิศทางที่ซับซ้อนขึ้น วันนี้คุณกำลังเดินกลับจากโรงอาหารกับฟ้าใส เธอพูดคุยเรื่องชมรมดนตรีอย่างกระตือรือร้น แต่คุณรู้สึกว่าวันนี้เธอดูติดคุณเป็นพิเศษ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep11_1_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"[ชื่อคุณ]! อาทิตย์หน้าชมรมเราจะมีการแสดงพิเศษนะ เธอต้องมาช่วยฉันเลือกเพลงนะ! แล้วก็...หลังเลิกเรียนวันนี้ไปดูหนังกันไหม? ฉันได้ตั๋วมาสองใบพอดีเลย!" (เธอยิ้มกว้างและจับมือคุณแน่น)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep11_1_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"เอ่อ...วันนี้เลยเหรอฟ้าใส? ฉันก็อยากไปนะ แต่..."',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_cafeteria_lively',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep11_din_intervenes_fahsai_path',
            timelineTracks: []
        },

        // Scene 4: ดินเข้ามาแทรก (ในเส้นทางที่ฟ้าใสแสดงออก)
        {
            novelId,
            episodeId,
            sceneOrder: 51, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep11_din_intervenes_fahsai_path',
            title: 'ดินเข้ามาแทรก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Cafeteria1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep11_between_fahsai_din',
                    characterId: characterMap.lisa,
                    expressionId: 'confused',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep11_annoyed_din',
                    characterId: characterMap.fah_sai,
                    expressionId: 'concerned',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep11_annoyed_fahsai',
                    characterId: characterMap.din,
                    expressionId: 'annoyed',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep11_din_appears_fahsai_path',
                    type: TextContentType.NARRATION,
                    content: '(ทันใดนั้น **ดิน** ที่กำลังเดินผ่านมาพร้อมหนังสือในมือ ก็หยุดกะทันหันเมื่อเห็นคุณกับฟ้าใส เขาหรี่ตาลงเล็กน้อย มองมือที่ฟ้าใสจับคุณอยู่ ก่อนจะถอนหายใจออกมาเบาๆ อย่างไม่พอใจ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_1_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"เสียงดัง" (เสียงเรียบนิ่ง แต่สัมผัสได้ถึงความขุ่นมัว)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep11_2_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อะไรของนายดิน! นายไม่เกี่ยวซะหน่อย!" (หันไปมองดินอย่างไม่พอใจ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep11_3_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้าอยากรู้เรื่องสมการยากๆ มากกว่านี้...พรุ่งนี้หลังเลิกเรียนฉันว่าง" (เมินหน้าหนีฟ้าใส แต่จ้องมองคุณนิ่งๆ) (เขาพูดแค่นั้นแล้วเดินจากไปทันที โดยไม่รอคำตอบ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep11_4_fahsai_path',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อะไรของเขานะ! ไม่เคยเข้าใจเลยคนแบบเนี้ย! อย่าไปสนใจเลย [ชื่อคุณ] ไปดูหนังกันดีกว่านะ!" (บ่นอุบอิบ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep11_fahsai_path_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ดิน...เขามาไม้ไหนเนี่ย? แล้วฟ้าใสก็ดูไม่ชอบดินเอามากๆ เลย...นี่ฉันกำลังอยู่ตรงกลางของอะไรบางอย่างอยู่เหรอเนี่ย?',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep11_choices',
            timelineTracks: []
        },

        // Scene 5: ฉากตัวเลือก (สำหรับทุกเส้นทางที่มาถึง)
        {
            novelId,
            episodeId,
            sceneOrder: 52, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep11_choices',
            title: 'เผชิญหน้ากับความรู้สึก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/Cafeteria1.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep11_deciding_choices',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep11',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะตอบรับคำชวนของใคร หรือเลือกที่จะจัดการกับสถานการณ์นี้อย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep11_love_or_friendship',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้องที่นี่
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },
        // --- START Episode 12: การเผชิญหน้ากับความจริง (เส้นทาง ฟ้าใส) ---

        // Scene 1: บทนำในห้องชมรมศิลปะกับฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 53, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 11
            nodeId: 'scene_ep12_path_fahsai_confrontation',
            title: 'เผชิญหน้าความจริง: ฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/NighttimeArt.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep12_fahsai_talk',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep12_sad',
                    characterId: characterMap.fah_sai,
                    expressionId: 'concerned', // หรือ sad/worried
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep12_fahsai_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเหตุการณ์ที่สนามบาสฯ หรือเหตุการณ์ที่ฟ้าใสแสดงออกชัดเจนขึ้น คุณรู้สึกว่าต้องเคลียร์ใจกับเธอ คุณชวนฟ้าใสมาคุยกันที่ห้องชมรมศิลปะ เพราะรู้ว่าที่นี่มักจะเงียบสงบ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส...ฉันมีเรื่องอยากจะคุยกับเธอหน่อยน่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep12_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"เรื่องอะไรเหรอ? เรื่องที่ฉันดูแปลกๆ ไปใช่ไหม? หรือว่า...เรื่องดิน?" (ยิ้มเศร้าๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_fahsai_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉัน...ฉันแค่รู้สึกว่าช่วงนี้เธอไม่ค่อยสบายใจน่ะ มีอะไรที่ฉันพอจะช่วยได้ไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep12_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"จริงๆ แล้ว...ฉันชอบเธอนะ [ชื่อคุณ]" (ถอนหายใจ) (เธอพูดออกมาอย่างตรงไปตรงมา แต่แววตาเต็มไปด้วยความกังวล) "ตั้งแต่เธอเข้ามา ฉันก็รู้สึกดีๆ กับเธอมาตลอดเลย เธอเป็นคนแรกที่มองทะลุรอยยิ้มของฉันออกไป...เป็นคนแรกที่ทำให้ฉันรู้สึกว่าไม่ต้องสมบูรณ์แบบก็ได้"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_fahsai_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส..." (ตกใจเล็กน้อยกับคำสารภาพของฟ้าใส)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep12_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"และฉันก็รู้...ว่าดินก็สนใจเธอเหมือนกัน" (เธอก้มหน้า) "กำไลนำโชคของแม่ที่หายไปน่ะ...จริงๆ แล้วฉันไม่ได้กลัวว่าจะทำให้แม่โกรธอย่างเดียวหรอกนะ ฉันกลัวว่าฉันจะไม่มีอะไรพิเศษพอที่จะอยู่ข้างเธอได้ต่างหาก...ฉันกลัวว่าถ้าไม่มีกำไลนั่น ฉันก็ไม่ใช่ฟ้าใสที่คู่ควรกับความรู้สึกดีๆ ของใคร"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_fahsai_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส...เธอไม่จำเป็นต้องมีกำไลนำโชคอะไรเลย เธอดีพออยู่แล้ว...และฉันก็ชอบเธอที่เป็นเธอแบบนี้จริงๆ นะ" (สวมกอดฟ้าใสเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_art_club_night_calm',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep13_graduation_intro', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 13
            timelineTracks: []
        },

        // --- START Episode 12: การเผชิญหน้ากับความจริง (เส้นทาง ดิน) ---
        // Scene 2: บทนำในห้องชมรมศิลปะกับดิน
        {
            novelId,
            episodeId,
            sceneOrder: 54, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep12_path_din_confrontation',
            title: 'เผชิญหน้าความจริง: ดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/NighttimeArt.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep12_din_talk',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep12_normal',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep12_din_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเหตุการณ์ที่สนามบาสฯ หรือท่าทีของดินที่เปลี่ยนไป คุณรู้สึกว่าต้องทำความเข้าใจกับเขาให้ชัดเจน คุณชวนดินมาคุยกันที่ห้องชมรมศิลปะ ซึ่งเป็นที่ที่คุณรู้ว่าเขามักจะมาอยู่เงียบๆ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...นายมีอะไรอยากจะบอกฉันใช่ไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep12_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"นี่...คือสมุดของปู่ฉัน" (เขานั่งเงียบอยู่ครู่หนึ่ง ก่อนจะลุกขึ้นยืนแล้วเดินไปที่มุมหนึ่งของห้อง และหยิบสมุดเก่าๆ เล่มหนึ่งออกมา มันคือ "สมุดรุ่น" เล่มเก่าๆ ที่มีหน้ากระดาษว่างเปล่าเหลืออยู่ไม่มากนัก)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"สมุดรุ่น?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep12_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ปู่ฉัน...เป็นนักดนตรี เขาเคยรักดนตรีมาก แต่ก็ถูกสังคมกดดันให้ไปทำอาชีพอื่น ตอนที่เขาเสียไป เขาขอให้ฉันวาดรูปเขาเล่นดนตรีในสมุดเล่มนี้...แต่ฉันก็ไม่เคยทำได้เลย" (เปิดหน้าสมุดออก หน้าแรกๆ มีรูปวาดง่ายๆ ของเด็กผู้ชายคนหนึ่งกำลังเล่นเปียโน) (เขาใช้มือลูบภาพวาดเหล่านั้น) "ฉันกลัว...กลัวว่าถ้าฉันจริงจังกับอะไรมากๆ แล้วมันจะไม่เป็นอย่างที่หวัง...เหมือนที่ปู่ฉันเคยเป็น"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep12_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นายเลยเลือกที่จะเก็บตัว ไม่แสดงความรู้สึกใช่ไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep12_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ฉันไม่ชอบความวุ่นวาย ไม่ชอบการถูกตัดสิน...และฉันก็ไม่คิดว่าจะมีใครเข้าใจ" (พยักหน้า) (เขาหันมามองคุณตรงๆ แววตาที่เคยเย็นชาตอนนี้กลับแฝงความอ่อนโยนและเจ็บปวด) "จนกระทั่ง...เธอเข้ามา"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep12_din_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'นี่คือปมของเขาจริงๆ ด้วย...ความกลัวที่จะผิดหวังเหมือนกับคนที่เขารัก',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep12_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ฉันรู้ว่าฉัน...ปากไม่ดี บางทีก็ทำให้เธอเข้าใจผิด...แต่ฉัน...ฉันอยากอยู่ข้างๆ เธอ" (เขาพูดออกมาอย่างยากลำบาก แต่คำพูดนั้นหนักแน่น) "ฉันอยากจะลองกล้าหาญมากขึ้น...เพื่อเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_art_club_night_calm',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(), // ID เพลงบรรยากาศห้องศิลปะยามค่ำคืน
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.4,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep13_graduation_intro', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 13
            timelineTracks: []
        },
        // --- START Episode 13: บทสรุปของความสัมพันธ์ (เส้นทางที่ 1) ---

        // Scene 1: บทนำในพิธีจบการศึกษา
        {
            novelId,
            episodeId,
            sceneOrder: 55, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 12
            nodeId: 'scene_ep13_graduation_intro',
            title: 'บทสรุปของความสัมพันธ์',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_at_graduation',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_intro',
                    type: TextContentType.NARRATION,
                    content: 'วันนี้คือวันสำคัญ วันสุดท้ายในรั้วโรงเรียนแสงอรุณ ก่อนที่ทุกคนจะแยกย้ายกันไปตามเส้นทางของตัวเอง คุณยืนอยู่ท่ามกลางเพื่อนๆ พร้อมกับความรู้สึกที่หลากหลายในใจ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_graduation_day',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep13_choices',
            timelineTracks: []
        },

        // Scene 2: ฉากตัวเลือก (สำหรับเลือกเส้นทางความสัมพันธ์)
        {
            novelId,
            episodeId,
            sceneOrder: 56, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_choices',
            title: 'ตัดสินใจเส้นทางความรัก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_making_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'thoughtful',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep13',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเผชิญหน้ากับความจริงในใจของตนเอง คุณจะตัดสินใจเลือกเส้นทางความสัมพันธ์หลักในตอนนี้อย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep13_final_love_path',
                    choiceGroupId: new mongoose.Types.ObjectId(),
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null,
            timelineTracks: []
        },

        // Scene 3 (เชื่อมจาก Choice A ใน Episode 13): ลิสาเลือกฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 57, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_fahsai_couple',
            title: 'เส้นทาง: ลิสากับฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณยืนอยู่กับ **ฟ้าใส** เธอสวมชุดครุยสีขาวบริสุทธิ์และยิ้มอย่างสดใส เธอเป็นคนแรกที่คุณมองหาในวันนี้)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดีใจจังเลยนะ [ชื่อคุณ] ที่ได้เจอเธอที่นี่" (จับมือคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็เหมือนกันฟ้าใส...ดีใจที่ได้รู้จักเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"หลังจากนี้...ถึงเราจะไม่ได้เรียนที่เดียวกัน แต่เราก็ยังเป็นเพื่อนที่ดีต่อกันได้เสมอใช่ไหม?" (เธอจ้องตาคุณด้วยแววตาที่เต็มไปด้วยความหวังและความรู้สึก)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_2_choice',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แน่นอนอยู่แล้วฟ้าใส! ไม่ว่าเราจะไปที่ไหน มิตรภาพของเราก็จะยังคงอยู่เสมอ...และฉันก็อยากให้มันพัฒนาต่อไปด้วยนะ" (กระชับมือฟ้าใสแน่น) (คุณส่งยิ้มที่อบอุ่นที่สุดให้เธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"จริงนะ! ฉัน...ฉันก็จะพยายามให้ดีที่สุดเหมือนกัน! เพื่อเรา" (รอยยิ้มของเธอกว้างขึ้น และดวงตาเป็นประกาย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_din_passing_fahsai_path',
            timelineTracks: []
        },

        // Scene 4: ดินเดินผ่าน (กรณีลิสาเลือกฟ้าใส)
        {
            novelId,
            episodeId,
            sceneOrder: 58, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_din_passing_fahsai_path',
            title: 'ดินกับรอยยิ้มบางๆ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_still_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_passing_by',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_passing_fahsai_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ดิน** เดินผ่านมา เขามองมาที่คุณสองคนเล็กน้อย แล้วพยักหน้าให้คุณเบาๆ ก่อนจะเดินจากไปเงียบๆ แม้จะมีร่องรอยของความรู้สึกบางอย่างในแววตา แต่ก็เป็นการยอมรับและก้าวต่อไป)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_fahsai_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'เส้นทางใหม่กำลังจะเริ่มต้นขึ้น...และฉันก็พร้อมที่จะเดินไปกับความสัมพันธ์นี้',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start',
            timelineTracks: []
        },

        // Scene 5 (เชื่อมจาก Choice B ใน Episode 13): ลิสาเลือกดิน
        {
            novelId,
            episodeId,
            sceneOrder: 59, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_din_couple',
            title: 'เส้นทาง: ลิสากับดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_slight_smile',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณกำลังยืนอยู่กับ **ดิน** ที่มุมหนึ่งของสนาม เขาดูเนี้ยบในชุดครุย แต่ยังคงมีแววตาที่สงบนิ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ไม่น่าเชื่อเลยนะดิน...ว่าวันนี้จะมาถึงแล้ว"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อืม...เวลาผ่านไปเร็วจริงๆ" (หันมามองคุณ) (เขายกมือขึ้นมาลูบผมคุณเบาๆ ซึ่งเป็นการกระทำที่ไม่บ่อยนักจากเขา) "ขอบคุณนะที่ทำให้ฉัน...กล้าที่จะลอง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็ขอบคุณนายเหมือนกันนะดิน...ที่ทำลายกำแพงของตัวเองเพื่อฉัน"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ฉัน...จะพยายามแสดงออกให้มากกว่านี้" (มุมปากยกขึ้นเล็กน้อยเป็นรอยยิ้มที่หาดูยาก) (เขาพูดด้วยเสียงแผ่วเบา แต่จริงใจ) "หลังจากนี้...ไม่ว่าเธอจะไปเรียนที่ไหน...ฉันก็จะอยู่ข้างๆ เสมอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็จะอยู่ข้างๆ นายเสมอเหมือนกันนะดิน" (จับมือเขาแน่น)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_fahsai_passing_din_path',
            timelineTracks: []
        },

        // Scene 6: ฟ้าใสเดินผ่าน (กรณีลิสาเลือกดิน)
        {
            novelId,
            episodeId,
            sceneOrder: 60, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_fahsai_passing_din_path',
            title: 'ฟ้าใสกับรอยยิ้มเข้าใจ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_still_happy',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_passing_by',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_passing_din_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ฟ้าใส** กำลังมองมาที่คุณสองคนจากระยะไกล เธอไม่ได้เข้ามาทัก แต่ส่งรอยยิ้มที่เต็มไปด้วยความเข้าใจและคำอวยพรให้คุณ ก่อนจะหันไปเดินกับกลุ่มเพื่อนของเธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_din_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันเลือกทางเดินนี้แล้ว...และฉันก็พร้อมที่จะเรียนรู้ความรักไปพร้อมกับเขา',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start',
            timelineTracks: []
        },

        // Scene 7 (เชื่อมจาก Choice C ใน Episode 13): ลิสาเลือกเน้นมิตรภาพ / ไม่คบใคร
        {
            novelId,
            episodeId,
            sceneOrder: 61, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_friendship_only',
            title: 'เส้นทาง: มิตรภาพอันล้ำค่า',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_alone_observing',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_friendship_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณยืนอยู่คนเดียวเล็กน้อย มองดูเพื่อนๆ ถ่ายรูปกันอย่างสนุกสนาน คุณมีความสุขที่ได้เห็นทุกคนมีความสุข)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_friend_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"[ชื่อคุณ]! มาถ่ายรูปด้วยกันสิ!" (เดินเข้ามาพร้อมรอยยิ้ม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_friend_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ยินดีด้วยนะ" (เดินเข้ามาจากอีกทางหนึ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_friend_1_choice',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ขอบคุณนะฟ้าใส ขอบคุณนะดิน" (ยิ้มให้ทั้งสองคน) (คุณรู้สึกถึงความผูกพันที่แน่นแฟ้นกับทั้งคู่) "ดีใจนะที่ได้เป็นเพื่อนกับพวกเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_friend_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"แน่นอนอยู่แล้วสิ! เราเป็นเพื่อนกันตลอดไปนะ!" (เธอกอดคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_friend_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้ามีอะไร...ก็บอกแล้วกัน" (พยักหน้าเล็กน้อย) (แม้คำพูดจะสั้นๆ แต่แววตากลับเต็มไปด้วยความห่วงใย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_friendship_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันอาจจะยังไม่พร้อมที่จะตัดสินใจเรื่องความรักในตอนนี้ แต่การมีมิตรภาพที่แข็งแกร่งแบบนี้ก็ถือเป็นของขวัญที่ล้ำค่าที่สุดแล้ว...',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start',
            timelineTracks: []
        },

        // --- START Episode 13: บทสรุปของความสัมพันธ์ (เส้นทางที่ 1) ---
        // Scene 1: บทนำในพิธีจบการศึกษา
        {
            novelId,
            episodeId,
            sceneOrder: 55, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 12
            nodeId: 'scene_ep13_graduation_intro',
            title: 'บทสรุปของความสัมพันธ์',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_at_graduation',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_intro',
                    type: TextContentType.NARRATION,
                    content: 'วันนี้คือวันสำคัญ วันสุดท้ายในรั้วโรงเรียนแสงอรุณ ก่อนที่ทุกคนจะแยกย้ายกันไปตามเส้นทางของตัวเอง คุณยืนอยู่ท่ามกลางเพื่อนๆ พร้อมกับความรู้สึกที่หลากหลายในใจ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_graduation_day',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep13_choices',
            timelineTracks: []
        },

        // Scene 2: ฉากตัวเลือก (สำหรับเลือกเส้นทางความสัมพันธ์)
        {
            novelId,
            episodeId,
            sceneOrder: 56, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_choices',
            title: 'ตัดสินใจเส้นทางความรัก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_making_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'thoughtful',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep13',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเผชิญหน้ากับความจริงในใจของตนเอง คุณจะตัดสินใจเลือกเส้นทางความสัมพันธ์หลักในตอนนี้อย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep13_final_love_path',
                    choiceGroupId: new mongoose.Types.ObjectId(),
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null,
            timelineTracks: []
        },

        // Scene 3 (เชื่อมจาก Choice A ใน Episode 13): ลิสาเลือกฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 57, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_fahsai_couple',
            title: 'เส้นทาง: ลิสากับฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณยืนอยู่กับ **ฟ้าใส** เธอสวมชุดครุยสีขาวบริสุทธิ์และยิ้มอย่างสดใส เธอเป็นคนแรกที่คุณมองหาในวันนี้)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดีใจจังเลยนะ [ชื่อคุณ] ที่ได้เจอเธอที่นี่" (จับมือคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็เหมือนกันฟ้าใส...ดีใจที่ได้รู้จักเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"หลังจากนี้...ถึงเราจะไม่ได้เรียนที่เดียวกัน แต่เราก็ยังเป็นเพื่อนที่ดีต่อกันได้เสมอใช่ไหม?" (เธอจ้องตาคุณด้วยแววตาที่เต็มไปด้วยความหวังและความรู้สึก)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_2_choice',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แน่นอนอยู่แล้วฟ้าใส! ไม่ว่าเราจะไปที่ไหน มิตรภาพของเราก็จะยังคงอยู่เสมอ...และฉันก็อยากให้มันพัฒนาต่อไปด้วยนะ" (กระชับมือฟ้าใสแน่น) (คุณส่งยิ้มที่อบอุ่นที่สุดให้เธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"จริงนะ! ฉัน...ฉันก็จะพยายามให้ดีที่สุดเหมือนกัน! เพื่อเรา" (รอยยิ้มของเธอกว้างขึ้น และดวงตาเป็นประกาย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_din_passing_fahsai_path',
            timelineTracks: []
        },

        // Scene 4: ดินเดินผ่าน (กรณีลิสาเลือกฟ้าใส)
        {
            novelId,
            episodeId,
            sceneOrder: 58, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_din_passing_fahsai_path',
            title: 'ดินกับรอยยิ้มบางๆ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_still_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_passing_by',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_passing_fahsai_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ดิน** เดินผ่านมา เขามองมาที่คุณสองคนเล็กน้อย แล้วพยักหน้าให้คุณเบาๆ ก่อนจะเดินจากไปเงียบๆ แม้จะมีร่องรอยของความรู้สึกบางอย่างในแววตา แต่ก็เป็นการยอมรับและก้าวต่อไป)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_fahsai_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'เส้นทางใหม่กำลังจะเริ่มต้นขึ้น...และฉันก็พร้อมที่จะเดินไปกับความสัมพันธ์นี้',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 14
            timelineTracks: []
        },

        // Scene 5 (เชื่อมจาก Choice B ใน Episode 13): ลิสาเลือกดิน
        {
            novelId,
            episodeId,
            sceneOrder: 59, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_din_couple',
            title: 'เส้นทาง: ลิสากับดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_slight_smile',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณกำลังยืนอยู่กับ **ดิน** ที่มุมหนึ่งของสนาม เขาดูเนี้ยบในชุดครุย แต่ยังคงมีแววตาที่สงบนิ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ไม่น่าเชื่อเลยนะดิน...ว่าวันนี้จะมาถึงแล้ว"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อืม...เวลาผ่านไปเร็วจริงๆ" (หันมามองคุณ) (เขายกมือขึ้นมาลูบผมคุณเบาๆ ซึ่งเป็นการกระทำที่ไม่บ่อยนักจากเขา) "ขอบคุณนะที่ทำให้ฉัน...กล้าที่จะลอง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็ขอบคุณนายเหมือนกันนะดิน...ที่ทำลายกำแพงของตัวเองเพื่อฉัน"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ฉัน...จะพยายามแสดงออกให้มากกว่านี้" (มุมปากยกขึ้นเล็กน้อยเป็นรอยยิ้มที่หาดูยาก) (เขาพูดด้วยเสียงแผ่วเบา แต่จริงใจ) "หลังจากนี้...ไม่ว่าเธอจะไปเรียนที่ไหน...ฉันก็จะอยู่ข้างๆ เสมอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็จะอยู่ข้างๆ นายเสมอเหมือนกันนะดิน" (จับมือเขาแน่น)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_fahsai_passing_din_path',
            timelineTracks: []
        },

        // Scene 6: ฟ้าใสเดินผ่าน (กรณีลิสาเลือกดิน)
        {
            novelId,
            episodeId,
            sceneOrder: 60, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_fahsai_passing_din_path',
            title: 'ฟ้าใสกับรอยยิ้มเข้าใจ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_still_happy',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_passing_by',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_passing_din_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ฟ้าใส** กำลังมองมาที่คุณสองคนจากระยะไกล เธอไม่ได้เข้ามาทัก แต่ส่งรอยยิ้มที่เต็มไปด้วยความเข้าใจและคำอวยพรให้คุณ ก่อนจะหันไปเดินกับกลุ่มเพื่อนของเธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_din_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันเลือกทางเดินนี้แล้ว...และฉันก็พร้อมที่จะเรียนรู้ความรักไปพร้อมกับเขา',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 14
            timelineTracks: []
        },
        // --- START Episode 13: บทสรุปของความสัมพันธ์ (เส้นทางที่ 1) ---

        // Scene 1: บทนำในพิธีจบการศึกษา
        {
            novelId,
            episodeId,
            sceneOrder: 55, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 12
            nodeId: 'scene_ep13_graduation_intro',
            title: 'บทสรุปของความสัมพันธ์',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_at_graduation',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_intro',
                    type: TextContentType.NARRATION,
                    content: 'วันนี้คือวันสำคัญ วันสุดท้ายในรั้วโรงเรียนแสงอรุณ ก่อนที่ทุกคนจะแยกย้ายกันไปตามเส้นทางของตัวเอง คุณยืนอยู่ท่ามกลางเพื่อนๆ พร้อมกับความรู้สึกที่หลากหลายในใจ',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_graduation_day',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: 'scene_ep13_choices',
            timelineTracks: []
        },

        // Scene 2: ฉากตัวเลือก (สำหรับเลือกเส้นทางความสัมพันธ์)
        {
            novelId,
            episodeId,
            sceneOrder: 56, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_choices',
            title: 'ตัดสินใจเส้นทางความรัก',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_making_choice',
                    characterId: characterMap.lisa,
                    expressionId: 'thoughtful',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep13',
                    type: TextContentType.NARRATION,
                    content: 'หลังจากเผชิญหน้ากับความจริงในใจของตนเอง คุณจะตัดสินใจเลือกเส้นทางความสัมพันธ์หลักในตอนนี้อย่างไร?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep13_final_love_path',
                    choiceGroupId: new mongoose.Types.ObjectId(),
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null,
            timelineTracks: []
        },

        // Scene 3 (เชื่อมจาก Choice A ใน Episode 13): ลิสาเลือกฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 57, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_fahsai_couple',
            title: 'เส้นทาง: ลิสากับฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณยืนอยู่กับ **ฟ้าใส** เธอสวมชุดครุยสีขาวบริสุทธิ์และยิ้มอย่างสดใส เธอเป็นคนแรกที่คุณมองหาในวันนี้)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดีใจจังเลยนะ [ชื่อคุณ] ที่ได้เจอเธอที่นี่" (จับมือคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็เหมือนกันฟ้าใส...ดีใจที่ได้รู้จักเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"หลังจากนี้...ถึงเราจะไม่ได้เรียนที่เดียวกัน แต่เราก็ยังเป็นเพื่อนที่ดีต่อกันได้เสมอใช่ไหม?" (เธอจ้องตาคุณด้วยแววตาที่เต็มไปด้วยความหวังและความรู้สึก)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_fahsai_2_choice',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แน่นอนอยู่แล้วฟ้าใส! ไม่ว่าเราจะไปที่ไหน มิตรภาพของเราก็จะยังคงอยู่เสมอ...และฉันก็อยากให้มันพัฒนาต่อไปด้วยนะ" (กระชับมือฟ้าใสแน่น) (คุณส่งยิ้มที่อบอุ่นที่สุดให้เธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"จริงนะ! ฉัน...ฉันก็จะพยายามให้ดีที่สุดเหมือนกัน! เพื่อเรา" (รอยยิ้มของเธอกว้างขึ้น และดวงตาเป็นประกาย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_din_passing_fahsai_path',
            timelineTracks: []
        },

        // Scene 4: ดินเดินผ่าน (กรณีลิสาเลือกฟ้าใส)
        {
            novelId,
            episodeId,
            sceneOrder: 58, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_din_passing_fahsai_path',
            title: 'ดินกับรอยยิ้มบางๆ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_fahsai_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_still_happy',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_passing_by',
                    characterId: characterMap.din,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_passing_fahsai_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ดิน** เดินผ่านมา เขามองมาที่คุณสองคนเล็กน้อย แล้วพยักหน้าให้คุณเบาๆ ก่อนจะเดินจากไปเงียบๆ แม้จะมีร่องรอยของความรู้สึกบางอย่างในแววตา แต่ก็เป็นการยอมรับและก้าวต่อไป)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_fahsai_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'เส้นทางใหม่กำลังจะเริ่มต้นขึ้น...และฉันก็พร้อมที่จะเดินไปกับความสัมพันธ์นี้',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 14
            timelineTracks: []
        },

        // Scene 5 (เชื่อมจาก Choice B ใน Episode 13): ลิสาเลือกดิน
        {
            novelId,
            episodeId,
            sceneOrder: 59, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_din_couple',
            title: 'เส้นทาง: ลิสากับดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_slight_smile',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_din_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณกำลังยืนอยู่กับ **ดิน** ที่มุมหนึ่งของสนาม เขาดูเนี้ยบในชุดครุย แต่ยังคงมีแววตาที่สงบนิ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ไม่น่าเชื่อเลยนะดิน...ว่าวันนี้จะมาถึงแล้ว"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อืม...เวลาผ่านไปเร็วจริงๆ" (หันมามองคุณ) (เขายกมือขึ้นมาลูบผมคุณเบาๆ ซึ่งเป็นการกระทำที่ไม่บ่อยนักจากเขา) "ขอบคุณนะที่ทำให้ฉัน...กล้าที่จะลอง"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็ขอบคุณนายเหมือนกันนะดิน...ที่ทำลายกำแพงของตัวเองเพื่อฉัน"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ฉัน...จะพยายามแสดงออกให้มากกว่านี้" (มุมปากยกขึ้นเล็กน้อยเป็นรอยยิ้มที่หาดูยาก) (เขาพูดด้วยเสียงแผ่วเบา แต่จริงใจ) "หลังจากนี้...ไม่ว่าเธอจะไปเรียนที่ไหน...ฉันก็จะอยู่ข้างๆ เสมอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉันก็จะอยู่ข้างๆ นายเสมอเหมือนกันนะดิน" (จับมือเขาแน่น)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep13_fahsai_passing_din_path',
            timelineTracks: []
        },

        // Scene 6: ฟ้าใสเดินผ่าน (กรณีลิสาเลือกดิน)
        {
            novelId,
            episodeId,
            sceneOrder: 60, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_fahsai_passing_din_path',
            title: 'ฟ้าใสกับรอยยิ้มเข้าใจ',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_with_din_observed',
                    characterId: characterMap.lisa,
                    expressionId: 'happy',
                    transform: { positionX: -150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep13_still_happy',
                    characterId: characterMap.din,
                    expressionId: 'slight_smile',
                    transform: { positionX: 150, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep13_passing_by',
                    characterId: characterMap.fah_sai,
                    expressionId: 'smiling',
                    transform: { positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8, rotation: 0, opacity: 0.7, zIndex: -1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_fahsai_passing_din_path',
                    type: TextContentType.NARRATION,
                    content: '(ในขณะนั้น คุณเห็น **ฟ้าใส** กำลังมองมาที่คุณสองคนจากระยะไกล เธอไม่ได้เข้ามาทัก แต่ส่งรอยยิ้มที่เต็มไปด้วยความเข้าใจและคำอวยพรให้คุณ ก่อนจะหันไปเดินกับกลุ่มเพื่อนของเธอ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_din_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันเลือกทางเดินนี้แล้ว...และฉันก็พร้อมที่จะเรียนรู้ความรักไปพร้อมกับเขา',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 14
            timelineTracks: []
        },

        // Scene 7 (เชื่อมจาก Choice C ใน Episode 13): ลิสาเลือกเน้นมิตรภาพ / ไม่คบใคร
        {
            novelId,
            episodeId,
            sceneOrder: 61, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep13_path_friendship_only',
            title: 'เส้นทาง: มิตรภาพอันล้ำค่า',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep13_alone_observing',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep13_friendship_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณยืนอยู่คนเดียวเล็กน้อย มองดูเพื่อนๆ ถ่ายรูปกันอย่างสนุกสนาน คุณมีความสุขที่ได้เห็นทุกคนมีความสุข)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_friend_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"[ชื่อคุณ]! มาถ่ายรูปด้วยกันสิ!" (เดินเข้ามาพร้อมรอยยิ้ม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_friend_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ยินดีด้วยนะ" (เดินเข้ามาจากอีกทางหนึ่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep13_friend_1_choice',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ขอบคุณนะฟ้าใส ขอบคุณนะดิน" (ยิ้มให้ทั้งสองคน) (คุณรู้สึกถึงความผูกพันที่แน่นแฟ้นกับทั้งคู่) "ดีใจนะที่ได้เป็นเพื่อนกับพวกเธอ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep13_friend_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"แน่นอนอยู่แล้วสิ! เราเป็นเพื่อนกันตลอดไปนะ!" (เธอกอดคุณเบาๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep13_friend_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ถ้ามีอะไร...ก็บอกแล้วกัน" (พยักหน้าเล็กน้อย) (แม้คำพูดจะสั้นๆ แต่แววตากลับเต็มไปด้วยความห่วงใย)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep13_friendship_final',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฉันอาจจะยังไม่พร้อมที่จะตัดสินใจเรื่องความรักในตอนนี้ แต่การมีมิตรภาพที่แข็งแกร่งแบบนี้ก็ถือเป็นของขวัญที่ล้ำค่าที่สุดแล้ว...',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep14_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 14
            timelineTracks: []
        },
        // --- START Episode 14: บทสรุปของความสัมพันธ์ (เส้นทางที่ 2) ---
        // Scene 1: บทนำในวันพิธีจบการศึกษา (ฉากสำหรับความสัมพันธ์ที่ไม่ได้ถูกเลือก)
        {
            novelId,
            episodeId,
            sceneOrder: 62, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 13
            nodeId: 'scene_ep14_start',
            title: 'บทสรุปของความสัมพันธ์',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolgraduationday.png', // รูปพิธีจบการศึกษา
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep14_observing',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep14_intro',
                    type: TextContentType.NARRATION,
                    content: 'แม้ว่าคุณจะได้ตัดสินใจเลือกเส้นทางความสัมพันธ์ของคุณไปแล้ว แต่ก็ยังมีบางความรู้สึกที่ไม่สามารถละทิ้งไปได้ง่ายๆ ในวันสุดท้ายของการเป็นนักเรียนมัธยมปลาย คุณได้มีโอกาสพูดคุยกับ...',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [], // ใช้ bgm จากฉากก่อนหน้า
            defaultNextSceneId: 'scene_ep14_path_fahsai_unchosen', // หรือ 'scene_ep14_path_din_unchosen' ตามเส้นทาง
            timelineTracks: []
        },

        // Scene 2 (กรณีคุณเลือกดินในตอนที่ 13, ฉากนี้คือบทสรุปกับฟ้าใส):
        {
            novelId,
            episodeId,
            sceneOrder: 63, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep14_path_fahsai_unchosen',
            title: 'บอกลา: ฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding2.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep14_with_fahsai_unchosen',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'fah_sai_ep14_sad_smile',
                    characterId: characterMap.fah_sai,
                    expressionId: 'concerned', // หรือ sad_smile
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep14_fahsai_unchosen_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณกำลังเดินไปที่มุมหนึ่งของสนามหญ้า และเห็น **ฟ้าใส** กำลังยืนอยู่คนเดียว เธอกำลังมองไปยังกลุ่มเพื่อนของเธอ แต่ไม่ได้เดินเข้าไปรวมกับใคร)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส...เธอไม่ได้ไปถ่ายรูปกับเพื่อนๆ เหรอ?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep14_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"อ้าว [ชื่อคุณ]! ฉันกำลังคิดอะไรเพลินๆ อยู่น่ะจ้ะ" (หันมามองคุณพร้อมรอยยิ้มอ่อนโยน) (รอยยิ้มของเธอดูสงบ แต่แฝงความเศร้าจางๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_fahsai_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉัน...อยากขอบคุณเธอนะฟ้าใส ขอบคุณสำหรับทุกอย่างที่ผ่านมา"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep14_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ไม่ต้องขอบคุณหรอก...ฉันเองก็มีความสุขมากที่ได้รู้จักเธอ และได้อยู่ข้างๆ เธอในช่วงเวลานี้" (เธอมองลึกเข้ามาในดวงตาของคุณ) "ฉันรู้ว่าเธอเลือกทางไหน...และฉันก็เข้าใจนะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_fahsai_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฟ้าใส..."',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep14_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ไม่เป็นไรหรอก" (เธอยื่นมือมาจับมือคุณเบาๆ) "ความสุขของเธอก็คือความสุขของฉันนะ [ชื่อคุณ] ไม่ว่าเราจะไปเรียนที่ไหน หรือเจอใครใหม่ๆ...เราก็ยังเป็นเพื่อนที่ดีต่อกันได้เสมอใช่ไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_fahsai_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"แน่นอนอยู่แล้วฟ้าใส! เธอจะเป็นเพื่อนคนสำคัญของฉันตลอดไป" (บีบมือเธอตอบ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep14_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส',
                    content: '"ดีใจจัง...ดูแลตัวเองดีๆ นะ แล้วก็...มีความสุขกับเส้นทางที่เลือกนะจ๊ะ" (ยิ้มกว้างขึ้น น้ำตาคลอเล็กน้อย) (เธอกอดคุณเบาๆ ก่อนจะผละออกแล้วเดินไปรวมกลุ่มกับเพื่อนๆ อย่างเข้มแข็ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep14_fahsai_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ฟ้าใส...เธอเป็นคนใจดีและเข้มแข็งจริงๆ ฉันจะไม่ลืมช่วงเวลาที่เรามีร่วมกันเลย',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep15_start', // แก้ไขตรงนี้ให้เชื่อมไปตอนที่ 15
            timelineTracks: []
        },

        // Scene 3 (กรณีคุณเลือกฟ้าใสในตอนที่ 13, ฉากนี้คือบทสรุปกับดิน):
        {
            novelId,
            episodeId,
            sceneOrder: 64, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep14_path_din_unchosen',
            title: 'บอกลา: ดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/schoolbuilding2.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep14_with_din_unchosen',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: -100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                },
                {
                    instanceId: 'din_ep14_normal',
                    characterId: characterMap.din,
                    expressionId: 'normal', // หรือ thoughtful
                    transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep14_din_unchosen_intro',
                    type: TextContentType.NARRATION,
                    content: '(คุณกำลังเดินไปที่มุมหนึ่งของสนามหญ้า และเห็น **ดิน** กำลังนั่งอยู่บนม้านั่งอย่างเงียบๆ เขามองเหม่อไปยังท้องฟ้า)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน...นายไม่ไปถ่ายรูปกับเพื่อนๆ เหรอ?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep14_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ไม่อ่ะ...คนเยอะ" (หันมามองคุณนิ่งๆ) (เสียงของเขายังคงเรียบเฉย แต่แววตาไม่ได้เย็นชาเหมือนวันแรกๆ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฉัน...อยากมาคุยกับนายหน่อยน่ะ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep14_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ไม่ต้องขอบคุณ" (พยักหน้าเล็กน้อย) (เขาหลบสายตาไปทางอื่น) "ฉันก็...ได้เรียนรู้อะไรบางอย่างจากเธอเหมือนกัน" (เขาหยุดไปครู่หนึ่ง) "เรื่องนั้น...ฉันเข้าใจ"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_din_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ดิน..."',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep14_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"ความรู้สึก...มันบังคับกันไม่ได้" (เขามองมาที่คุณอีกครั้ง) "แต่...มิตรภาพมันอยู่ได้นานกว่า" (เขาพูดคำที่ดูไม่ใช่ตัวเขาเลย) "ดูแลตัวเองดีๆ แล้วกัน"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep14_din_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"นาย...ก็เหมือนกันนะดิน นายจะเป็นเพื่อนคนสำคัญของฉันเสมอ" (ประหลาดใจกับคำพูดของเขา)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep14_4',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน',
                    content: '"อืม" (มุมปากกระตุกเล็กน้อยคล้ายรอยยิ้ม) (เขาไม่พูดอะไรอีก แต่คุณรู้สึกได้ถึงความเข้าใจที่ส่งผ่านมา) (เขาลุกขึ้นยืนและเดินจากไปอย่างเงียบๆ ทิ้งไว้เพียงความรู้สึกอบอุ่นในใจคุณ)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep14_din_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ดิน...นายเองก็มีมุมที่อ่อนโยนแบบนี้ด้วยสินะ ฉันดีใจจริงๆ ที่ได้รู้จักนาย',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep15_start', // ไปยังตอนที่ 15
            timelineTracks: []
        },

        // --- START Episode 15: มหาวิทยาลัย...บทใหม่ของชีวิต ---
        // Scene 1: บทนำที่หน้ามหาวิทยาลัย
        {
            novelId,
            episodeId,
            sceneOrder: 65, // แก้ไข sceneOrder ให้ต่อเนื่องจากตอนที่ 14
            nodeId: 'scene_ep15_start',
            title: 'มหาวิทยาลัย...บทใหม่ของชีวิต',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/University.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep15_at_university',
                    characterId: characterMap.lisa,
                    expressionId: 'normal',
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep15_intro',
                    type: TextContentType.NARRATION,
                    content: 'หลายเดือนผ่านไปหลังจากพิธีจบการศึกษา วันนี้คือวันแรกของการเริ่มต้นชีวิตบทใหม่ในรั้วมหาวิทยาลัย คุณยืนอยู่หน้าประตูทางเข้ามหาวิทยาลัยที่คุณเลือก ความรู้สึกตื่นเต้น ประหม่า และคาดหวังปะปนกันไป',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep15_1',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'มหาวิทยาลัย...มันใหญ่กว่าที่คิดไว้เยอะเลยแฮะ...แต่ฉันก็ตื่นเต้นมากๆ เลย!',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            audios: [
                {
                    instanceId: 'bgm_university_life',
                    type: 'background_music',
                    mediaId: new mongoose.Types.ObjectId(),
                    mediaSourceType: 'OfficialMedia',
                    volume: 0.6,
                    loop: true,
                    autoplayOnLoad: true
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดตามเส้นทางความสัมพันธ์จาก Episode 13
            timelineTracks: []
        },

        // Scene 2 (กรณีคุณเลือกคบกับฟ้าใส): โทรศัพท์จากฟ้าใส
        {
            novelId,
            episodeId,
            sceneOrder: 66, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep15_path_fahsai_call',
            title: 'โทรศัพท์จากฟ้าใส',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/University.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep15_receiving_call',
                    characterId: characterMap.lisa,
                    expressionId: 'happy', // หรือ smiling
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep15_fahsai_call_intro',
                    type: TextContentType.NARRATION,
                    content: '(ทันใดนั้น โทรศัพท์ของคุณก็สั่น คุณหยิบขึ้นมาดู ปรากฏเป็นสายเรียกเข้าจาก **\'ฟ้าใส\'** คุณกดรับสายด้วยรอยยิ้ม)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_fahsai_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฮัลโหลฟ้าใส!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep15_1_call',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส (เสียงจากโทรศัพท์)',
                    content: '"ถึงแล้วเหรอ [ชื่อคุณ]! ฉันอยู่หน้าหอพักแล้วนะ! ห้องของฉันอยู่ชั้นสาม ใกล้ๆ โรงอาหารเลย! เธอถึงไหนแล้ว? ให้ฉันไปช่วยไหม?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_fahsai_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"ฮ่าๆ ไม่เป็นไรจ้ะฟ้าใส ฉันจัดการได้! อีกเดี๋ยวก็ถึงแล้วแหละ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep15_2_call',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส (เสียงจากโทรศัพท์)',
                    content: '"งั้นรีบมานะ! ฉันมีเรื่องอยากเล่าให้ฟังเยอะแยะเลย! แล้วก็...คืนนี้เราไปหาอะไรอร่อยๆ กินกันนะ! ฉันคิดถึงเธอจะแย่แล้ว!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_fahsai_3',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ',
                    content: '"อื้อ! รีบไปหาแน่นอน! แล้วเจอกันนะ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep15_fahsai_call_end',
                    type: TextContentType.NARRATION,
                    content: '(คุณวางสาย ใบหน้าเปื้อนยิ้มอบอุ่น การรู้ว่าฟ้าใสอยู่ใกล้ๆ ทำให้หัวใจของคุณพองโต)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep15_fahsai_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ชีวิตมหาวิทยาลัยกำลังจะเริ่มต้นขึ้น...และฉันก็ไม่ได้เดินอยู่คนเดียว',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep15_final_choice', // ไปยังฉากตัวเลือกสุดท้าย
            timelineTracks: []
        },

        // Scene 3 (กรณีคุณเลือกคบกับดิน): ข้อความจากดิน
        {
            novelId,
            episodeId,
            sceneOrder: 67, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep15_path_din_message',
            title: 'ข้อความจากดิน',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/University.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep15_receiving_message',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ shy
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep15_din_message_intro',
                    type: TextContentType.NARRATION,
                    content: '(ข้อความเข้า...คุณหยิบโทรศัพท์ขึ้นมาดู ข้อความจาก **\'ดิน\'**)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep15_1_message',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din, // ให้มี speakerDisplayName แต่จะอยู่ในกรอบข้อความ
                    speakerDisplayName: 'ดิน (ข้อความ)',
                    content: '"ถึงแล้ว?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep15_lisa_smile_din_message',
                    type: TextContentType.NARRATION,
                    content: '(คุณยิ้มเล็กน้อยกับความสั้นกระชับของเขา)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_din_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (พิมพ์ตอบ)',
                    content: '"ถึงแล้ว! นายอยู่ไหน?"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep15_din_message_location',
                    type: TextContentType.NARRATION,
                    content: '(ไม่นานนัก ข้อความก็เด้งกลับมาพร้อมตำแหน่ง)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep15_2_message',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน (ข้อความ)',
                    content: '"ตึกคณะวิศวะ...จะแวะมาดูงานศิลปะแถวนี้"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep15_lisa_look_din_location',
                    type: TextContentType.NARRATION,
                    content: '(คุณหันไปมองตามทิศทางที่ดินส่งมา ตึกคณะวิศวะอยู่ไม่ไกลนักจากจุดที่คุณยืนอยู่)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 400, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_din_2',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (พิมพ์ตอบ)',
                    content: '"งั้นเดี๋ยวฉันเก็บของเสร็จแล้วจะแวะไปหานะ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 450, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep15_3_message',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน (ข้อความ)',
                    content: '"อืม"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 500, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep15_din_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'ชีวิตมหาวิทยาลัยกำลังจะเริ่มต้นขึ้น...และฉันก็ไม่ได้เดินอยู่คนเดียว',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 550, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep15_final_choice', // ไปยังฉากตัวเลือกสุดท้าย
            timelineTracks: []
        },

        // Scene 4 (กรณีคุณเลือกเน้นมิตรภาพ / ไม่คบใคร): ข้อความกลุ่มแชท
        {
            novelId,
            episodeId,
            sceneOrder: 68, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep15_path_friendship_chat',
            title: 'ข้อความจากเพื่อนซี้',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/University.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep15_receiving_chat',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ happy
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'narration_ep15_chat_intro',
                    type: TextContentType.NARRATION,
                    content: '(โทรศัพท์ของคุณสั่น มีข้อความจากกลุ่มแชท **\'เพื่อนซี้แสงอรุณ\'** เด้งขึ้นมา)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_fahsai_ep15_1_chat',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.fah_sai,
                    speakerDisplayName: 'ฟ้าใส (ในแชท)',
                    content: '"ฉันถึงหอแล้วนะ! [ชื่อคุณ] ถึงไหนแล้ว? ไว้ว่างๆ มาเที่ยวหอฉันนะ!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 150, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_din_ep15_1_chat',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.din,
                    speakerDisplayName: 'ดิน (ในแชท)',
                    content: '"ตั้งใจเรียน"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'narration_ep15_lisa_smile_chat',
                    type: TextContentType.NARRATION,
                    content: '(คุณยิ้มเล็กน้อยกับความแตกต่างของทั้งสองคน)',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 250, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'dialogue_lisa_ep15_chat_1',
                    type: TextContentType.DIALOGUE,
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (พิมพ์ตอบ)',
                    content: '"ถึงแล้วจ้าาา! ไว้ว่างๆ เจอกันนะทุกคน! จะตั้งใจเรียนแน่นอน!"',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 300, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                },
                {
                    instanceId: 'lisa_thought_ep15_friendship_final',
                    type: TextContentType.DIALOGUE, // ความคิดในใจ
                    characterId: characterMap.lisa,
                    speakerDisplayName: 'คุณ (คิดในใจ)',
                    content: 'มิตรภาพยังคงอยู่เสมอ...และฉันก็พร้อมที่จะค้นหาตัวเองและสร้างเรื่องราวบทใหม่ในรั้วมหาวิทยาลัยแห่งนี้',
                    fontSize: 16,
                    color: '#D3D3D3',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 350, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            defaultNextSceneId: 'scene_ep15_final_choice', // ไปยังฉากตัวเลือกสุดท้าย
            timelineTracks: []
        },

        // Scene 5: ฉากตัวเลือกสุดท้าย (สำหรับทุกเส้นทางที่มาถึง)
        {
            novelId,
            episodeId,
            sceneOrder: 69, // แก้ไข sceneOrder ให้ต่อเนื่อง
            nodeId: 'scene_ep15_final_choice',
            title: 'บทใหม่ของชีวิต',
            background: {
                type: 'image',
                value: '/images/background/theyearbooksecret/University.png',
                isOfficialMedia: true,
                fitMode: 'cover'
            },
            characters: [
                {
                    instanceId: 'lisa_ep15_final_decision',
                    characterId: characterMap.lisa,
                    expressionId: 'normal', // หรือ determined
                    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 0 },
                    isVisible: true
                }
            ],
            textContents: [
                {
                    instanceId: 'choice_prompt_ep15',
                    type: TextContentType.NARRATION,
                    content: 'คุณจะก้าวเข้าสู่ชีวิตมหาวิทยาลัยด้วยความคิดแบบไหน?',
                    fontSize: 16,
                    color: '#ffffff',
                    textAlign: 'center',
                    transform: { positionX: 0, positionY: 100, opacity: 1, zIndex: 10 },
                    displaySpeed: 50
                }
            ],
            choiceGroupsAvailable: [
                {
                    instanceId: 'choice_group_ep15_season2_setup',
                    choiceGroupId: new mongoose.Types.ObjectId(), // ต้องสร้าง Choice Group ID ที่ถูกต้อง
                    transform: { positionX: 0, positionY: 200, opacity: 1, zIndex: 15 }
                }
            ],
            defaultNextSceneId: null, // จะถูกกำหนดโดย Choice Selection
            timelineTracks: []
        },
    ];

    const sceneDataMap = new Map(scenes.map(s => [s.nodeId, s]));
    const sceneDocsMap = new Map();

    // Create docs in memory first, without saving, to get their _ids
    for (const sceneData of scenes) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { defaultNextSceneId, ...restOfData } = sceneData; // Destructure to remove the problematic field
        const processedData = processScene(restOfData); // ประมวลผล scene data ก่อนสร้าง document
        const sceneDoc = new SceneModel(processedData);
        sceneDocsMap.set(sceneDoc.nodeId, sceneDoc);
    }

    // Now link them using the in-memory docs
    for (const [nodeId, sceneDoc] of sceneDocsMap.entries()) {
        const originalSceneData = sceneDataMap.get(nodeId);
        if (originalSceneData && originalSceneData.defaultNextSceneId) {
            const nextSceneDoc = sceneDocsMap.get(originalSceneData.defaultNextSceneId);
            if (nextSceneDoc) {
                sceneDoc.defaultNextSceneId = nextSceneDoc._id; // Assign the ObjectId
            }
        }
    }

    // Save all the now-linked documents
    const scenesToSave = Array.from(sceneDocsMap.values());
    await SceneModel.insertMany(scenesToSave);

    console.log(`✅ สร้าง ${scenesToSave.length} ฉากสำหรับตอนแรกสำเร็จ`);
    return scenesToSave;
};

// ตัวอย่าง Novel Model
// declare const NovelModel: any;
// declare const EpisodeModel: any;
// declare const SceneModel: any;
// declare const ChoiceModel: any;

// สมมติว่ามีฟังก์ชันสร้าง Characters, Choices และ Scenes
// declare const createTheYearbookSecretCharacters: (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => Promise<any[]>;
// declare const createtheyearbooksecretChoices: (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => Promise<any[]>;
// declare const createtheyearbooksecretscenes: (novelId: mongoose.Types.ObjectId, episodeId: mongoose.Types.ObjectId, characters: any[]) => Promise<any[]>;

const findOrCreateCategory = async (name: string, type: CategoryType, slug: string) => {
    // Check for existing category by slug and type (most reliable)
    let category = await CategoryModel.findOne({ slug, categoryType: type });
    
    // If not found by slug, check by name and type (fallback)
    if (!category) {
        category = await CategoryModel.findOne({ name, categoryType: type });
    }
    
    if (!category) {
        console.log(`- Creating new category: "${name}"`);
        category = await CategoryModel.create({
            name,
            slug,
            categoryType: type,
            description: `Category for ${name}`,
            isSystemDefined: true,
        });
    } else {
        console.log(`- Using existing category: "${category.name}" (Type: ${category.categoryType}, ID: ${category._id})`);
    }
    return category._id;
};

export const createTheYearbookSecretNovel = async (authorId: mongoose.Types.ObjectId) => {
    // Find or create necessary categories before creating the novel
    console.log('🔍 Finding or creating necessary categories...');
    const themeCatId = await findOrCreateCategory('School Romance', CategoryType.GENRE, 'school-romance');
    const subTheme1CatId = await findOrCreateCategory('Coming-of-Age', CategoryType.GENRE, 'coming-of-age');
    const subTheme2CatId = await findOrCreateCategory('Drama', CategoryType.GENRE, 'drama');
    const langCatId = await findOrCreateCategory('ภาษาไทย', CategoryType.LANGUAGE, 'th');
    const ageRatingCatId = await findOrCreateCategory('PG-13', CategoryType.AGE_RATING, 'pg-13');
    const narrativePerspectiveCatId = await findOrCreateCategory('First Person', CategoryType.NARRATIVE_PERSPECTIVE, 'first-person');
    const artStyleCatId = await findOrCreateCategory('Anime', CategoryType.ART_STYLE, 'anime');
    const interactivityLevelCatId = await findOrCreateCategory('High', CategoryType.INTERACTIVITY_LEVEL, 'high');
    const lengthTagCatId = await findOrCreateCategory('Medium', CategoryType.LENGTH_TAG, 'medium');
    
    const novel = new NovelModel({
        title: 'The Yearbook\'s Secret',
        slug: 'the-yearbook-secret',
        author: authorId,
        synopsis: 'เมื่อนักเรียนใหม่ต้องเข้ามาพัวพันกับความสัมพันธ์ที่ซับซ้อนของเพื่อนร่วมชั้น เรื่องราวความรัก มิตรภาพ และความลับที่ซ่อนอยู่ในสมุดรุ่นจึงเริ่มต้นขึ้น',
        longDescription: 'นิยาย Visual Novel แนว School Romance ที่จะพาคุณย้อนกลับไปในวัยเรียนอีกครั้ง เมื่อคุณ (ลิสา) นักเรียนใหม่ได้พบกับเพื่อนใหม่สองคนที่มีเบื้องหลังที่แตกต่างกันโดยสิ้นเชิง การเลือกของคุณจะนำพาเรื่องราวความรัก มิตรภาพ และความลับที่ซ่อนอยู่ใน "สมุดรุ่น" ไปสู่บทสรุปแบบไหน? ร่วมเดินทางไปกับการตัดสินใจที่จะเปลี่ยนโชคชะตาของพวกเขาและของคุณเอง',
        coverImageUrl: '/images/romance/novel1.jpg',
        bannerImageUrl: '/images/background/school rooftop.png',
        themeAssignment: {
            moodAndTone: [await findOrCreateCategory('Heartwarming', CategoryType.MOOD_AND_TONE, 'heartwarming'), await findOrCreateCategory('Dramatic', CategoryType.MOOD_AND_TONE, 'dramatic')],
            contentWarnings: [],
            mainTheme: {
                categoryId: themeCatId,
                customName: 'School Romance'
            },
            subThemes: [
                {
                    categoryId: subTheme1CatId,
                    customName: 'Coming-of-Age'
                },
                {
                    categoryId: subTheme2CatId,
                    customName: 'Drama'
                }
            ],
            customTags: ['วัยเรียน', 'ความรัก', 'มิตรภาพ', 'การตัดสินใจ', 'ปมในอดีต', 'รักสามเส้า', 'ยอดนิยม', 'แนะนำ', 'วิชวลโนเวล']
        },
        narrativeFocus: {
            narrativePerspective: narrativePerspectiveCatId,
            artStyle: artStyleCatId,
            interactivityLevel: interactivityLevelCatId,
            lengthTag: lengthTagCatId,
        },
        worldBuildingDetails: {
            loreSummary: 'เรื่องราวความรักและมิตรภาพในโรงเรียนเอกชนชื่อดัง "แสงอรุณ" ที่ซึ่งความสัมพันธ์ของนักเรียนมีความสำคัญยิ่งกว่าสิ่งอื่นใด',
            technologyPrinciples: 'สมัยใหม่ในโรงเรียนไฮสคูลปกติ'
        },
        ageRatingCategoryId: ageRatingCatId,
        status: NovelStatus.PUBLISHED,
        accessLevel: NovelAccessLevel.PUBLIC,
        isCompleted: false,
        endingType: NovelEndingType.MULTIPLE_ENDINGS,
        sourceType: {
            type: NovelContentType.INTERACTIVE_FICTION
        },
        language: langCatId,
        totalEpisodesCount: 15,
        publishedEpisodesCount: 15, // สมมติว่าเผยแพร่ครบแล้ว
        stats: {
            totalRevenueCoins: 5000,
            viewsCount: 789123,
            uniqueViewersCount: 45678,
            likesCount: 12345,
            commentsCount: 987,
            discussionThreadCount: 110,
            ratingsCount: 950,
            averageRating: 4.75,
            followersCount: 1100,
            sharesCount: 450,
            bookmarksCount: 2100,
            totalWords: 180000,
            estimatedReadingTimeMinutes: 900,
            completionRate: 0.65,
            purchasesCount: 50,
            lastPublishedEpisodeAt: new Date('2024-07-31'),
            currentReaders: 150,
            peakConcurrentReaders: 500,
            trendingStats: {
                viewsLast24h: 12000,
                viewsLast48h: 18500,
                likesLast24h: 900,
                likesLast3Days: 2500,
                commentsLast24h: 120,
                newFollowersLastWeek: 350,
                trendingScore: 9500,
                lastTrendingScoreUpdate: new Date()
            }
        },
        monetizationSettings: {
            isCoinBasedUnlock: true,
            defaultEpisodePriceCoins: 30,
            allowDonations: true,
            isAdSupported: false,
            isPremiumExclusive: false,
            activePromotion: {
                isActive: true,
                promotionalPriceCoins: 15,
                promotionStartDate: new Date('2024-07-31'),
                promotionEndDate: new Date(new Date('2024-07-31').setDate(new Date('2024-07-31').getDate() + 14)),
                promotionDescription: "โปรโมชั่นพิเศษ! ลด 50% สำหรับนิยายยอดนิยม",
            }
        },
        psychologicalAnalysisConfig: {
            allowsPsychologicalAnalysis: true,
            sensitiveChoiceCategoriesBlocked: [],
            lastAnalysisDate: new Date('2024-07-31'),
            analysisVersion: '2.1'
        },
        collaborationSettings: {
            allowCoAuthorRequests: true,
            pendingCoAuthors: []
        },
        isFeatured: true,
        publishedAt: new Date('2024-07-31'),
        lastContentUpdatedAt: new Date('2024-07-31'),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    await novel.save();
    console.log(`✅ สร้างนิยายใหม่: ${novel.title} (${novel._id})`);

    // สร้างตัวละคร
    const characters = await createTheYearbookSecretCharacters(novel._id, authorId);

    // สร้าง Choices
    const choices = await createtheyearbooksecretchoices(novel._id, authorId);
    console.log(`✅ สร้าง ${choices.length} ตัวเลือกสำเร็จ`);

    // สร้าง Episodes ทั้งหมด
    const episodeData = [
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 1: การพบกันครั้งแรกกับ...ความเข้าใจผิด',
            slug: 'episode-1',
            episodeOrder: 1,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'เมื่อนักเรียนใหม่ต้องเผชิญหน้ากับหนุ่มสุดเย็นชาและดาวโรงเรียนแสนเฟรนด์ลี่ การพบกันครั้งนี้จะเป็นจุดเริ่มต้นของความสัมพันธ์แบบไหน?',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ยินดีต้อนรับสู่รั้วโรงเรียนแสงอรุณ! การตัดสินใจครั้งแรกของคุณจะเริ่มต้นที่นี่',
            authorNotesAfter: 'การเลือกที่คุณทำจะส่งผลต่อความรู้สึกของตัวละครหลักในอนาคต',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 2: บทเรียนที่ไม่คาดฝัน',
            slug: 'episode-2',
            episodeOrder: 2,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'วิชาคณิตศาสตร์ที่แสนน่าเบื่อ กลับมีบางอย่างที่ไม่คาดคิดเกิดขึ้น... เมื่อความช่วยเหลือที่มาพร้อมกับความเย็นชา ทำให้คุณเริ่มสงสัยในตัวเขา',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ทุกการกระทำมีความหมายแม้จะเป็นเรื่องเล็กน้อยในห้องเรียน',
            authorNotesAfter: 'บางครั้งความช่วยเหลือก็มาในรูปแบบที่เราคาดไม่ถึง',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 3: กิจกรรมชมรมและจุดเริ่มต้นของมิตรภาพ',
            slug: 'episode-3',
            episodeOrder: 3,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'การเลือกชมรมจะนำพาคุณไปสู่เส้นทางของมิตรภาพกับใครบางคน หรือความสงสัยในตัวอีกคนหนึ่ง?',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ชมรมคือที่ที่ความสัมพันธ์ใหม่ๆ จะเริ่มต้นขึ้น',
            authorNotesAfter: 'ตัวเลือกของคุณในตอนนี้จะนำไปสู่ความใกล้ชิดกับใครบางคนในตอนต่อไป',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        // เพิ่ม episodes อื่นๆ จนถึง 15 ตามโครงเรื่อง
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 4: ชมรมหรือ...โอกาส',
            slug: 'episode-4',
            episodeOrder: 4,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'คุณได้ก้าวเข้าสู่ชมรมที่เลือกแล้ว และได้เรียนรู้ถึงความลับที่ซ่อนอยู่ในงานศิลปะของใครบางคน',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ทุกชมรมมีเรื่องราวของตัวเองซ่อนอยู่',
            authorNotesAfter: 'ความรู้สึกใหม่ๆ กำลังก่อตัวขึ้นอย่างช้าๆ',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 5: ความท้าทายครั้งแรก',
            slug: 'episode-5',
            episodeOrder: 5,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'บททดสอบในห้องเรียนคณิตศาสตร์ที่แสนยากเย็น กลับกลายเป็นจุดเริ่มต้นของความสัมพันธ์ที่แปลกใหม่',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ความช่วยเหลือเล็กๆ น้อยๆ สามารถเปลี่ยนความรู้สึกได้',
            authorNotesAfter: 'คุณจะเก็บความลับนี้ไว้คนเดียวหรือไม่?',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 6: ปมเล็กๆ ที่ซ่อนอยู่',
            slug: 'episode-6',
            episodeOrder: 6,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'ในมุมที่เงียบสงบของโรงเรียน คุณได้เห็นด้านที่อ่อนแอของเพื่อนใหม่ทั้งสองคน',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ทุกรอยยิ้มและท่าทีเย็นชามีเบื้องหลังเสมอ',
            authorNotesAfter: 'การค้นพบนี้จะนำพาคุณไปสู่การตัดสินใจครั้งสำคัญ',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 7: กิจกรรมโรงเรียน: การเตรียมงาน',
            slug: 'episode-7',
            episodeOrder: 7,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'การเตรียมงานเทศกาลวัฒนธรรมที่ต้องทำงานร่วมกัน จะทำให้คุณเห็นความมุ่งมั่นของแต่ละคน',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'การทำงานเป็นทีมจะช่วยเปิดเผยความสามารถที่ซ่อนอยู่',
            authorNotesAfter: 'ความสัมพันธ์ของคุณกับพวกเขากำลังถูกทดสอบในหน้าที่ที่ได้รับมอบหมาย',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 8: เหตุการณ์พลิกผันในงานกิจกรรม',
            slug: 'episode-8',
            episodeOrder: 8,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'เมื่อเกิดเหตุการณ์ไม่คาดฝันขึ้นในวันงาน คุณจะต้องตัดสินใจว่าจะเข้าไปช่วยเหลือใครก่อนกันแน่?',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ทุกการตัดสินใจของคุณส่งผลต่อเรื่องราว! เลือกอย่างระมัดระวัง',
            authorNotesAfter: 'ผลจากการเลือกของคุณจะนำไปสู่บทสนทนาที่จริงใจในตอนต่อไป',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 9: บทสนทนาที่จริงใจ',
            slug: 'episode-9',
            episodeOrder: 9,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'ความลับและความกังวลที่ถูกเก็บซ่อนไว้กำลังจะถูกเปิดเผยในบทสนทนาที่ลึกซึ้งยามเย็น',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ถึงเวลาที่จะต้องเปิดใจคุยกันอย่างจริงจังแล้ว',
            authorNotesAfter: 'การเข้าใจความรู้สึกของกันและกันเป็นจุดเริ่มต้นของความสัมพันธ์ที่แท้จริง',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 10: ความรู้สึกที่เริ่มก่อตัว',
            slug: 'episode-10',
            episodeOrder: 10,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'ท่ามกลางบรรยากาศที่ผ่อนคลายในสวนสาธารณะ คุณเริ่มรู้สึกถึงความผูกพันที่พิเศษกับใครบางคน',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ความรักอาจก่อตัวจากช่วงเวลาเล็กๆ ที่มีให้กัน',
            authorNotesAfter: 'ความรู้สึกของคุณชัดเจนขึ้นแล้วหรือยัง?',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 11: การแข่งขันเพื่อความรัก',
            slug: 'episode-11',
            episodeOrder: 11,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'เมื่อทั้งสองคนเริ่มแสดงออกอย่างชัดเจน คุณจะต้องตัดสินใจว่าจะเลือกใครกันแน่?',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'หัวใจของคุณกำลังบอกอะไร?',
            authorNotesAfter: 'ตัวเลือกของคุณในตอนนี้จะเป็นจุดเปลี่ยนสำคัญของเรื่องราวทั้งหมด',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 12: การเผชิญหน้ากับความจริง',
            slug: 'episode-12',
            episodeOrder: 12,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'ถึงเวลาที่ต้องเปิดเผย "ความลับในสมุดรุ่น" และความรู้สึกที่ซ่อนอยู่ทั้งหมด',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ความจริงอาจจะไม่ได้สวยงามเสมอไป แต่การเผชิญหน้าจะทำให้คุณเข้มแข็ง',
            authorNotesAfter: 'ความลับที่เปิดเผยจะส่งผลต่อการตัดสินใจสุดท้ายของคุณ',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 13: บทสรุปของความสัมพันธ์',
            slug: 'episode-13',
            episodeOrder: 13,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'วันจบการศึกษาที่เต็มไปด้วยความรู้สึก คุณจะต้องเลือกเส้นทางความรักของตัวเอง',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'การตัดสินใจสุดท้ายของคุณจะกำหนดตอนจบของเรื่องราวนี้',
            authorNotesAfter: 'ไม่ว่าจะเลือกใคร...มิตรภาพก็ยังคงอยู่เสมอ',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 14: บทสรุปของความสัมพันธ์ (เส้นทางที่ 2)',
            slug: 'episode-14',
            episodeOrder: 14,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.FREE,
            teaserText: 'บทสนทนาสุดท้ายกับคนที่ไม่ถูกเลือก...เพื่อบอกลาและให้กำลังใจกันและกันก่อนเริ่มต้นชีวิตใหม่',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'บางครั้งการยอมรับและก้าวต่อไปก็เป็นสิ่งที่ดีที่สุด',
            authorNotesAfter: 'ความสัมพันธ์ทุกรูปแบบล้วนมีความหมายในตัวมันเอง',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        },
        {
            novelId: novel._id,
            authorId,
            title: 'บทที่ 15: มหาวิทยาลัย...บทใหม่ของชีวิต',
            slug: 'episode-15',
            episodeOrder: 15,
            status: EpisodeStatus.PUBLISHED,
            accessType: EpisodeAccessType.PAID_UNLOCK,
            priceCoins: 30,
            teaserText: 'การเริ่มต้นชีวิตในรั้วมหาวิทยาลัย ที่ซึ่งบทใหม่ของความรักและมิตรภาพกำลังจะเริ่มต้นขึ้น!',
            publishedAt: new Date('2024-07-31'),
            stats: {},
            sentimentInfo: {},
            authorNotesBefore: 'ยินดีด้วย! คุณได้สร้างตอนจบของซีซันแรกแล้ว เตรียมพบกับบทต่อไปได้เลย!',
            authorNotesAfter: 'เรื่องราวของ "The Yearbook\'s Secret" จะดำเนินต่อไปใน Season 2! โปรดติดตาม!',
            isPreviewAllowed: true,
            lastContentUpdatedAt: new Date('2024-07-31')
        }
    ];

    const episodes = await EpisodeModel.insertMany(episodeData);

    // สร้างฉากทั้งหมด แล้วแจกจ่ายให้ episode
    const allScenes = await createtheyearbooksecretscenes(novel._id, episodes[0]._id, characters, choices);

    // แจกจ่ายฉากตามสัดส่วนที่เหมาะสม (ตัวอย่าง: 3 ฉากต่อตอนสำหรับตอน 1-12)
    const episode1Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep1_'));
    const episode2Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep2_'));
    const episode3Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep3_'));
    const episode4Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep4_'));
    const episode5Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep5_'));
    const episode6Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep6_'));
    const episode7Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep7_'));
    const episode8Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep8_'));
    const episode9Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep9_'));
    const episode10Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep10_'));
    const episode11Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep11_'));
    const episode12Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep12_'));
    const episode13Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep13_'));
    const episode14Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep14_'));
    const episode15Scenes = allScenes.filter(s => s.nodeId?.startsWith('scene_ep15_'));
    // TODO: ทำเช่นเดียวกันสำหรับตอนที่เหลือจนถึง 15

    // อัปเดต episodeId สำหรับฉากที่ไม่ใช่ของ episode 1
    if (episodes.length > 1) {
        console.log('🔄 อัปเดต episodeId สำหรับฉากที่ไม่ใช่ของ episode 1...');

        // อัปเดต episodeId สำหรับฉากของ episode 2
        for (const scene of episode2Scenes) {
            await SceneModel.findByIdAndUpdate(scene._id, {
                episodeId: episodes[1]._id,
                // Reset sceneOrder to avoid duplicates
                sceneOrder: episode2Scenes.indexOf(scene)
            });
        }

        // อัปเดต episodeId สำหรับฉากของ episode 3
        if (episodes.length > 2) {
            for (const scene of episode3Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[2]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode3Scenes.indexOf(scene)
                });
            }
        }
        
            // อัปเดต episodeId สำหรับฉากของ episode 4
            if (episodes.length > 3) {
                for (const scene of episode4Scenes) {
                    await SceneModel.findByIdAndUpdate(scene._id, {
                        episodeId: episodes[3]._id,
                        // Reset sceneOrder to avoid duplicates
                        sceneOrder: episode4Scenes.indexOf(scene)
                    });
                }
            }
        // อัปเดต episodeId สำหรับฉากของ episode 4
        if (episodes.length > 3) {
            for (const scene of episode5Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[4]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode5Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 6
        if (episodes.length > 5) {
            for (const scene of episode6Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[5]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode6Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 7
        if (episodes.length > 6) {
            for (const scene of episode7Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[6]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode7Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 8
        if (episodes.length > 7) {
            for (const scene of episode8Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[7]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode8Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 9
        if (episodes.length > 8) {
            for (const scene of episode9Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[8]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode9Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 10
        if (episodes.length > 9) {
            for (const scene of episode10Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[9]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode10Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 11
        if (episodes.length > 10) {
            for (const scene of episode11Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[10]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode11Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 12
        if (episodes.length > 11) {
            for (const scene of episode12Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[11]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode12Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 3
        if (episodes.length > 12) {
            for (const scene of episode13Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[12]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode13Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 14
        if (episodes.length > 13) {
            for (const scene of episode14Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[13]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode14Scenes.indexOf(scene)
                });
            }
        }
        // อัปเดต episodeId สำหรับฉากของ episode 15
        if (episodes.length > 14) {
            for (const scene of episode15Scenes) {
                await SceneModel.findByIdAndUpdate(scene._id, {
                    episodeId: episodes[14]._id,
                    // Reset sceneOrder to avoid duplicates
                    sceneOrder: episode15Scenes.indexOf(scene)
                });
            }
        }

    }
    // TODO: ทำเช่นเดียวกันสำหรับตอนที่เหลือ

    // อัปเดต Episodes ด้วย firstSceneId และ sceneIds
    await EpisodeModel.findByIdAndUpdate(episodes[0]._id, {
        firstSceneId: episode1Scenes[0]?._id,
        sceneIds: episode1Scenes.map(s => s._id)
    });

    // อัปเดต Episode 2 และ 3 ด้วย firstSceneId และ sceneIds
    if (episodes.length > 1 && episode2Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[1]._id, {
            firstSceneId: episode2Scenes[0]?._id,
            sceneIds: episode2Scenes.map(s => s._id)
        });
    }

    if (episodes.length > 2 && episode3Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[2]._id, {
            firstSceneId: episode3Scenes[0]?._id,
            sceneIds: episode3Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 3 && episode4Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[3]._id, {
            firstSceneId: episode4Scenes[0]?._id,
            sceneIds: episode4Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 4 && episode5Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[4]._id, {
            firstSceneId: episode5Scenes[0]?._id,
            sceneIds: episode5Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 5 && episode6Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[5]._id, {
            firstSceneId: episode6Scenes[0]?._id,
            sceneIds: episode6Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 6 && episode7Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[6]._id, {
            firstSceneId: episode7Scenes[0]?._id,
            sceneIds: episode7Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 7 && episode8Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[7]._id, {
            firstSceneId: episode8Scenes[0]?._id,
            sceneIds: episode8Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 8 && episode9Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[8]._id, {
            firstSceneId: episode9Scenes[0]?._id,
            sceneIds: episode9Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 9 && episode10Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[9]._id, {
            firstSceneId: episode10Scenes[0]?._id,
            sceneIds: episode10Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 10 && episode11Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[10]._id, {
            firstSceneId: episode11Scenes[0]?._id,
            sceneIds: episode11Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 11 && episode12Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[11]._id, {
            firstSceneId: episode12Scenes[0]?._id,
            sceneIds: episode12Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 12 && episode13Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[12]._id, {
            firstSceneId: episode13Scenes[0]?._id,
            sceneIds: episode13Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 13 && episode14Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[13]._id, {
            firstSceneId: episode14Scenes[0]?._id,
            sceneIds: episode14Scenes.map(s => s._id)
        });
    }
    if (episodes.length > 14 && episode15Scenes.length > 0) {
        await EpisodeModel.findByIdAndUpdate(episodes[14]._id, {
            firstSceneId: episode15Scenes[0]?._id,
            sceneIds: episode15Scenes.map(s => s._id)
        });
    }

    // สร้างตัวเลือก
    // หมายเหตุ: เราสร้าง choices ไว้ก่อนหน้านี้แล้ว แต่ส่วนนี้จะเชื่อมโยง choices กับ scenes

    // --- New Logic: Associate Choices with Scenes ---
    console.log('🔗 กำลังเชื่อมโยง Choices เข้ากับ Scenes ที่ถูกต้อง (The Yearbook\'s Secret)...');
    const sceneNodeMap = new Map(allScenes.map(s => [s.nodeId, s]));

    for (const choice of choices) {
        const goToNodeAction = choice.actions.find(a => a.type === 'go_to_node');
        if (!goToNodeAction || !goToNodeAction.parameters.targetNodeId) {
            console.warn(`️⚠️ Choice "${choice.text}" (${choice._id}) ไม่มี targetNodeId, จะถูกข้ามไป`);
            continue;
        }

        const targetNodeId = goToNodeAction.parameters.targetNodeId;
        const targetScene = sceneNodeMap.get(targetNodeId);

        if (!targetScene) {
            console.warn(`️⚠️ ไม่พบ Scene ที่มี nodeId: "${targetNodeId}" สำหรับ Choice "${choice.text}", จะถูกข้ามไป`);
            continue;
        }

        let sourceScene = null;
        // Find the scene that either leads to the choice's target node 
        // or is the node where the choice originates.
        for (const scene of allScenes) {
            if (scene.defaultNextSceneId === targetNodeId || scene.nodeId === choice.originStoryMapNodeId) {
                sourceScene = scene;
                break;
            }
        }

        if (sourceScene) {
            await SceneModel.findByIdAndUpdate(sourceScene._id, {
                $addToSet: { choiceIds: choice._id }
            });
            console.log(`✅ เพิ่ม Choice "${choice.text}" -> Scene "${sourceScene.title}" (Order: ${sourceScene.sceneOrder})`);
        } else {
            console.warn(`️⚠️ ไม่พบ Source Scene สำหรับ Choice "${choice.text}" (Target: ${targetNodeId}), จะถูกข้ามไป`);
        }
    }
    // --- End New Logic ---

    // ดึงข้อมูล episode ที่อัปเดตแล้วเพื่อให้ข้อมูลสอดคล้องกัน
    const updatedEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

    return { novel, episodes: updatedEpisodes, characters, choices, scenes: allScenes };
};

// ตัวอย่างการเรียกใช้:
// const authorId = await createMockAuthor();
// createTheYearbookSecretNovel(authorId);

// ตัวอย่างการเรียกใช้ (ในโค้ดจริง novelId, episodeId และ characters จะมาจากส่วนอื่น)
// const exampleNovelId = new mongoose.Types.ObjectId();
// const exampleEpisodeId = new mongoose.Types.ObjectId();
// const exampleCharacters = [
//   { _id: new mongoose.Types.ObjectId(), characterCode: 'lisa' },
//   { _id: new mongoose.Types.ObjectId(), characterCode: 'fah_sai' },
//   { _id: new mongoose.Types.ObjectId(), characterCode: 'din' }
// ];