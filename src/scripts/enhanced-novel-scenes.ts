// src/scripts/enhanced-novel-scenes.ts
// เพิ่มเติม scenes และ choices ที่ซับซ้อนสำหรับนิยาย "วิญญาณเมืองกรุง"

import SceneModel from '@/backend/models/Scene';
import ChoiceModel from '@/backend/models/Choice';
import EpisodeModel from '@/backend/models/Episode';
import { Types } from 'mongoose';

export async function createEnhancedScenes(baseData: any) {
  const { novel, characters, episodes, author } = baseData;

  // Scene 1.4a: เมื่ออริษายอมรับว่ากลัว
  const scene1_4a = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 4,
    title: 'ความกลัวครั้งแรก',
    background: {
      type: 'image',
      value: '/images/background/old_house_shadow.png'
    },
    characters: [
      {
        instanceId: 'arisa_scared',
        characterId: characters.arisa._id,
        expressionId: 'arisa_scared',
        transform: {
          positionX: -0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      },
      {
        instanceId: 'thana_comforting',
        characterId: characters.thana._id,
        expressionId: 'thana_serious',
        transform: {
          positionX: 0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      }
    ],
    textContents: [
      {
        instanceId: 'scared_001',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'ผม... ผมเห็นจริงๆ มีเงาอะไรขยับอยู่ในนั้น แต่มันไม่ใช่คน... มันคืออะไร?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'scared_002',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'ไม่ต้องกลัว... การที่คุณเห็นได้แสดงว่าคุณมีพรสวรรค์ แต่ยังไม่รู้จักควบคุม',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'scared_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'พรสวรรค์? คุณหมายถึงอะไร... ผมไม่เข้าใจ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'scared_004',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'คนที่มาถึงย่านนี้และเห็นได้... มักจะมีบางอย่างพิเศษ บางทีอาจเป็นเพราะอดีตชาติ หรือความผูกพันใดๆ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'scared_005',
        type: 'narration',
        content: 'ลมเย็นพัดผ่าน และทันใดนั้น เงาในหน้าต่างก็หายไป ราวกับมันรู้ว่าถูกสังเกตเห็น',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      }
    ],
    audios: [
      {
        instanceId: 'fear_theme',
        type: 'background_music',
        mediaId: 'fear_and_mystery.mp3',
        mediaSourceType: 'Media',
        volume: 0.4,
        loop: true
      },
      {
        instanceId: 'wind_sound',
        type: 'sound_effect',
        mediaId: 'cold_wind.mp3',
        mediaSourceType: 'Media',
        volume: 0.3,
        loop: false
      }
    ],
    choicePrompt: 'อริษาเริ่มเข้าใจว่าตัวเองมีความสามารถพิเศษ',
    defaultNextSceneId: null
  });

  // Scene 1.4b: เมื่ออริษาปฏิเสธ
  const scene1_4b = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 4,
    title: 'การปฏิเสธ',
    background: {
      type: 'image',
      value: '/images/background/old_street_evening.png'
    },
    characters: [
      {
        instanceId: 'arisa_skeptical',
        characterId: characters.arisa._id,
        expressionId: 'arisa_normal',
        transform: {
          positionX: -0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      },
      {
        instanceId: 'thana_disappointed',
        characterId: characters.thana._id,
        expressionId: 'thana_worried',
        transform: {
          positionX: 0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      }
    ],
    textContents: [
      {
        instanceId: 'deny_001',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'ผมมองดูแล้ว ไม่มีอะไรผิดปกติ แค่แสงเงาธรรมดา คุณคิดมากไป',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'deny_002',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: '(เฮาใจ) เข้าใจแล้ว... บางทีอาจยังไม่ถึงเวลา หรือผมอาจจะผิด',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'deny_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'คุณเป็นคนที่เชื่อเรื่องเหนือธรรมชาติใช่ไหม? ผมเข้าใจ... แต่ผมเป็นนักวิจัย ต้องอาศัยหลักฐาน',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'deny_004',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'หลักฐานบางอย่าง... อาจจะปรากฏให้เห็นเมื่อคุณพร้อมแล้ว งั้นขอให้โชคดีกับงานวิจัยนะครับ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'disappointment_theme',
        type: 'background_music',
        mediaId: 'missed_opportunity.mp3',
        mediaSourceType: 'Media',
        volume: 0.3,
        loop: true
      }
    ],
    choicePrompt: 'ธนาดูผิดหวัง และเดินจากไป...',
    defaultNextSceneId: null
  });

  // Scene 1.4c: เมื่ออริษาแสดงความสนใจ
  const scene1_4c = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 4,
    title: 'ประตูสู่ความลึกลับ',
    background: {
      type: 'image',
      value: '/images/background/old_house_mysterious.png'
    },
    characters: [
      {
        instanceId: 'arisa_curious',
        characterId: characters.arisa._id,
        expressionId: 'arisa_determined',
        transform: {
          positionX: -0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      },
      {
        instanceId: 'thana_pleased',
        characterId: characters.thana._id,
        expressionId: 'thana_smile',
        transform: {
          positionX: 0.2,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      }
    ],
    textContents: [
      {
        instanceId: 'curious_001',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'ผมเห็น... และผมอยากรู้ว่ามันคืออะไร ทำไมผมถึงเห็นได้ และมันหมายความว่าอย่างไร?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'curious_002',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: '(ยิ้ม) นั่นแหละสิ่งที่ผมรอคอย... คุณพร้อมที่จะเรียนรู้แล้ว แต่ก่อนอื่น เรามาพบยายนิ่มกันก่อน',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'curious_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'ยายนิ่ม? เธอคือใคร?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'curious_004',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'เธอเป็นคนที่รู้เรื่องราวของย่านนี้มากที่สุด... และเป็นคนที่จะอธิบายให้คุณเข้าใจว่า ทำไมคุณถึงมาถึงที่นี่',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'curious_005',
        type: 'narration',
        content: 'ขณะที่ธนาพูด เงาในหน้าต่างเริ่มเคลื่อนไหวอีกครั้ง ราวกับกำลังส่งสัญญาณบางอย่าง',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      }
    ],
    audios: [
      {
        instanceId: 'discovery_theme',
        type: 'background_music',
        mediaId: 'path_to_mystery.mp3',
        mediaSourceType: 'Media',
        volume: 0.35,
        loop: true
      },
      {
        instanceId: 'spiritual_sound',
        type: 'sound_effect',
        mediaId: 'spiritual_presence.mp3',
        mediaSourceType: 'Media',
        volume: 0.2,
        loop: false
      }
    ],
    choicePrompt: 'ธนาเสนอพาไปพบยายนิ่ม',
    defaultNextSceneId: null
  });

  // Scene 2.1: ร้านชาของยายนิ่ม
  const scene2_1 = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[1]._id,
    sceneOrder: 1,
    title: 'ร้านชาแห่งความลับ',
    background: {
      type: 'image',
      value: '/images/background/traditional_tea_house.png'
    },
    characters: [
      {
        instanceId: 'arisa_ep2',
        characterId: characters.arisa._id,
        expressionId: 'arisa_normal',
        transform: {
          positionX: -0.3,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      },
      {
        instanceId: 'thana_ep2',
        characterId: characters.thana._id,
        expressionId: 'thana_normal',
        transform: {
          positionX: 0,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      },
      {
        instanceId: 'granny_ep2',
        characterId: characters.granny_nim._id,
        expressionId: 'granny_wise',
        transform: {
          positionX: 0.3,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        },
        isVisible: true
      }
    ],
    textContents: [
      {
        instanceId: 'tea_001',
        type: 'narration',
        content: 'ร้านชาเก่าแก่ที่ดูเหมือนหยุดเวลาไว้ เสียงระฆังลมเบาๆ และกลิ่นธูปหอมๆ ที่ลอยฟุ้งในอากาศ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'tea_002',
        type: 'dialogue',
        characterId: characters.granny_nim._id,
        speakerDisplayName: 'ยายนิ่ม',
        content: 'มาแล้วสินะ... หนูคนที่ธนาว่า มานั่งเถอะลูก ยายรู้แล้วว่าหนูมาทำไม',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'tea_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'สวัสดีค่ะยาย... ยายรู้แล้วว่าหนูมาทำไมงั้นหรือคะ?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'tea_004',
        type: 'dialogue',
        characterId: characters.granny_nim._id,
        speakerDisplayName: 'ยายนิ่ม',
        content: 'พระยาศรีเมืองกรุงท่านบอกมาแล้ว... ท่านว่าจะมีคนมาช่วยท่านจัดการเรื่องที่ค้างคาอยู่',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'tea_005',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'พระยาศรีเมืองกรุง? ท่านคือใคร?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'tea_006',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: '(กระซิบ) วิญญาณเมืองกรุงที่ผมเล่าให้ฟัง... ท่านเป็นผู้คุมครองย่านนี้',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'tea_house_ambience',
        type: 'background_music',
        mediaId: 'ancient_wisdom.mp3',
        mediaSourceType: 'Media',
        volume: 0.25,
        loop: true
      },
      {
        instanceId: 'wind_chimes',
        type: 'sound_effect',
        mediaId: 'wind_chimes.mp3',
        mediaSourceType: 'Media',
        volume: 0.15,
        loop: true
      }
    ],
    choicePrompt: 'ยายนิ่มกล่าวถึงวิญญาณเมืองกรุง...',
    defaultNextSceneId: null
  });

  // สร้าง Choices ที่ซับซ้อนสำหรับ scene ต่างๆ
  const choicesTea = [
    await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene2_1._id.toString(),
      choiceCode: 'EP2_S1_CHOICE1',
      text: 'เล่าเรื่องของท่านให้ฟังหน่อยค่ะ',
      hoverText: 'อยากรู้ประวัติของวิญญาณเมืองกรุง',
      actions: [
        {
          actionId: 'action_010',
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene_2_2_spirit_story'
          }
        },
        {
          actionId: 'action_011',
          type: 'ADD_VARIABLE',
          parameters: {
            variableName: 'knowledge_spirit',
            value: 2
          }
        }
      ],
      displayOrder: 1
    }),

    await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene2_1._id.toString(),
      choiceCode: 'EP2_S1_CHOICE2',
      text: 'ท่านต้องการให้ฉันช่วยอะไร?',
      hoverText: 'เข้าเรื่องทันที อยากรู้ว่าต้องทำอะไร',
      actions: [
        {
          actionId: 'action_012',
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene_2_2_mission'
          }
        },
        {
          actionId: 'action_013',
          type: 'ADD_VARIABLE',
          parameters: {
            variableName: 'determination',
            value: 1
          }
        }
      ],
      displayOrder: 2
    }),

    await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene2_1._id.toString(),
      choiceCode: 'EP2_S1_CHOICE3',
      text: 'ฉันยังไม่เข้าใจเรื่องนี้เท่าไหร่',
      hoverText: 'ยังสับสนและต้องการคำอธิบายเพิ่มเติม',
      actions: [
        {
          actionId: 'action_014',
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene_2_2_confusion'
          }
        },
        {
          actionId: 'action_015',
          type: 'ADD_VARIABLE',
          parameters: {
            variableName: 'confusion_level',
            value: 1
          }
        }
      ],
      displayOrder: 3,
      conditions: [
        {
          conditionId: 'condition_001',
          type: 'VARIABLE_CHECK',
          parameters: {
            variableName: 'skepticism',
            operator: 'GREATER_THAN',
            value: 0
          }
        }
      ]
    })
  ];

  // อัปเดต Episode ให้มี firstSceneId
  await EpisodeModel.findByIdAndUpdate(episodes[1]._id, {
    firstSceneId: scene2_1._id
  });

  console.log('✅ Created enhanced scenes and complex choices');

  return {
    scenes: [scene1_4a, scene1_4b, scene1_4c, scene2_1],
    choices: choicesTea,
    sceneMapping: {
      'scene_1_4_scared': scene1_4a._id,
      'scene_1_4_deny': scene1_4b._id,
      'scene_1_4_curious': scene1_4c._id,
      'scene_2_1_tea_house': scene2_1._id
    }
  };
}

