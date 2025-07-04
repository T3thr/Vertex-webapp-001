import mongoose from 'mongoose';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import NovelModel, { NovelStatus, NovelAccessLevel, NovelEndingType, NovelContentType } from '@/backend/models/Novel';
import EpisodeModel, { EpisodeStatus, EpisodeAccessType } from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import UserModel from '@/backend/models/User';

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;

// ข้อมูลผู้แต่งจำลอง - ใช้ผู้ใช้ที่มีอยู่แล้วในฐานข้อมูล
const createMockAuthor = async () => {
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

// ข้อมูลตัวละครสำหรับ "Now or Never"
const createNowOrNeverCharacters = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  const characters = [
    {
      novelId,
      authorId,
      characterCode: 'ELLA',
      name: 'เอลล่า',
      fullName: 'เอลล่า มาร์ติเนซ',
      description: 'นักศึกษาสาววัย 20 ปี ที่หนีตามแฟนมาใช้ชีวิตในเมืองตั้งแต่อายุ 14 แฟนคือแมทธิว',
      age: '20',
      gender: 'female',
      roleInStory: 'main_protagonist',
      colorTheme: '#FF6B9D',
      expressions: [
        {
          expressionId: 'normal',
          name: 'ปกติ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'worried',
          name: 'กังวล',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'angry',
          name: 'โกรธ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: {
        heightCm: 165,
        eyeColor: 'น้ำตาล',
        hairColor: 'น้ำตาลเข้ม',
        ageAppearance: 'ต้น 20'
      },
      personalityTraits: {
        goals: ['หาทางออกจากชีวิตที่ยุ่งเหยิง', 'ปกป้องคนที่รัก'],
        fears: ['การถูกทิ้ง', 'การไม่มีอนาคต'],
        strengths: ['ใจดี', 'เห็นอกเห็นใจ', 'กล้าหาญเมื่อจำเป็น'],
        weaknesses: ['ตัดสินใจยาก', 'ขาดความมั่นใจ'],
        likes: ['ความสงบ', 'การช่วยเหลือผู้อื่น'],
        dislikes: ['ความรุนแรง', 'การโกหก']
      },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Matthew',
      name: 'แมทธิว',
      fullName: 'แมทธิว โจนส์',
      description: 'แฟนของเอลล่า ชายหนุ่มที่พาเอลล่าหนีออกมาจากบ้าน เป็นคนที่เกี่ยวข้องกับธุรกิจยาเสพติด',
      age: '22',
      gender: 'male',
      roleInStory: 'secondary_protagonist',
      colorTheme: '#4A90E2',
      expressions: [
        {
          expressionId: 'normal',
          name: 'ปกติ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'angry',
          name: 'โกรธ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'frustrated',
          name: 'หงุดหงิด',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: {
        heightCm: 178,
        eyeColor: 'ฟ้า',
        hairColor: 'น้ำตาลอ่อน',
        ageAppearance: 'ต้น 20'
      },
      personalityTraits: {
        goals: ['หาเงินเพื่อชำระหนี้', 'ดูแลเอลล่า'],
        fears: ['การถูกจับ', 'การสูญเสียเอลล่า'],
        strengths: ['กล้าหาญ', 'มีความเป็นผู้นำ'],
        weaknesses: ['หุนหันพลันแล่น', 'เห็นแก่ตัว'],
        likes: ['การควบคุม', 'เสื้อผ้าแบรนด์'],
        dislikes: ['การถูกขัดขวาง', 'ความอ่อนแอ']
      },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Julian',
      name: 'จูเลียน',
      fullName: 'จูเลียน วิลสัน',
      description: 'เด็กหนุ่มวัย 19 ปี เป็นโรคหอบหืด เป็นคนฉลาดที่สุดในกลุ่ม แต่สุขภาพไม่แข็งแรง',
      age: '19',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#7ED321',
      expressions: [
        {
          expressionId: 'normal',
          name: 'ปกติ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'sick',
          name: 'ไม่สบาย',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'thinking',
          name: 'กำลังคิด',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: {
        heightCm: 170,
        eyeColor: 'เขียว',
        hairColor: 'น้ำตาลเข้ม',
        ageAppearance: 'ปลายวัยรุ่น',
        distinguishingFeatures: ['หน้าซีดเนื่องจากโรคหอบหืด']
      },
      personalityTraits: {
        goals: ['ได้เงินมาซื้อยารักษาโรค', 'ดูแลตัวเองให้ได้'],
        fears: ['การหายใจไม่ออก', 'เป็นภาระกับคนอื่น'],
        strengths: ['ฉลาด', 'วางแผนดี', 'ใจเย็น'],
        weaknesses: ['ร่างกายอ่อนแอ', 'พึ่งพายา'],
        likes: ['หนังสือ', 'ความเงียบสงบ'],
        dislikes: ['ฝุ่นละออง', 'การวิ่งเล่น']
      },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Gracie',
      name: 'เกรซี่',
      fullName: 'เกรซี่ คาร์เตอร์',
      description: 'สาวน้อยที่หลงรักดีแลนแต่ไม่ได้รับการตอบสนอง มักจะเป็นคนร่าเริงแต่เปราะบาง',
      age: '21',
      gender: 'female',
      roleInStory: 'supporting_character',
      colorTheme: '#F5A623',
      expressions: [
        {
          expressionId: 'smile',
          name: 'ยิ้ม',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'sad',
          name: 'เศร้า',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'excited',
          name: 'ตื่นเต้น',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'smile',
      physicalAttributes: {
        heightCm: 160,
        eyeColor: 'ฟ้า',
        hairColor: 'บลอนด์',
        ageAppearance: 'ต้น 20'
      },
      personalityTraits: {
        goals: ['ได้รักจากดีแลน', 'ได้เงินไปเริ่มต้นชีวิตใหม่'],
        fears: ['การถูกปฏิเสธ', 'ความเหงา'],
        strengths: ['ร่าเริง', 'อดทน', 'ซื่อสัตย์'],
        weaknesses: ['ไร้เดียงสา', 'ติดดีแลนมากเกินไป'],
        likes: ['ดีแลน', 'เสื้อผ้าสวยๆ', 'ดนตรี'],
        dislikes: ['การถูกเมิน', 'ความเงียบ']
      },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Dylan',
      name: 'ดีแลน',
      fullName: 'ดีแลน แบล็ก',
      description: 'ชายหนุ่มที่เก่งในการปลดล็อก มีบุคลิกเย็นชาและไม่ค่อยสนใจใคร โดยเฉพาะเกรซี่',
      age: '23',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#50E3C2',
      expressions: [
        {
          expressionId: 'normal',
          name: 'ปกติ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'cold',
          name: 'เย็นชา',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'annoyed',
          name: 'รำคาญ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'cold',
      physicalAttributes: {
        heightCm: 180,
        eyeColor: 'เทา',
        hairColor: 'ดำ',
        ageAppearance: 'ต้น 20'
      },
      personalityTraits: {
        goals: ['หาเงินจำนวนมาก', 'หลีกเลี่ยงปัญหา'],
        fears: ['การถูกรบกวน', 'ภาระผูกพัน'],
        strengths: ['เก่งทางเทคนิค', 'เย็นชา', 'ปรับตัวเก่ง'],
        weaknesses: ['ไม่เอาใจใส่คนอื่น', 'เย็นชาเกินไป'],
        likes: ['ความเงียบ', 'เครื่องจักรกล'],
        dislikes: ['เกรซี่', 'การถูกรบกวน', 'ความวุ่นวาย']
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

// ข้อมูลตัวเลือกสำหรับ "Now or Never"
const createNowOrNeverChoices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  const choices = [
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_HELP_MATTHEW',
      text: 'ร่วมปล้นเพื่อช่วยแมทธิว',
      hoverText: 'เลือกที่จะช่วยแฟนหนุ่มแม้จะเสี่ยงอันตราย',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene2a'
          }
        },
        {
          actionId: 'action2',
          type: 'modify_player_stat',
          parameters: {
            statName: 'courage',
            changeValue: 20,
            operation: 'add'
          }
        }
      ],
      isMajorChoice: true,
      associatedEmotionTags: ['กล้าหาญ', 'ความรัก', 'เสี่ยงภัย'],
      psychologicalImpactScore: 8,
      feedbackTextAfterSelection: '+20 ค่าความกล้าหาญ',
      isArchived: false,
      displayOrder: 1
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_NOT_HELP_MATTHEW',
      text: 'ไม่ช่วยแมทธิว',
      hoverText: 'เลือกที่จะไม่เข้าร่วมในการปล้น',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene1g'
          }
        },
        {
          actionId: 'action2',
          type: 'modify_player_stat',
          parameters: {
            statName: 'morality',
            changeValue: 10,
            operation: 'add'
          }
        }
      ],
      isMajorChoice: true,
      associatedEmotionTags: ['คุณธรรม', 'ความปลอดภัย', 'การปฏิเสธ'],
      psychologicalImpactScore: 6,
      feedbackTextAfterSelection: '+10 ค่าคุณธรรม',
      isArchived: false,
      displayOrder: 2
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_GO_WITH_MATTHEW',
      text: 'ไปกับแมทธิว',
      hoverText: 'เลือกที่จะติดตามแฟนหนุ่ม',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene2k'
          }
        }
      ],
      isMajorChoice: false,
      associatedEmotionTags: ['ความภักดี', 'การตาม'],
      psychologicalImpactScore: 4,
      isArchived: false,
      displayOrder: 1
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_GO_WITH_JULIAN',
      text: 'ไปกับจูเลียน',
      hoverText: 'เลือกที่จะดูแลจูเลียนที่ป่วย',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene2m'
          }
        },
        {
          actionId: 'action2',
          type: 'modify_player_stat',
          parameters: {
            statName: 'morality',
            changeValue: 20,
            operation: 'add'
          }
        }
      ],
      isMajorChoice: false,
      associatedEmotionTags: ['เมตตา', 'การดูแล', 'เสียสละ'],
      psychologicalImpactScore: 7,
      feedbackTextAfterSelection: '+20 ค่าคุณธรรม',
      isArchived: false,
      displayOrder: 2
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

// ข้อมูลตัวละครสำหรับ "The Chosen One"
const createChosenOneCharacters = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  const characters = [
    {
      novelId,
      authorId,
      characterCode: 'Toya',
      name: 'โทยะ',
      fullName: 'โทยะ ดัลลาส',
      description: 'เด็กชายที่รักสุนัขของเขามาก มีจิตใจดีและเสียสละ',
      age: '12',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#4A90E2',
      expressions: [
        {
          expressionId: 'normal',
          name: 'ปกติ',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'worried',
          name: 'กังวล',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        },
        {
          expressionId: 'happy',
          name: 'มีความสุข',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia'
        }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: {
        heightCm: 150,
        eyeColor: 'น้ำตาล',
        hairColor: 'น้ำตาลเข้ม',
        ageAppearance: 'วัยเด็ก'
      },
      personalityTraits: {
        goals: ['ดูแลสุนัขอองรี', 'ปกป้องสิ่งที่รัก'],
        fears: ['การสูญเสียอองรี', 'การเห็นคนอื่นเจ็บปวด'],
        strengths: ['ใจดี', 'เสียสละ', 'รักสัตว์'],
        weaknesses: ['อ่อนไหวง่าย', 'ตัดสินใจยากในสถานการณ์วิกฤต'],
        likes: ['สุนัข', 'การเล่นกลางแจ้ง'],
        dislikes: ['ความรุนแรง', 'การเห็นสัตว์ทุกข์']
      },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Ana',
      name: 'อานะ',
      fullName: 'อานะ ซูซูกิ',
      description: 'หนึ่งในกลุ่มเด็กที่เล่นใกล้รางรถไฟ เป็นเด็กหญิงที่ร่าเริงและชอบผจญภัย',
      age: '11',
      gender: 'female',
      roleInStory: 'supporting_character',
      colorTheme: '#FF8C61',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'happy', name: 'มีความสุข', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'worried', name: 'กังวล', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: { heightCm: 145, eyeColor: 'น้ำตาล', hairColor: 'ดำ', ageAppearance: 'วัยเด็ก' },
      personalityTraits: { goals: ['เล่นสนุกกับเพื่อนๆ'], fears: ['การถูกทิ้งให้อยู่คนเดียว'], strengths: ['ร่าเริง', 'กล้าแสดงออก'], weaknesses: ['ไม่ค่อยระวังตัว'], likes: ['ของหวาน', 'การผจญภัย'], dislikes: ['การอยู่นิ่งๆ'] },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Hoshi',
      name: 'โฮชิ',
      fullName: 'โฮชิ ทานากะ',
      description: 'เด็กชายในกลุ่มเพื่อน มีความรอบคอบและมักจะคอยเตือนเพื่อนๆ',
      age: '12',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#61D4FF',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'happy', name: 'มีความสุข', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'worried', name: 'กังวล', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: { heightCm: 150, eyeColor: 'น้ำตาลเข้ม', hairColor: 'น้ำตาล', ageAppearance: 'วัยเด็ก' },
      personalityTraits: { goals: ['ดูแลเพื่อนๆ'], fears: ['เพื่อนๆได้รับอันตราย'], strengths: ['รอบคอบ', 'ใจดี'], weaknesses: ['ขี้กังวล'], likes: ['การอ่านหนังสือ', 'ดูดาว'], dislikes: ['ความวุ่นวาย'] },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Cho',
      name: 'โช',
      fullName: 'โช ยามาโมโตะ',
      description: 'เด็กชายที่ตัวโตที่สุดในกลุ่ม ชอบเล่นอะไรแผลงๆ และเป็นผู้นำกลุ่ม',
      age: '12',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#FF6161',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'happy', name: 'มีความสุข', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'worried', name: 'กังวล', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: { heightCm: 155, eyeColor: 'ดำ', hairColor: 'ดำ', ageAppearance: 'วัยเด็ก' },
      personalityTraits: { goals: ['เป็นที่หนึ่งเสมอ'], fears: ['ความพ่ายแพ้'], strengths: ['มีความเป็นผู้นำ', 'แข็งแรง'], weaknesses: ['ใจร้อน', 'ไม่ฟังใคร'], likes: ['กีฬา', 'การแข่งขัน'], dislikes: ['การอยู่นิ่งๆ'] },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Riwsey',
      name: 'ริวเซย์',
      fullName: 'ริวเซย์ อิโตะ',
      description: 'เด็กชายที่เงียบขรึมที่สุดในกลุ่ม แต่มีความคิดที่เฉียบแหลม',
      age: '11',
      gender: 'male',
      roleInStory: 'supporting_character',
      colorTheme: '#A861FF',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'happy', name: 'มีความสุข', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' },
        { expressionId: 'worried', name: 'กังวล', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
      ],
      defaultExpressionId: 'normal',
      physicalAttributes: { heightCm: 148, eyeColor: 'ดำ', hairColor: 'ดำ', ageAppearance: 'วัยเด็ก' },
      personalityTraits: { goals: ['เข้าใจโลก'], fears: ['การเข้าสังคม'], strengths: ['ช่างสังเกต', 'ฉลาด'], weaknesses: ['พูดน้อย', 'เก็บตัว'], likes: ['หมากรุก', 'ปริศนา'], dislikes: ['ที่ๆมีคนเยอะ'] },
      isArchived: false
    },
    {
      novelId,
      authorId,
      characterCode: 'Dog',
      name: 'อองรี',
      fullName: 'อองรี',
      description: 'สุนัขพันธุ์บีเกิ้ลแสนน่ารักและซื่อสัตย์ของโทยะ',
      age: '3',
      gender: 'male',
      roleInStory: 'animal_companion',
      colorTheme: '#9B7B56',
      expressions: [
        { expressionId: 'normal', name: 'ปกติ', mediaId: new mongoose.Types.ObjectId(), mediaSourceType: 'OfficialMedia' }
      ],
      defaultExpressionId: 'normal',
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

// ข้อมูลตัวเลือกสำหรับ "The Chosen One"
const createChosenOneChoices = async (novelId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) => {
  const choices = [
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_SAVE_DOG',
      text: 'สับรางไปยังทางที่มีสุนัข',
      hoverText: 'เลือกที่จะช่วยสุนัขแต่เสียสละเด็ก 4 คน',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene39'
          }
        },
        {
          actionId: 'action2',
          type: 'modify_player_stat',
          parameters: {
            statName: 'animal_love',
            changeValue: 10,
            operation: 'add'
          }
        }
      ],
      isMajorChoice: true,
      associatedEmotionTags: ['ความรักสัตว์', 'การเลือกยาก', 'จริยธรรม'],
      psychologicalImpactScore: 10,
      isArchived: false,
      displayOrder: 1
    },
    {
      novelId,
      authorId,
      version: 1,
      choiceCode: 'CHOICE_SAVE_CHILDREN',
      text: 'สับรางไปยังทางที่มีเด็ก',
      hoverText: 'เลือกที่จะช่วยเด็ก 4 คนแต่เสียสละสุนัข',
      actions: [
        {
          actionId: 'action1',
          type: 'go_to_node',
          parameters: {
            targetNodeId: 'scene39'
          }
        },
        {
          actionId: 'action2',
          type: 'modify_player_stat',
          parameters: {
            statName: 'human_priority',
            changeValue: 10,
            operation: 'add'
          }
        }
      ],
      isMajorChoice: true,
      associatedEmotionTags: ['มนุษยธรรม', 'การเลือกยาก', 'จริยธรรม'],
      psychologicalImpactScore: 10,
      isArchived: false,
      displayOrder: 2
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

// ข้อมูลฉากสำหรับ "Now or Never"
const createNowOrNeverScenes = async (
  novelId: mongoose.Types.ObjectId, 
  episodeId: mongoose.Types.ObjectId, 
  characters: any[]
) => {
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {});

  const scenes = [
    // Scene 1 - จุดเริ่มต้น
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene1',
      title: 'จุดเริ่มต้น',
      background: {
        type: 'image',
        value: '/images/background/first.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [],
      audios: [
        {
          instanceId: 'bgm_scene1',
          type: 'background_music',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia',
          volume: 0.8,
          loop: true,
          autoplayOnLoad: true,
          fadeInSeconds: 2,
          fadeOutSeconds: 2
        }
      ],
      defaultNextSceneId: null, // จะกำหนดหลังจากสร้าง scene อื่นแล้ว
      timelineTracks: [
        {
          trackId: 'main_track',
          trackName: 'Main Timeline',
          events: []
        }
      ],
      sceneVariables: []
    },

    // Scene 1a - แมทธิวพูด
    {
      novelId,
      episodeId,
      sceneOrder: 2,
      nodeId: 'scene1a',
      title: 'จุดเริ่มต้น (ต่อ)',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ella_listening_1a',
          characterId: characterMap.ELLA,
          expressionId: 'worried',
          transform: {
            positionX: -200,
            positionY: -20,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        },
        {
          instanceId: 'matthew_speaking_1a',
          characterId: characterMap.MATTHEW,
          expressionId: 'frustrated',
          transform: {
            positionX: 200,
            positionY: -50,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 2 // Make speaker slightly in front
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'dialogue_1a',
          type: 'dialogue',
          characterId: characterMap.MATTHEW,
          speakerDisplayName: 'แมทธิว',
          content: '"ไม่เอาหน่าเอลล่า เลิกทำเหมือนโลกจะแตกสักทีเถอะ เดี๋ยวพอไปถึงหน้างานเธอก็ทำได้เองนั่นแหละ" ชายหนุ่มเอ่ยกระแทกกระทั้นอย่างหัวเสีย',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          },
          displaySpeed: 50
        }
      ],
      audios: [
        {
          instanceId: 'bgm_scene1a',
          type: 'background_music',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia',
          volume: 0.8,
          loop: true,
          autoplayOnLoad: true
        }
      ],
      timelineTracks: [
        {
          trackId: 'main_track',
          trackName: 'Main Timeline',
          events: [
            {
              eventId: 'show_matthew',
              startTimeMs: 0,
              eventType: 'show_character',
              targetInstanceId: 'matthew_instance',
              parameters: {
                transitionDurationMs: 1000
              }
            },
            {
              eventId: 'show_dialogue',
              startTimeMs: 1000,
              eventType: 'show_text_block',
              targetInstanceId: 'dialogue_1a',
              parameters: {
                transitionDurationMs: 500
              }
            }
          ]
        }
      ]
    },

    // Scene 1b - เอลล่าตอบ
    {
      novelId,
      episodeId,
      sceneOrder: 3,
      nodeId: 'scene1b',
      title: 'สนทนา',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'matthew_listening_1b',
          characterId: characterMap.MATTHEW,
          expressionId: 'frustrated',
          transform: {
            positionX: 200,
            positionY: -50,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        },
        {
          instanceId: 'ella_speaking_1b',
          characterId: characterMap.ELLA,
          expressionId: 'angry',
          transform: {
            positionX: -200,
            positionY: -20,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 2
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'dialogue_1b',
          type: 'dialogue',
          characterId: characterMap.ELLA,
          speakerDisplayName: 'เอลล่า',
          content: 'หล่อนแค่นหัวเราะ "นายมันบ้าไปแล้วแมท ผีตัวไหนเข้าสิงนายกันล่ะตอนที่นายตัดสินใจส่งยาให้พวกใต้ดิน"',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          },
          displaySpeed: 50
        }
      ],
      audios: [
        {
          instanceId: 'bgm_peaceful',
          type: 'background_music',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia',
          volume: 0.8,
          loop: true,
          autoplayOnLoad: true
        }
      ]
    },

    // Scene 1c - แมทธิวตอบ
    {
      novelId,
      episodeId,
      sceneOrder: 4,
      nodeId: 'scene1c',
      title: 'สนทนา2',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ella_listening_1c',
          characterId: characterMap.ELLA,
          expressionId: 'worried',
          transform: {
            positionX: -200,
            positionY: -20,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        },
        {
          instanceId: 'matthew_speaking_1c',
          characterId: characterMap.MATTHEW,
          expressionId: 'angry',
          transform: {
            positionX: 200,
            positionY: -40,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 2
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'dialogue_1c',
          type: 'dialogue',
          characterId: characterMap.MATTHEW,
          speakerDisplayName: 'แมทธิว',
          content: '"ก็ถ้าชั้นไม่โดนปล้นยาระหว่างทาง ป่านนี้เราคงรวยเละกันไปแล้ว" ชายหนุ่มกัดฟันอย่างแค้นใจ',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          },
          displaySpeed: 50
        }
      ]
    },

    // Scene 1d - เอลล่านิ่งงัน
    {
      novelId,
      episodeId,
      sceneOrder: 5,
      nodeId: 'scene1d',
      title: 'ความคิดของเอลล่า',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ella_thinking_1d',
          characterId: characterMap.ELLA,
          expressionId: 'worried',
          transform: {
            positionX: -200,
            positionY: -20,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 2
          },
          isVisible: true
        },
        {
          instanceId: 'matthew_present_1d',
          characterId: characterMap.MATTHEW,
          expressionId: 'normal',
          transform: {
            positionX: 200,
            positionY: -40,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'narration_1d',
          type: 'narration',
          content: 'หล่อนได้แต่นั่งนิ่งงันอยู่อย่างนั้น .... พลางนึกท้อแท้ใจในตัวแฟนหนุ่มของตัวเอง ชีวิตหล่อนราวกับดิ่งลงเหวแท้ๆ ตั้งแต่ที่หนีตามแมทธิวมาใช้ชีวิตในเมืองตั้งแต่ตอนอายุสิบสี่',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          },
          displaySpeed: 50
        }
      ]
    },

    // Scene 1e - ตัวเลือกแรก
    {
      novelId,
      episodeId,
      sceneOrder: 6,
      nodeId: 'scene1e',
      title: 'ตัวเลือกสำคัญ',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'choice_prompt',
          type: 'narration',
          content: 'หากคุณเป็นเอลล่า คุณเลือกที่จะ ... (ตัวเลือกมีผลต่อเนื้อเรื่อง กรุณาเลือกอย่างระมัดระวัง)',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          },
          displaySpeed: 50
        }
      ],
      choiceGroupsAvailable: [
        {
          instanceId: 'choice_group_1e',
          choiceGroupId: new mongoose.Types.ObjectId(), // จะต้องสร้าง choice group แยกต่างหาก
          transform: {
            positionX: 0,
            positionY: 200,
            opacity: 1,
            zIndex: 15
          }
        }
      ]
    },

    // Scene 1g - เลือกไม่ช่วย
    {
      novelId,
      episodeId,
      sceneOrder: 7,
      nodeId: 'scene1g',
      title: 'เลือกทางคุณธรรม',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'morality_gain',
          type: 'system_message',
          content: '+10 ค่าคุณธรรม',
          fontSize: 18,
          color: '#00ff00',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 50,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    },

    // Scene 1h - 3 วันต่อมา
    {
      novelId,
      episodeId,
      sceneOrder: 8,
      nodeId: 'scene1h',
      title: 'การเปลี่ยนเวลา',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'time_skip',
          type: 'narration',
          content: '3 วันต่อมา ...',
          fontSize: 20,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ],
      sceneTransitionOut: {
        type: 'fade',
        durationSeconds: 2,
        parameters: {}
      }
    },

    // Scene 1i - ข่าวฆาตกรรม
    {
      novelId,
      episodeId,
      sceneOrder: 9,
      nodeId: 'scene1i',
      title: 'ข่าวร้าย',
      background: {
        type: 'image',
        value: '/images/background/news.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'news_anchor',
          characterId: characterMap.ELLA, // ใช้ตัวละครที่มีอยู่เป็นผู้ประกาศข่าว
          expressionId: 'normal',
          transform: {
            positionX: 0,
            positionY: -100,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'news_dialogue',
          type: 'dialogue',
          speakerDisplayName: 'ผู้ประกาศข่าว',
          content: '"มาดูกันต่อที่ข่าวสลดค่ะ เกิดเหตุฆาตกรรมโหดคู่ชายหญิงนิรนามในห้องแถวแห่งหนึ่งในรัฐแคนซัสซิตี้"',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    },

    // Scene 1j - รายละเอียดข่าว
    {
      novelId,
      episodeId,
      sceneOrder: 10,
      nodeId: 'scene1j',
      title: 'รายละเอียดการฆาตกรรม',
      background: {
        type: 'image',
        value: '/images/background/blood.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'news_detail',
          type: 'narration',
          content: '"ทั้งสองถูกพบในสภาพถูกยิงเข้าที่ศรีษะ ในสถานที่เกิดเหตุพบยาเสพติดจำนวนหนึ่ง ทางตำรวจและพนักงานสืบสวนจึงตั้งเหตุแรงจูงใจในการก่อเหตุเบื้องต้นไปที่การฆาตกรรมในวงการการค้ายา ซึ่งจะทำการสืบสวนเพื่อหาต้นตอต่อไปค่ะ"',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    },

    // Scene 1k - ปิดข่าว
    {
      novelId,
      episodeId,
      sceneOrder: 11,
      nodeId: 'scene1k',
      title: 'จบข่าว',
      background: {
        type: 'image',
        value: '/images/background/news.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'news_anchor2',
          characterId: characterMap.ELLA,
          expressionId: 'normal',
          transform: {
            positionX: 0,
            positionY: -100,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'news_closing',
          type: 'dialogue',
          speakerDisplayName: 'ผู้ประกาศข่าว',
          content: '"และนี่คือทั้งหมดในช่วงเที่ยงวันทันทุกเรื่องค่ะ มาดูกันต่อที่ข่าวกีฬา ...."',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    }
  ];

  const savedScenes = [];
  for (const scene of scenes) {
    const sceneDoc = new SceneModel(scene);
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
  }
  
  return savedScenes;
};

// ข้อมูลฉากสำหรับ "The Chosen One"
const createChosenOneScenes = async (
  novelId: mongoose.Types.ObjectId, 
  episodeId: mongoose.Types.ObjectId, 
  characters: any[]
) => {
  const characterMap = characters.reduce((acc, char) => {
    acc[char.characterCode] = char._id;
    return acc;
  }, {});

  const scenes = [
    // Scene 1 - จุดเริ่มต้น
    {
      novelId,
      episodeId,
      sceneOrder: 1,
      nodeId: 'scene1',
      title: 'ลางร้าย',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'warning_dialogue',
          type: 'dialogue',
          speakerDisplayName: 'หญิงชรา',
          content: '"อย่าออกไปวิ่งเล่นที่รางรถไฟนะเด็กๆ!" หญิงชราย้ำเตือนลูกๆก่อนที่เจ้าพวกตัวแสบจะออกไปวิ่งเล่น แต่ก็เหมือนสายลมที่พัดมาแล้วก็ผ่านไป เพราะกลุ่มเด็กจอมซนทั้ง 4 คนไม่แม้แต่จะหยุดฟังด้วยซ้ำ...',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ],
      audios: [
        {
          instanceId: 'peaceful_bgm',
          type: 'background_music',
          mediaId: new mongoose.Types.ObjectId(),
          mediaSourceType: 'OfficialMedia',
          volume: 0.8,
          loop: true,
          autoplayOnLoad: true
        }
      ]
    },

    // Scene 2 - เด็กๆเล่น
    {
      novelId,
      episodeId,
      sceneOrder: 2,
      nodeId: 'scene2',
      title: 'เด็กๆเล่นกัน',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ana_playing_s2',
          characterId: characterMap.ANA,
          expressionId: 'happy',
          transform: { positionX: -300, positionY: -40, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
          isVisible: true
        },
        {
          instanceId: 'hoshi_playing_s2',
          characterId: characterMap.HOSHI,
          expressionId: 'happy',
          transform: { positionX: -100, positionY: -40, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
          isVisible: true
        },
        {
          instanceId: 'cho_playing_s2',
          characterId: characterMap.CHO,
          expressionId: 'happy',
          transform: { positionX: 100, positionY: -40, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
          isVisible: true
        },
        {
          instanceId: 'riwsey_playing_s2',
          characterId: characterMap.RIWSEY,
          expressionId: 'happy',
          transform: { positionX: 300, positionY: -40, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'children_playing',
          type: 'narration',
          content: 'ในขณะที่เด็กๆทั้ง 4 กำลังวิ่งเล่นกันอย่างสนุกสนาน อีกด้านหนึ่งของริมทางรถไฟนั้นเอง กลับมีเด็กอีกคนหนึ่งกำลังจูงสุนัขตัวโปรดของเขาออกมาเดินเล่น...',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    },

    // Scene 3 - โทยะกับสุนัข
    {
      novelId,
      episodeId,
      sceneOrder: 3,
      nodeId: 'scene3',
      title: 'โทยะและอองรี',
      background: {
        type: 'image',
        value: '/images/background/slope.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'toya_main',
          characterId: characterMap.TOYA,
          expressionId: 'happy',
          transform: {
            positionX: -100,
            positionY: -40,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 1
          },
          isVisible: true
        },
        {
          instanceId: 'dog_main',
          characterId: characterMap.DOG,
          expressionId: 'normal',
          transform: { positionX: 100, positionY: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, zIndex: 1 },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'toya_playing',
          type: 'dialogue',
          characterId: characterMap.TOYA,
          speakerDisplayName: 'โทยะ',
          content: '"ฮ่าๆๆๆ อองรี! อย่ากระโดดใส่ชั้นสิ" เด็กชายเล่นกับลูกบอลและสุนัขของเขาอย่างสนุกสนานที่ริมทางด้านใน',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    },

    // Scene 4 - จนกระทั่ง...
    {
      novelId,
      episodeId,
      sceneOrder: 4,
      nodeId: 'scene4-suspense',
      title: 'ก่อนเหตุการณ์',
      background: {
        type: 'image',
        value: '/images/background/slope.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'suspense',
          type: 'narration',
          content: 'จนกระทั่ง ...',
          fontSize: 20,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ],
      sceneTransitionOut: {
        type: 'fade',
        durationSeconds: 3,
        parameters: {}
      }
    },

    // Scene 5 - ตัวเลือกสุดท้าย
    {
      novelId,
      episodeId,
      sceneOrder: 5,
      nodeId: 'scene5',
      title: 'การเลือกที่ยากลำบาก',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ana_trapped_s5',
          characterId: characterMap.ANA,
          expressionId: 'worried',
          transform: { x: 400, y: -40, scale: 1, rotation: 0 },
          isVisible: true
        },
        {
          instanceId: 'hoshi_trapped_s5',
          characterId: characterMap.HOSHI,
          expressionId: 'worried',
          transform: { x: 300, y: -40, scale: 1, rotation: 0 },
          isVisible: true
        },
        {
          instanceId: 'cho_trapped_s5',
          characterId: characterMap.CHO,
          expressionId: 'worried',
          transform: { x: 180, y: -40, scale: 1, rotation: 0 },
          isVisible: true
        },
        {
          instanceId: 'riwsey_trapped_s5',
          characterId: characterMap.RIWSEY,
          expressionId: 'worried',
          transform: { x: 90, y: -40, scale: 1, rotation: 0 },
          isVisible: true
        },
        {
          instanceId: 'dog_trapped_s5',
          characterId: characterMap.DOG,
          expressionId: 'normal',
          transform: { x: -170, y: 0, scale: 1, rotation: 0 },
          isVisible: true
        }
      ],
      textContents: [
        {
          instanceId: 'final_choice_setup',
          type: 'narration',
          content: 'ทางรถไฟนั้นเป็นทางแยก 2 ทาง ทางหนึ่งเป็นเด็กส่วนอีกทางเป็นสุนัข ที่ทั้งคู่กำลังติดอยู่ในรางรถไฟ หากคุณเป็นเจ้าหน้าที่ควบคุมรถไฟคุณจะเลือกสับรางไปในเส้นทางใด',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ],
      choiceGroupsAvailable: [
        {
          instanceId: 'final_choice_group',
          choiceGroupId: new mongoose.Types.ObjectId(),
          transform: {
            positionX: 0,
            positionY: 200,
            opacity: 1,
            zIndex: 15
          }
        }
      ]
    },

    // Scene 6 - จบ
    {
      novelId,
      episodeId,
      sceneOrder: 6,
      nodeId: 'scene39',
      title: 'ผลลัพธ์',
      background: {
        type: 'image',
        value: '/images/background/result.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [],
      textContents: [
        {
          instanceId: 'ending_message',
          type: 'narration',
          content: 'และนี่คือผลลัพธ์อุปนิสัยของคุณแบบคร่าวๆ ขอบคุณที่ร่วมเล่นสนุกกับพวกเรา PATHY!',
          fontSize: 16,
          color: '#ffffff',
          textAlign: 'center',
          transform: {
            positionX: 0,
            positionY: 100,
            opacity: 1,
            zIndex: 10
          }
        }
      ]
    }
  ];

  const savedScenes = [];
  for (const scene of scenes) {
    const sceneDoc = new SceneModel(scene);
    await sceneDoc.save();
    savedScenes.push(sceneDoc);
  }
  
  return savedScenes;
};

// สร้างนิยาย "Now or Never"
const createNowOrNeverNovel = async (authorId: mongoose.Types.ObjectId) => {
  const novel = new NovelModel({
    title: 'Now or Never',
    slug: 'now-or-never',
    author: authorId,
    synopsis: 'เมื่อเอลล่า และแฟนหนุ่มรวมถึงผองเพื่อนต้องออกปล้นเพื่อใช้หนี้ที่คฤหาสน์แห่งหนึ่ง แต่พวกเขาหารู้ไม่ ... ว่าอาจมีอะไรบางอย่างกำลังรอพวกเขาอยู่',
    longDescription: 'นิยายระทึกขวัญที่จะพาคุณสำรวจความซับซ้อนของจิตใจมนุษย์ผ่านการเลือกที่ยากลำบาก เมื่อเอลล่าและแมทธิวพร้อมด้วยเพื่อนๆ ต้องเผชิญกับความจำเป็นที่บีบคั้นให้พวกเขาต้องก้าวข้ามเส้นแบ่งระหว่างความถูกและความผิด ในคืนที่ชะตากรรมจะเปลี่ยนแปลงชีวิตพวกเขาไปตลอดกาล',
    coverImageUrl: 'https://picsum.photos/seed/now-or-never/400/600',
    bannerImageUrl: 'https://picsum.photos/seed/now-or-never-banner/1200/400',
    themeAssignment: {
      mainTheme: {
        categoryId: new mongoose.Types.ObjectId(),
        customName: 'ระทึกขวัญจิตวิทยา'
      },
      subThemes: [
        {
          categoryId: new mongoose.Types.ObjectId(),
          customName: 'การเลือกทางศีลธรรม'
        },
        {
          categoryId: new mongoose.Types.ObjectId(),
          customName: 'ความรักและการเสียสละ'
        }
      ],
      moodAndTone: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      contentWarnings: [new mongoose.Types.ObjectId()],
      customTags: ['การเลือก', 'วัยรุ่น', 'ศีลธรรม', 'อาชญากรรม', 'ความรัก', 'ระทึกขวัญ']
    },
    narrativeFocus: {
      narrativePacingTags: [new mongoose.Types.ObjectId()],
      primaryConflictTypes: [new mongoose.Types.ObjectId()],
      narrativePerspective: new mongoose.Types.ObjectId(),
      artStyle: new mongoose.Types.ObjectId(),
      commonTropes: [new mongoose.Types.ObjectId()],
      interactivityLevel: new mongoose.Types.ObjectId(),
      lengthTag: new mongoose.Types.ObjectId(),
      targetAudienceProfileTags: [new mongoose.Types.ObjectId()]
    },
    worldBuildingDetails: {
      loreSummary: 'โลกแห่งการเลือกที่ยากลำบาก ที่ซึ่งทุกการตัดสินใจล้วนมีผลต่อชะตากรรม',
      technologyPrinciples: 'สมัยใหม่ในเมืองใหญ่ที่เต็มไปด้วยโอกาสและอันตราย'
    },
    ageRatingCategoryId: new mongoose.Types.ObjectId(),
    status: NovelStatus.PUBLISHED,
    accessLevel: NovelAccessLevel.PUBLIC,
    isCompleted: false,
    endingType: NovelEndingType.MULTIPLE_ENDINGS,
    sourceType: {
      type: NovelContentType.INTERACTIVE_FICTION
    },
    language: new mongoose.Types.ObjectId(),
    totalEpisodesCount: 3,
    publishedEpisodesCount: 3,
    stats: {
      totalRevenueCoins: 45890,
      viewsCount: 289450,
      uniqueViewersCount: 198760,
      likesCount: 24850,
      commentsCount: 6845,
      discussionThreadCount: 1234,
      ratingsCount: 4567,
      averageRating: 4.8,
      followersCount: 32890,
      sharesCount: 8945,
      bookmarksCount: 38560,
      totalWords: 45000,
      estimatedReadingTimeMinutes: 180,
      completionRate: 91.2,
      purchasesCount: 9184,
      lastPublishedEpisodeAt: new Date('2024-01-15'),
      currentReaders: 678,
      peakConcurrentReaders: 1245,
      trendingStats: {
        viewsLast24h: 8945,
        viewsLast48h: 17820,
        likesLast24h: 567,
        likesLast3Days: 1245,
        commentsLast24h: 234,
        newFollowersLastWeek: 892,
        trendingScore: 98.7,
        lastTrendingScoreUpdate: new Date()
      }
    },
    monetizationSettings: {
      isCoinBasedUnlock: true,
      defaultEpisodePriceCoins: 50,
      allowDonations: true,
      isAdSupported: false,
      isPremiumExclusive: false,
      activePromotion: {
        promotionalPriceCoins: 35,
        promotionStartDate: new Date('2024-01-01'),
        promotionEndDate: new Date('2024-03-31'),
        isActive: true,
        promotionDescription: 'โปรโมชันพิเศษเนื่องในโอกาสปีใหม่!'
      }
    },
    psychologicalAnalysisConfig: {
      allowsPsychologicalAnalysis: true,
      sensitiveChoiceCategoriesBlocked: [],
      lastAnalysisDate: new Date('2024-01-10'),
      analysisVersion: '2.1'
    },
    collaborationSettings: {
      allowCoAuthorRequests: true,
      pendingCoAuthors: []
    },
    isFeatured: true,
    publishedAt: new Date('2023-12-01'),
    lastContentUpdatedAt: new Date('2024-01-15'),
    isDeleted: false,
    createdAt: new Date('2023-11-15'),
    updatedAt: new Date('2024-01-15')
  });

  await novel.save();

  // สร้างตัวละคร
  const characters = await createNowOrNeverCharacters(novel._id, authorId);
  
  // สร้างตัวเลือก
  const choices = await createNowOrNeverChoices(novel._id, authorId);

  // สร้าง Episodes ทั้งหมดก่อน
  const episodeData = [
    {
      novelId: novel._id,
      authorId,
      title: 'บทนำ',
      slug: 'intro',
      episodeOrder: 1,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'เมื่อเอลล่า และแฟนหนุ่มรวมถึงผองเพื่อนต้องออกปล้นเพื่อใช้หนี้ที่คฤหาสน์แห่งหนึ่ง แต่พวกเขาหารู้ไม่ ... ว่าอาจมีอะไรบางอย่างกำลังรอพวกเขาอยู่',
      publishedAt: new Date('2023-12-01'),
      stats: {
        viewsCount: 45230,
        uniqueViewersCount: 32150,
        likesCount: 3420,
        commentsCount: 856,
        totalWords: 15000,
        estimatedReadingTimeMinutes: 60,
        purchasesCount: 0,
        averageReadingProgress: 89.5,
        dropOffRate: 10.5
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['suspense', 'decision_making', 'friendship'],
        authorDefinedIntensityScore: 4,
        aiPreliminaryOverallSentiment: 'mixed',
        aiPreliminarySentimentScore: 0.2
      },
      authorNotesBefore: 'ยินดีต้อนรับสู่โลกแห่งการเลือกที่ยากลำบาก เตรียมตัวให้พร้อมกับการตัดสินใจที่จะเปลี่ยนแปลงทุกสิ่ง',
      authorNotesAfter: 'การเลือกที่คุณทำในตอนนี้จะส่งผลต่อเรื่องราวทั้งหมด อย่าลืมคิดให้รอบคอบ',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-15')
    },
    {
      novelId: novel._id,
      authorId,
      title: 'เพื่อนรัก',
      slug: 'friends',
      episodeOrder: 2,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'เมื่อความสัมพันธ์ลับถูกมองเห็นโดยใครบางคน เธอคนนั้นจะตัดสินใจอย่างไร ...',
      publishedAt: new Date('2023-12-15'),
      stats: {
        viewsCount: 38760,
        uniqueViewersCount: 28420,
        likesCount: 2890,
        commentsCount: 745,
        totalWords: 18000,
        estimatedReadingTimeMinutes: 75,
        purchasesCount: 0,
        averageReadingProgress: 85.2,
        dropOffRate: 14.8
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['betrayal', 'friendship', 'loyalty_conflict'],
        authorDefinedIntensityScore: 5,
        aiPreliminaryOverallSentiment: 'negative',
        aiPreliminarySentimentScore: -0.3
      },
      authorNotesBefore: 'ความสัมพันธ์ที่แท้จริงจะถูกทดสอบในช่วงเวลาที่ยากลำบาก',
      authorNotesAfter: 'บางครั้งคนที่เราไว้วางใจมากที่สุดกลับเป็นคนที่ทำร้ายเราได้มากที่สุด',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-10')
    },
    {
      novelId: novel._id,
      authorId,
      title: 'ผู้ถูกเลือก',
      slug: 'chosen-one',
      episodeOrder: 3,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.PAID_UNLOCK,
      priceCoins: 35,
      originalPriceCoins: 50,
      promotions: [{
        promotionId: new mongoose.Types.ObjectId(),
        promotionType: 'percentage_discount',
        discountPercentage: 30,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        description: 'โปรโมชันปีใหม่ ลด 30%!'
      }],
      teaserText: 'เมื่อสถานการณ์ต้องบีบคั้นให้คุณกลายเป็นคนเลว คุณจะเลือกอะไรกันนะ :)',
      publishedAt: new Date('2024-01-01'),
      stats: {
        viewsCount: 42350,
        uniqueViewersCount: 25680,
        likesCount: 3635,
        commentsCount: 555,
        totalWords: 12000,
        estimatedReadingTimeMinutes: 45,
        purchasesCount: 3084,
        averageReadingProgress: 93.7,
        dropOffRate: 6.3
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['climax', 'moral_dilemma', 'consequence'],
        authorDefinedIntensityScore: 5,
        aiPreliminaryOverallSentiment: 'mixed',
        aiPreliminarySentimentScore: 0.1
      },
      authorNotesBefore: 'ตอนสุดท้ายที่จะเปิดเผยผลลัพธ์ของการเลือกทั้งหมด พร้อมหรือยัง?',
      authorNotesAfter: 'ขอบคุณที่ติดตามเรื่องราวของเอลล่าและเพื่อนๆ การเลือกของคุณจะอยู่ในใจเสมอ',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-15')
    }
  ];

  const episodes = await EpisodeModel.insertMany(episodeData);

  // สร้างฉากทั้งหมด แล้วแจกจ่ายให้ episode
  // โดยสร้างฉากทั้งหมดภายใต้ episode แรกก่อน เพื่อให้มี episodeId สำหรับสร้างฉาก
  const allScenes = await createNowOrNeverScenes(novel._id, episodes[0]._id, characters);

  // แจกจ่ายฉากตามสัดส่วนที่เหมาะสม (ตัวอย่าง: 4-4-3 สำหรับ 11 ฉาก)
  const episode1Scenes = allScenes.slice(0, 4); 
  const episode2Scenes = allScenes.slice(4, 8);
  const episode3Scenes = allScenes.slice(8);   

  // อัปเดต episodeId สำหรับฉากที่ไม่ใช่ของ episode 1
  for (const scene of episode2Scenes) {
    if (scene) await SceneModel.findByIdAndUpdate(scene._id, { episodeId: episodes[1]._id });
  }
  for (const scene of episode3Scenes) {
    if (scene) await SceneModel.findByIdAndUpdate(scene._id, { episodeId: episodes[2]._id });
  }

  // อัปเดต Episodes ด้วย firstSceneId และ sceneIds
  await EpisodeModel.findByIdAndUpdate(episodes[0]._id, {
    firstSceneId: episode1Scenes[0]?._id,
    sceneIds: episode1Scenes.map(s => s._id)
  });
  await EpisodeModel.findByIdAndUpdate(episodes[1]._id, {
    firstSceneId: episode2Scenes[0]?._id,
    sceneIds: episode2Scenes.map(s => s._id)
  });
  await EpisodeModel.findByIdAndUpdate(episodes[2]._id, {
    firstSceneId: episode3Scenes[0]?._id,
    sceneIds: episode3Scenes.map(s => s._id)
  });
  
  // --- New Logic: Associate Choices with Scenes ---
  console.log('🔗 กำลังเชื่อมโยง Choices เข้ากับ Scenes ที่ถูกต้อง (Now or Never)...');
  const sceneNodeMap = new Map(allScenes.map(s => [s.nodeId, s]));

  for (const choice of choices) {
    const goToNodeAction = choice.actions.find(a => a.type === 'go_to_node');
    if (!goToNodeAction || !goToNodeAction.parameters.targetNodeId) {
      console.warn(`️️⚠️ Choice "${choice.text}" (${choice._id}) ไม่มี targetNodeId, จะถูกข้ามไป`);
      continue;
    }

    const targetNodeId = goToNodeAction.parameters.targetNodeId;
    const targetScene = sceneNodeMap.get(targetNodeId);

    if (!targetScene) {
      console.warn(`️⚠️ ไม่พบ Scene ที่มี nodeId: "${targetNodeId}" สำหรับ Choice "${choice.text}", จะถูกข้ามไป`);
      continue;
    }

    let sourceScene = null;
    for (const scene of allScenes) {
      if (scene.sceneOrder === targetScene.sceneOrder - 1) {
        sourceScene = scene;
        break;
      }
    }

    if (sourceScene) {
      await SceneModel.findByIdAndUpdate(sourceScene._id, {
        $addToSet: { choiceIds: choice._id }
      });
      console.log(`✅  เพิ่ม Choice "${choice.text}" -> Scene "${sourceScene.title}" (Order: ${sourceScene.sceneOrder})`);
    } else {
      console.warn(`️⚠️ ไม่พบ Source Scene สำหรับ Choice "${choice.text}" (Target: ${targetNodeId}), จะถูกข้ามไป`);
    }
  }
  // --- End New Logic ---

  // ดึงข้อมูล episode ที่อัปเดตแล้วเพื่อให้ข้อมูลสอดคล้องกัน
  const updatedEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

  return { novel, episodes: updatedEpisodes, characters, choices, scenes: allScenes };
};

// สร้างนิยาย "The Chosen One"  
const createChosenOneNovel = async (authorId: mongoose.Types.ObjectId) => {
  const novel = new NovelModel({
    title: 'The Chosen One',
    slug: 'the-chosen-one',
    author: authorId,
    synopsis: 'ครอบครัวดัลลาสใช้ชีวิตอย่างปกติสุขมาโดยตลอด แต่ใครเล่าจะรู้... ว่าเหตุไม่คาดฝันที่มาจากความประมาทอาจเปลี่ยนชีวิตพวกเขาไปตลอดกาล',
    longDescription: 'นิยายปรัชญาที่จะท้าทายความคิดของคุณผ่านเรื่องราวของครอบครัวดัลลาส เมื่อเหตุการณ์ไม่คาดฝันเกิดขึ้น คุณจะต้องเลือกระหว่างการช่วยชีวิตเด็ก 4 คนหรือสุนัขตัวเดียว การเลือกของคุณจะสะท้อนให้เห็นถึงคุณค่าและความเชื่อที่แท้จริงของคุณ',
    coverImageUrl: 'https://picsum.photos/seed/chosen-one/400/600',
    bannerImageUrl: 'https://picsum.photos/seed/chosen-one-banner/1200/400',
    themeAssignment: {
      mainTheme: {
        categoryId: new mongoose.Types.ObjectId(),
        customName: 'ปรัชญาจริยธรรม'
      },
      subThemes: [
        {
          categoryId: new mongoose.Types.ObjectId(),
          customName: 'ความสัมพันธ์ระหว่างมนุษย์กับสัตว์'
        },
        {
          categoryId: new mongoose.Types.ObjectId(),
          customName: 'การเลือกที่ยากลำบาก'
        }
      ],
      moodAndTone: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      contentWarnings: [],
      customTags: ['จริยธรรม', 'การเลือก', 'ปรัชญา', 'จิตวิทยา', 'ครอบครัว', 'สัตว์']
    },
    narrativeFocus: {
      narrativePacingTags: [new mongoose.Types.ObjectId()],
      primaryConflictTypes: [new mongoose.Types.ObjectId()],
      narrativePerspective: new mongoose.Types.ObjectId(),
      artStyle: new mongoose.Types.ObjectId(),
      commonTropes: [new mongoose.Types.ObjectId()],
      interactivityLevel: new mongoose.Types.ObjectId(),
      lengthTag: new mongoose.Types.ObjectId(),
      targetAudienceProfileTags: [new mongoose.Types.ObjectId()]
    },
    worldBuildingDetails: {
      loreSummary: 'โลกที่เต็มไปด้วยการเลือกทางจริยธรรม ที่ซึ่งทุกการตัดสินใจสะท้อนถึงค่านิยมที่แท้จริง',
      technologyPrinciples: 'สมัยปัจจุบันที่มีระบบรถไฟและเทคโนโลยีการขนส่งที่ทันสมัย'
    },
    ageRatingCategoryId: new mongoose.Types.ObjectId(),
    status: NovelStatus.PUBLISHED,
    accessLevel: NovelAccessLevel.PUBLIC,
    isCompleted: true,
    endingType: NovelEndingType.MULTIPLE_ENDINGS,
    sourceType: {
      type: NovelContentType.INTERACTIVE_FICTION
    },
    language: new mongoose.Types.ObjectId(),
    totalEpisodesCount: 3,
    publishedEpisodesCount: 3,
    stats: {
      totalRevenueCoins: 18950,
      viewsCount: 398750,
      uniqueViewersCount: 267890,
      likesCount: 35680,
      commentsCount: 9234,
      discussionThreadCount: 1876,
      ratingsCount: 6789,
      averageRating: 4.9,
      followersCount: 45680,
      sharesCount: 12450,
      bookmarksCount: 54320,
      totalWords: 28000,
      estimatedReadingTimeMinutes: 120,
      completionRate: 95.7,
      purchasesCount: 3790,
      lastPublishedEpisodeAt: new Date('2024-01-20'),
      currentReaders: 892,
      peakConcurrentReaders: 1678,
      trendingStats: {
        viewsLast24h: 12450,
        viewsLast48h: 24890,
        likesLast24h: 834,
        likesLast3Days: 1876,
        commentsLast24h: 356,
        newFollowersLastWeek: 1245,
        trendingScore: 99.2,
        lastTrendingScoreUpdate: new Date()
      }
    },
    monetizationSettings: {
      isCoinBasedUnlock: false,
      defaultEpisodePriceCoins: 0,
      allowDonations: true,
      isAdSupported: true,
      isPremiumExclusive: false,
      activePromotion: {
        isActive: false
      }
    },
    psychologicalAnalysisConfig: {
      allowsPsychologicalAnalysis: true,
      sensitiveChoiceCategoriesBlocked: [],
      lastAnalysisDate: new Date('2024-01-18'),
      analysisVersion: '2.1'
    },
    collaborationSettings: {
      allowCoAuthorRequests: false,
      pendingCoAuthors: []
    },
    isFeatured: true,
    publishedAt: new Date('2023-11-15'),
    lastContentUpdatedAt: new Date('2024-01-20'),
    isDeleted: false,
    createdAt: new Date('2023-10-30'),
    updatedAt: new Date('2024-01-20')
  });

  await novel.save();

  // สร้างตัวละคร
  const characters = await createChosenOneCharacters(novel._id, authorId);
  
  // สร้างตัวเลือก
  const choices = await createChosenOneChoices(novel._id, authorId);

  // สร้าง Episodes ทั้งหมดก่อน
  const episodeData = [
    {
      novelId: novel._id,
      authorId,
      title: 'ลางร้าย',
      slug: 'bad-omen',
      episodeOrder: 1,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'ครอบครัวดัลลาสใช้ชีวิตอย่างปกติสุขมาโดยตลอด แต่ใครเล่าจะรู้... ว่าเหตุไม่คาดฝันที่มาจากความประมาทอาจเปลี่ยนชีวิตพวกเขาไปตลอดกาล',
      publishedAt: new Date('2023-11-15'),
      stats: {
        viewsCount: 58420,
        uniqueViewersCount: 42150,
        likesCount: 4850,
        commentsCount: 1245,
        totalWords: 9500,
        estimatedReadingTimeMinutes: 38,
        purchasesCount: 0,
        averageReadingProgress: 94.2,
        dropOffRate: 5.8
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['peaceful_beginning', 'foreshadowing', 'family_bonds'],
        authorDefinedIntensityScore: 2,
        aiPreliminaryOverallSentiment: 'positive',
        aiPreliminarySentimentScore: 0.6
      },
      authorNotesBefore: 'เรื่องราวเริ่มต้นด้วยความสงบสุข แต่จะจบลงอย่างไร?',
      authorNotesAfter: 'ลางร้ายเริ่มปรากฏแล้ว เตรียมตัวให้พร้อมสำหรับการเลือกที่ยากลำบาก',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-18')
    },
    {
      novelId: novel._id,
      authorId,
      title: 'เหตุไม่คาดฝัน',
      slug: 'unexpected-event',
      episodeOrder: 2,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'เมื่อมีอา เจมส์ ไลล่า 3พี่น้องรวมถึงเพื่อนรักอองรี... สุนัขพันธุ์บีเกิ้ลแสนน่ารักที่ทุกคนรักเสมือนสมาชิกในครอบครัว กลับพบกับเหตุการณ์ไม่คาดฝันขึ้นที่พวกเขาจะไม่มีวันลืมไปตลอดกาล',
      publishedAt: new Date('2023-12-01'),
      stats: {
        viewsCount: 52680,
        uniqueViewersCount: 38420,
        likesCount: 4320,
        commentsCount: 1189,
        totalWords: 8500,
        estimatedReadingTimeMinutes: 34,
        purchasesCount: 0,
        averageReadingProgress: 91.8,
        dropOffRate: 8.2
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['tension_building', 'accident', 'crisis_moment'],
        authorDefinedIntensityScore: 4,
        aiPreliminaryOverallSentiment: 'negative',
        aiPreliminarySentimentScore: -0.4
      },
      authorNotesBefore: 'ชีวิตสามารถเปลี่ยนแปลงได้ในพริบตา',
      authorNotesAfter: 'เหตุการณ์ที่ไม่คาดฝันเกิดขึ้นแล้ว คุณจะรับมือกับมันอย่างไร?',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-20')
    },
    {
      novelId: novel._id,
      authorId,
      title: 'ถึงเวลาต้องเลือก',
      slug: 'time-to-choose',
      episodeOrder: 3,
      status: EpisodeStatus.PUBLISHED,
      accessType: EpisodeAccessType.FREE,
      teaserText: 'เมื่อโชคชะตาบังคับให้คุณต้องเลือก ระหว่างความถูกต้องกับความถูกใจ แล้วคุณล่ะ... เลือกอะไร?',
      publishedAt: new Date('2023-12-15'),
      stats: {
        viewsCount: 45320,
        uniqueViewersCount: 31850,
        likesCount: 3670,
        commentsCount: 1220,
        totalWords: 10000,
        estimatedReadingTimeMinutes: 48,
        purchasesCount: 0,
        averageReadingProgress: 96.5,
        dropOffRate: 3.5
      },
      sentimentInfo: {
        authorDefinedEmotionTags: ['moral_choice', 'climax', 'philosophy', 'life_value'],
        authorDefinedIntensityScore: 5,
        aiPreliminaryOverallSentiment: 'mixed',
        aiPreliminarySentimentScore: 0.0
      },
      authorNotesBefore: 'การเลือกที่ยากที่สุดในชีวิต ไม่มีคำตอบที่ถูกหรือผิดแน่นอน',
      authorNotesAfter: 'ขอบคุณที่ร่วมคิดและตัดสินใจไปกับเรา การเลือกของคุณสะท้อนถึงค่านิยมที่แท้จริงของคุณ',
      isPreviewAllowed: true,
      lastContentUpdatedAt: new Date('2024-01-20')
    }
  ];

  const episodes = await EpisodeModel.insertMany(episodeData);

  // สร้างฉากทั้งหมด แล้วแจกจ่ายให้ episode
  // โดยสร้างฉากทั้งหมดภายใต้ episode แรกก่อน เพื่อให้มี episodeId สำหรับสร้างฉาก
  const allScenes = await createChosenOneScenes(novel._id, episodes[0]._id, characters);

  // แจกจ่ายฉากตามที่ผู้ใช้ระบุ (ep2 เริ่มที่ scene order 4)
  const episode1Scenes = allScenes.slice(0, 3); // Scenes 1-3
  const episode2Scenes = allScenes.slice(3, 4); // Scene 4
  const episode3Scenes = allScenes.slice(4);   // Scenes 5-6

  // อัปเดต episodeId สำหรับฉากที่ไม่ใช่ของ episode 1
  for (const scene of episode2Scenes) {
    await SceneModel.findByIdAndUpdate(scene._id, { episodeId: episodes[1]._id });
  }
  for (const scene of episode3Scenes) {
    await SceneModel.findByIdAndUpdate(scene._id, { episodeId: episodes[2]._id });
  }

  // อัปเดต Episodes ด้วย firstSceneId และ sceneIds
  await EpisodeModel.findByIdAndUpdate(episodes[0]._id, {
    firstSceneId: episode1Scenes[0]?._id,
    sceneIds: episode1Scenes.map(s => s._id)
  });
  await EpisodeModel.findByIdAndUpdate(episodes[1]._id, {
    firstSceneId: episode2Scenes[0]?._id,
    sceneIds: episode2Scenes.map(s => s._id)
  });
  await EpisodeModel.findByIdAndUpdate(episodes[2]._id, {
    firstSceneId: episode3Scenes[0]?._id,
    sceneIds: episode3Scenes.map(s => s._id)
  });
  
  // --- New Logic: Associate Choices with Scenes ---
  console.log('🔗 กำลังเชื่อมโยง Choices เข้ากับ Scenes ที่ถูกต้อง (The Chosen One)...');
  const sceneNodeMap = new Map(allScenes.map(s => [s.nodeId, s]));

  for (const choice of choices) {
    const goToNodeAction = choice.actions.find(a => a.type === 'go_to_node');
    if (!goToNodeAction || !goToNodeAction.parameters.targetNodeId) {
      console.warn(`️️⚠️ Choice "${choice.text}" (${choice._id}) ไม่มี targetNodeId, จะถูกข้ามไป`);
      continue;
    }

    const targetNodeId = goToNodeAction.parameters.targetNodeId;
    const targetScene = sceneNodeMap.get(targetNodeId);

    if (!targetScene) {
      console.warn(`️⚠️ ไม่พบ Scene ที่มี nodeId: "${targetNodeId}" สำหรับ Choice "${choice.text}", จะถูกข้ามไป`);
      continue;
    }

    let sourceScene = null;
    for (const scene of allScenes) {
      if (scene.sceneOrder === targetScene.sceneOrder - 1) {
        sourceScene = scene;
        break;
      }
    }

    if (sourceScene) {
      await SceneModel.findByIdAndUpdate(sourceScene._id, {
        $addToSet: { choiceIds: choice._id }
      });
      console.log(`✅  เพิ่ม Choice "${choice.text}" -> Scene "${sourceScene.title}" (Order: ${sourceScene.sceneOrder})`);
    } else {
      console.warn(`️⚠️ ไม่พบ Source Scene สำหรับ Choice "${choice.text}" (Target: ${targetNodeId}), จะถูกข้ามไป`);
    }
  }
  // --- End New Logic ---

  // ดึงข้อมูล episode ที่อัปเดตแล้วเพื่อให้ข้อมูลสอดคล้องกัน
  const updatedEpisodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });

  return { novel, episodes: updatedEpisodes, characters, choices, scenes: allScenes };
};

// ฟังก์ชันหลักสำหรับสร้างข้อมูล seed ทั้งหมด
export const seedNovelData = async () => {
  try {
    console.log('🌱 เริ่มต้นการสร้างข้อมูลนิยายจำลอง...');

    // เชื่อมต่อฐานข้อมูล
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/divwy');
      console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    }

    // สร้างผู้แต่ง
    console.log('👤 กำลังสร้างข้อมูลผู้แต่ง...');
    const authorId = await createMockAuthor();
    console.log(`✅ สร้างผู้แต่งสำเร็จ: ${authorId}`);

    // สร้างนิยาย "Now or Never"
    console.log('📚 กำลังสร้างนิยาย "Now or Never"...');
    const nowOrNeverData = await createNowOrNeverNovel(authorId);
    console.log(`✅ สร้างนิยาย "Now or Never" สำเร็จ:
    - นิยาย: ${nowOrNeverData.novel._id}
    - ตอน: ${nowOrNeverData.episodes.length} ตอน
    - ตัวละคร: ${nowOrNeverData.characters.length} ตัว
    - ตัวเลือก: ${nowOrNeverData.choices.length} ตัวเลือก
    - ฉาก: ${nowOrNeverData.scenes.length} ฉาก`);

    // สร้างนิยาย "The Chosen One"
    console.log('📚 กำลังสร้างนิยาย "The Chosen One"...');
    const chosenOneData = await createChosenOneNovel(authorId);
    console.log(`✅ สร้างนิยาย "The Chosen One" สำเร็จ:
    - นิยาย: ${chosenOneData.novel._id}
    - ตอน: ${chosenOneData.episodes.length} ตอน
    - ตัวละคร: ${chosenOneData.characters.length} ตัว
    - ตัวเลือก: ${chosenOneData.choices.length} ตัวเลือก
    - ฉาก: ${chosenOneData.scenes.length} ฉาก`);

    console.log('🎉 สร้างข้อมูลนิยายจำลองเสร็จสิ้น!');
    
    return {
      author: { _id: authorId },
      novels: [nowOrNeverData.novel, chosenOneData.novel],
      episodes: [...nowOrNeverData.episodes, ...chosenOneData.episodes],
      characters: [...nowOrNeverData.characters, ...chosenOneData.characters],
      choices: [...nowOrNeverData.choices, ...chosenOneData.choices],
      scenes: [...nowOrNeverData.scenes, ...chosenOneData.scenes]
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับเรียกใช้โดยตรง
export const runSeedNovelData = async () => {
  try {
    const result = await seedNovelData();
    console.log('📊 สรุปข้อมูลที่สร้าง:');
    console.log(`- ผู้แต่ง: 1 คน`);
    console.log(`- นิยาย: ${result.novels.length} เรื่อง`);
    console.log(`- ตอน: ${result.episodes.length} ตอน`);
    console.log(`- ตัวละคร: ${result.characters.length} ตัว`);
    console.log(`- ตัวเลือก: ${result.choices.length} ตัวเลือก`);
    console.log(`- ฉาก: ${result.scenes.length} ฉาก`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 การสร้างข้อมูลล้มเหลว:', error);
    process.exit(1);
  }
};

// หากไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
  runSeedNovelData();
} 