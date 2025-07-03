import mongoose from 'mongoose';
import { config } from 'dotenv';
import NovelModel from '@/backend/models/Novel';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import CharacterModel from '@/backend/models/Character';
import ChoiceModel from '@/backend/models/Choice';
import UserModel from '@/backend/models/User';

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;

// ข้อมูลผู้แต่งจำลอง
const createMockAuthor = async () => {
  const existingAuthor = await UserModel.findOne({ username: AUTHOR_USERNAME });
  if (existingAuthor) {
    return existingAuthor._id;
  }

  const author = new UserModel({
    username: AUTHOR_USERNAME || 'novelmaze_author',
    email: 'author@novelmaze.com',
    roles: ['Writer'],
    primaryPenName: 'นักเขียนจำลอง',
    isEmailVerified: true,
    isActive: true,
    isBanned: false,
    isDeleted: false,
  });

  await author.save();
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
      characterCode: 'MATTHEW',
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
      characterCode: 'JULIAN',
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
      characterCode: 'GRACIE',
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
      characterCode: 'DYLAN',
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
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene2a'
          }
        },
        {
          actionId: 'action2',
          type: 'MODIFY_PLAYER_STAT',
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
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene1g'
          }
        },
        {
          actionId: 'action2',
          type: 'MODIFY_PLAYER_STAT',
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
          type: 'GO_TO_NODE',
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
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene2m'
          }
        },
        {
          actionId: 'action2',
          type: 'MODIFY_PLAYER_STAT',
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
      characterCode: 'TOYA',
      name: 'โทยะ',
      fullName: 'โทยะ ดัลลาส',
      description: 'เด็กชายที่รักสุนัขของเขามาก มีจิตใจดีและเสียสละ',
      age: '12',
      gender: 'male',
      roleInStory: 'main_protagonist',
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
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene39'
          }
        },
        {
          actionId: 'action2',
          type: 'MODIFY_PLAYER_STAT',
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
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene39'
          }
        },
        {
          actionId: 'action2',
          type: 'MODIFY_PLAYER_STAT',
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
      title: 'จุดเริ่มต้น (ต่อ)',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'matthew_instance',
          characterId: characterMap.MATTHEW,
          expressionId: 'normal',
          transform: {
            positionX: 0,
            positionY: -50,
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
              eventType: 'SHOW_CHARACTER',
              targetInstanceId: 'matthew_instance',
              parameters: {
                transitionDurationMs: 1000
              }
            },
            {
              eventId: 'show_dialogue',
              startTimeMs: 1000,
              eventType: 'SHOW_TEXT_BLOCK',
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
      title: 'สนทนา',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ella_instance',
          characterId: characterMap.ELLA,
          expressionId: 'normal',
          transform: {
            positionX: 0,
            positionY: -20,
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
      title: 'สนทนา2',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'matthew_instance2',
          characterId: characterMap.MATTHEW,
          expressionId: 'angry',
          transform: {
            positionX: 0,
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
      title: 'ความคิดของเอลล่า',
      background: {
        type: 'image',
        value: '/images/background/home.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'ella_instance2',
          characterId: characterMap.ELLA,
          expressionId: 'worried',
          transform: {
            positionX: 0,
            positionY: -20,
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
      title: 'ลางร้าย',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'old_woman',
          characterId: characterMap.TOYA, // ใช้ตัวละครที่มีแทน
          expressionId: 'worried',
          transform: {
            positionX: -50,
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
      title: 'เด็กๆเล่นกัน',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'children_group',
          characterId: characterMap.TOYA,
          expressionId: 'happy',
          transform: {
            positionX: 0,
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

    // Scene 2c - ตัวเลือกสุดท้าย
    {
      novelId,
      episodeId,
      sceneOrder: 5,
      title: 'การเลือกที่ยากลำบาก',
      background: {
        type: 'image',
        value: '/images/background/train.png',
        isOfficialMedia: true,
        fitMode: 'cover'
      },
      characters: [
        {
          instanceId: 'children_trapped',
          characterId: characterMap.TOYA,
          expressionId: 'worried',
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

    // Scene 39 - จบ
    {
      novelId,
      episodeId,
      sceneOrder: 6,
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
    authorId,
    title: 'Now or Never',
    slug: 'now-or-never',
    synopsis: 'เมื่อเอลล่า และแฟนหนุ่มรวมถึงผองเพื่อนต้องออกปล้นเพื่อใช้หนี้ที่คฤหาสน์แห่งหนึ่ง แต่พวกเขาหารู้ไม่ ... ว่าอาจมีอะไรบางอย่างกำลังรอพวกเขาอยู่',
    description: 'นิยายระทึกขวัญเกี่ยวกับกลุ่มวัยรุ่นที่ต้องเลือกระหว่างความถูกและความผิด เมื่อความจำเป็นบังคับให้พวกเขาต้องทำสิ่งที่ไม่อยากทำ',
    status: 'published',
    genre: ['thriller', 'drama', 'crime'],
    demographics: ['young_adult'],
    isCompleted: false,
    isPremium: false,
    language: 'th',
    contentRating: 'mature',
    tags: ['การเลือก', 'วัยรุ่น', 'ศีลธรรม', 'อาชญากรรม', 'ความรัก'],
    stats: {
      viewsCount: 0,
      uniqueReadersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      ratingsCount: 0,
      averageRating: 0,
      totalWords: 15000,
      estimatedReadingTimeMinutes: 90,
      sharesCount: 0,
      bookmarksCount: 0
    },
    publishSettings: {
      isPublic: true,
      allowComments: true,
      allowRatings: true,
      requireAgeVerification: true
    }
  });

  await novel.save();

  // สร้างตัวละคร
  const characters = await createNowOrNeverCharacters(novel._id, authorId);
  
  // สร้างตัวเลือก
  const choices = await createNowOrNeverChoices(novel._id, authorId);

  // สร้าง Episodes
  const episodes = [];

  // Episode 1: บทนำ
  const episode1 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'บทนำ',
    slug: 'intro',
    episodeOrder: 1,
    status: 'published',
    accessType: 'free',
    teaserText: 'เมื่อเอลล่า และแฟนหนุ่มรวมถึงผองเพื่อนต้องออกปล้นเพื่อใช้หนี้ที่คฤหาสน์แห่งหนึ่ง แต่พวกเขาหารู้ไม่ ... ว่าอาจมีอะไรบางอย่างกำลังรอพวกเขาอยู่',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 5000,
      estimatedReadingTimeMinutes: 30,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode1.save();
  episodes.push(episode1);

  // สร้างฉากสำหรับ Episode 1
  const episode1Scenes = await createNowOrNeverScenes(novel._id, episode1._id, characters);

  // Episode 2: เพื่อนรัก
  const episode2 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'เพื่อนรัก',
    slug: 'friends',
    episodeOrder: 2,
    status: 'published',
    accessType: 'free',
    teaserText: 'เมื่อความสัมพันธ์ลับถูกมองเห็นโดยใครบางคน เธอคนนั้นจะตัดสินใจอย่างไร ...',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 6000,
      estimatedReadingTimeMinutes: 35,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode2.save();
  episodes.push(episode2);

  // Episode 3: ผู้ถูกเลือก
  const episode3 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'ผู้ถูกเลือก',
    slug: 'chosen-one',
    episodeOrder: 3,
    status: 'published',
    accessType: 'premium_access',
    priceCoins: 50,
    originalPriceCoins: 80,
    teaserText: 'เมื่อสถานการณ์ต้องบีบคั้นให้คุณกลายเป็นคนเลว คุณจะเลือกอะไรกันนะ :)',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 4000,
      estimatedReadingTimeMinutes: 25,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode3.save();
  episodes.push(episode3);

  return { novel, episodes, characters, choices, scenes: episode1Scenes };
};

// สร้างนิยาย "The Chosen One"  
const createChosenOneNovel = async (authorId: mongoose.Types.ObjectId) => {
  const novel = new NovelModel({
    authorId,
    title: 'The Chosen One',
    slug: 'the-chosen-one',
    synopsis: 'ครอบครัวดัลลาสใช้ชีวิตอย่างปกติสุขมาโดยตลอด แต่ใครเล่าจะรู้... ว่าเหตุไม่คาดฝันที่มาจากความประมาทอาจเปลี่ยนชีวิตพวกเขาไปตลอดกาล',
    description: 'เรื่องราวเกี่ยวกับการเลือกที่ยากลำบากระหว่างชีวิตมนุษย์และสัตว์ ผ่านสถานการณ์จำลองที่ทำให้เราตั้งคำถามเกี่ยวกับคุณค่าของชีวิต',
    status: 'published',
    genre: ['philosophical', 'drama', 'psychological'],
    demographics: ['general'],
    isCompleted: true,
    isPremium: false,
    language: 'th',
    contentRating: 'general',
    tags: ['จริยธรรม', 'การเลือก', 'ปรัชญา', 'จิตวิทยา', 'ครอบครัว'],
    stats: {
      viewsCount: 0,
      uniqueReadersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      ratingsCount: 0,
      averageRating: 0,
      totalWords: 8000,
      estimatedReadingTimeMinutes: 45,
      sharesCount: 0,
      bookmarksCount: 0
    },
    publishSettings: {
      isPublic: true,
      allowComments: true,
      allowRatings: true,
      requireAgeVerification: false
    }
  });

  await novel.save();

  // สร้างตัวละคร
  const characters = await createChosenOneCharacters(novel._id, authorId);
  
  // สร้างตัวเลือก
  const choices = await createChosenOneChoices(novel._id, authorId);

  // สร้าง Episodes
  const episodes = [];

  // Episode 1: ลางร้าย
  const episode1 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'ลางร้าย',
    slug: 'bad-omen',
    episodeOrder: 1,
    status: 'published',
    accessType: 'free',
    teaserText: 'ครอบครัวดัลลาสใช้ชีวิตอย่างปกติสุขมาโดยตลอด แต่ใครเล่าจะรู้... ว่าเหตุไม่คาดฝันที่มาจากความประมาทอาจเปลี่ยนชีวิตพวกเขาไปตลอดกาล',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 3000,
      estimatedReadingTimeMinutes: 18,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode1.save();
  episodes.push(episode1);

  // สร้างฉากสำหรับ Episode 1
  const episode1Scenes = await createChosenOneScenes(novel._id, episode1._id, characters);

  // Episode 2: เหตุไม่คาดฝัน
  const episode2 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'เหตุไม่คาดฝัน',
    slug: 'unexpected-event',
    episodeOrder: 2,
    status: 'published',
    accessType: 'free',
    teaserText: 'เมื่อมีอา เจมส์ ไลล่า 3พี่น้องรวมถึงเพื่อนรักอองรี... สุนัขพันธุ์บีเกิ้ลแสนน่ารักที่ทุกคนรักเสมือนสมาชิกในครอบครัว กลับพบกับเหตุการณ์ไม่คาดฝันขึ้นที่พวกเขาจะไม่มีวันลืมไปตลอดกาล',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 2500,
      estimatedReadingTimeMinutes: 15,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode2.save();
  episodes.push(episode2);

  // Episode 3: ถึงเวลาต้องเลือก
  const episode3 = new EpisodeModel({
    novelId: novel._id,
    authorId,
    title: 'ถึงเวลาต้องเลือก',
    slug: 'time-to-choose',
    episodeOrder: 3,
    status: 'published',
    accessType: 'free',
    teaserText: 'เมื่อโชคชะตาบังคับให้คุณต้องเลือก ระหว่างความถูกต้องกับความถูกใจ แล้วคุณล่ะ... เลือกอะไร?',
    publishedAt: new Date(),
    stats: {
      viewsCount: 0,
      uniqueViewersCount: 0,
      likesCount: 0,
      commentsCount: 0,
      totalWords: 2500,
      estimatedReadingTimeMinutes: 12,
      purchasesCount: 0
    },
    isPreviewAllowed: true,
    lastContentUpdatedAt: new Date()
  });

  await episode3.save();
  episodes.push(episode3);

  return { novel, episodes, characters, choices, scenes: episode1Scenes };
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