// ตัวแปรเกม และ consequences system
export const gameVariables = {
  // ความสัมพันธ์กับตัวละคร
  relationships: {
    trust_thana: { min: 0, max: 10, default: 0 },
    respect_granny: { min: 0, max: 10, default: 0 },
    spirit_approval: { min: -5, max: 10, default: 0 }
  },

  // ความสามารถพิเศษ
  abilities: {
    spiritual_sight: { min: 0, max: 5, default: 0 },
    courage: { min: 0, max: 5, default: 1 },
    wisdom: { min: 0, max: 5, default: 1 }
  },

  // ความรู้และข้อมูล
  knowledge: {
    spirit_lore: { min: 0, max: 10, default: 0 },
    local_history: { min: 0, max: 10, default: 0 },
    supernatural_understanding: { min: 0, max: 10, default: 0 }
  },

  // บุคลิกภาพ
  personality: {
    curiosity_level: { min: 0, max: 10, default: 5 },
    fear_level: { min: 0, max: 10, default: 0 },
    skepticism: { min: 0, max: 10, default: 3 }
  }
};

// Ending conditions
export const endingConditions = {
  good_ending: {
    requirements: [
      { variable: 'trust_thana', operator: 'GREATER_THAN', value: 7 },
      { variable: 'spirit_approval', operator: 'GREATER_THAN', value: 5 },
      { variable: 'spiritual_sight', operator: 'GREATER_THAN', value: 3 }
    ],
    title: 'ผู้พิทักษ์ใหม่',
    description: 'อริษาได้รับการยอมรับจากวิญญาณเมืองกรุงและกลายเป็นผู้พิทักษ์ย่านนี้คนใหม่'
  },

  romance_ending: {
    requirements: [
      { variable: 'trust_thana', operator: 'EQUAL', value: 10 },
      { variable: 'courage', operator: 'GREATER_THAN', value: 3 },
      { variable: 'fear_level', operator: 'LESS_THAN', value: 3 }
    ],
    title: 'ความรักที่เหนือกาลเวลา',
    description: 'อริษาและธนาร่วมกันปกป้องย่านเก่า พร้อมด้วยความรักที่แน่นแฟ้น'
  },

  scholar_ending: {
    requirements: [
      { variable: 'local_history', operator: 'GREATER_THAN', value: 8 },
      { variable: 'supernatural_understanding', operator: 'GREATER_THAN', value: 7 },
      { variable: 'skepticism', operator: 'GREATER_THAN', value: 5 }
    ],
    title: 'นักวิชาการแห่งลึกลับ',
    description: 'อริษากลายเป็นผู้เชี่ยวชาญด้านเรื่องเหนือธรรมชาติและเขียนงานวิจัยที่โด่งดัง'
  }
};

export default createEnhancedScenes; 