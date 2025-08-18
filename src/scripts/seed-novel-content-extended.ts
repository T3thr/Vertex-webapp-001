// src/scripts/seed-novel-content-extended.ts
// ส่วนขยายของ seed script สำหรับเนื้อหาที่ซับซ้อนและครบถ้วน

import dbConnect from '@/backend/lib/mongodb';
import SceneModel from '@/backend/models/Scene';
import ChoiceModel from '@/backend/models/Choice';
import { Types } from 'mongoose';

export async function createExtendedScenesAndChoices(baseData: any) {
  const { novel, characters, episodes } = baseData;
  
  console.log('🎬 Creating extended scenes and choices...');

  // Scene 1.2a: เลือกสำรวจทันที
  const scene1_2a = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 2,
    title: 'การสำรวจย่านเก่า',
    background: {
      type: 'image',
      value: '/images/background/old_market_day.png'
    },
    characters: [
      {
        instanceId: 'arisa_exploring',
        characterId: characters.arisa._id,
        expressionId: 'arisa_normal',
        transform: {
          positionX: 0,
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
        instanceId: 'explore_001',
        type: 'narration',
        content: 'อริษาเดินผ่านตลาดเก่าที่เต็มไปด้วยกลิ่นของอาหารไทยโบราณ เสียงของผู้คนที่พูดคุยกันด้วยสำเนียงกรุงเก่า และบรรยากาศที่เหมือนย้อนเวลากลับไปหลายสิบปี',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'explore_002',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: '(ใจคิด) น่าแปลกจัง... ที่นี่ให้ความรู้สึกคุ้นเคยมากกว่าที่ควรจะเป็น แม้ว่าจะเป็นครั้งแรกที่มาก็ตาม',
        fontFamily: 'Sarabun',
        fontSize: 16,
        color: '#666666'
      },
      {
        instanceId: 'explore_003',
        type: 'dialogue',
        speakerDisplayName: 'คุณป้าขายผลไม้',
        content: 'หนูคนใหม่ใช่ไหม? ที่นี่ไม่ค่อยมีคนแปลกหน้ามาเดินเล่นหรอกลูก',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'explore_004',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'ค่ะ หนูมาทำวิจัยเกี่ยวกับประวัติศาสตร์ของย่านนี้ แต่ดูเหมือนว่าที่นี่จะมีเรื่องราวมากกว่าที่อยู่ในหนังสือ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'explore_005',
        type: 'narration',
        content: 'คุณป้าหยุดปอกผลไม้และมองอริษาด้วยสายตาแปลกๆ เหมือนกำลังชั่งน้ำหนักว่าจะพูดอะไรดี',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'explore_006',
        type: 'dialogue',
        speakerDisplayName: 'คุณป้าขายผลไม้',
        content: 'งั้นหนูต้องระวังตัวให้ดีล่ะ... ที่นี่มีเรื่องแปลกๆ เกิดขึ้นบ่อยครั้ง โดยเฉพาะในตอนกลางคืน',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'market_ambience',
        type: 'sound_effect',
        mediaId: 'market_sounds.mp3',
        mediaSourceType: 'Media',
        volume: 0.2,
        loop: true
      }
    ],
    choicePrompt: 'อริษาควรตอบกับคุณป้าอย่างไร?'
  });

  // Choices สำหรับ scene 1.2a
  const choice1_2a_1 = await ChoiceModel.create({
    novelId: novel._id,
    authorId: baseData.author._id,
    originStoryMapNodeId: scene1_2a._id.toString(),
    choiceCode: 'EP1_S2A_CHOICE1',
    text: 'ถามเรื่องแปลกๆ ที่เกิดขึ้น',
    hoverText: 'อริษาอยากรู้เกี่ยวกับความลึกลับของย่านนี้',
    actions: [
      {
        actionId: 'action_003',
        type: 'GO_TO_NODE',
        parameters: {
          targetNodeId: 'scene_1_3_curious'
        }
      },
      {
        actionId: 'action_004',
        type: 'ADD_VARIABLE',
        parameters: {
          variableName: 'curiosity_level',
          value: 1
        }
      }
    ],
    displayOrder: 1
  });

  const choice1_2a_2 = await ChoiceModel.create({
    novelId: novel._id,
    authorId: baseData.author._id,
    originStoryMapNodeId: scene1_2a._id.toString(),
    choiceCode: 'EP1_S2A_CHOICE2',
    text: 'ขอบคุณและไปต่อ',
    hoverText: 'ไม่อยากก้าวก่ายเรื่องส่วนตัวของคนท้องถิ่น',
    actions: [
      {
        actionId: 'action_005',
        type: 'GO_TO_NODE',
        parameters: {
          targetNodeId: 'scene_1_3_polite'
        }
      }
    ],
    displayOrder: 2
  });

  // Scene 1.2b: เลือกไปพักก่อน
  const scene1_2b = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 2,
    title: 'ที่พักเก่าแก่',
    background: {
      type: 'image',
      value: '/images/background/old_guesthouse.png'
    },
    characters: [
      {
        instanceId: 'arisa_tired',
        characterId: characters.arisa._id,
        expressionId: 'arisa_normal',
        transform: {
          positionX: 0,
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
        instanceId: 'rest_001',
        type: 'narration',
        content: 'บ้านพักเก่าแก่ที่อริษาจองไว้เป็นบ้านไม้สองชั้นที่ได้รับการปรับปรุงให้เป็นที่พักสำหรับนักท่องเที่ยว แต่ยังคงกลิ่นอายของความเป็นไทยโบราณ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'rest_002',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: '(ใจคิด) ดีที่ฉันตัดสินใจมาเตรียมตัวก่อน... การวิจัยต้องใช้ความอดทนและการวางแผนที่ดี',
        fontFamily: 'Sarabun',
        fontSize: 16,
        color: '#666666'
      },
      {
        instanceId: 'rest_003',
        type: 'narration',
        content: 'ขณะที่อริษากำลังจัดของ เสียงเคาะประตูดังขึ้น...',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'rest_004',
        type: 'dialogue',
        speakerDisplayName: 'เสียงจากข้างนอก',
        content: 'สวัสดีครับ ผมธนา เป็นช่างภาพประจำย่าน ได้ยินว่ามีนักวิจัยมาใหม่',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'evening_ambience',
        type: 'background_music',
        mediaId: 'peaceful_evening.mp3',
        mediaSourceType: 'Media',
        volume: 0.25,
        loop: true
      }
    ],
    choicePrompt: 'ธนามาหาอริษา เธอควรตอบสนองอย่างไร?'
  });

  // Scene 1.3: การพบกับธนา (ครั้งแรก)
  const scene1_3 = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[0]._id,
    sceneOrder: 3,
    title: 'ช่างภาพลึกลับ',
    background: {
      type: 'image',
      value: '/images/background/old_guesthouse_entrance.png'
    },
    characters: [
      {
        instanceId: 'arisa_meeting',
        characterId: characters.arisa._id,
        expressionId: 'arisa_surprised',
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
        instanceId: 'thana_intro',
        characterId: characters.thana._id,
        expressionId: 'thana_normal',
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
        instanceId: 'meet_001',
        type: 'narration',
        content: 'อริษาเปิดประตูและพบกับชายหนุ่มวัยยี่สิบปลายที่ถือกล้องถ่ายรูปเก่าแก่ เขามีสายตาที่ดูลึกซึ้งและใบหน้าที่เป็นมิตร',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'meet_002',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'สวัสดีครับ ผมธนา วรรณศิลป์ เป็นช่างภาพที่ทำงานบันทึกประวัติศาสตร์ของย่านนี้มาสิบกว่าปีแล้ว',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'meet_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'สวัสดีค่ะ ดิฉันอริษา สุริยงค์ มาจากจุฬาฯ มาทำวิจัยเรื่องการอนุรักษ์มรดกทางวัฒนธรรม',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'meet_004',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: 'ผมเดาใกล้เคียง... คนที่มาที่นี่ด้วยจุดประสงค์แบบนี้มักมีบางอย่างพิเศษ... คุณรู้สึกแปลกๆ ตั้งแต่มาถึงไหม?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'meet_005',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'แปลกๆ งั้นหรือ... ตอนแรกก็คิดว่าเป็นเพราะเหนื่อยจากการเดินทาง',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'meet_006',
        type: 'dialogue',
        characterId: characters.thana._id,
        speakerDisplayName: 'ธนา',
        content: '(ยิ้มเล็กน้อย) ถ้าคุณต้องการคนช่วยในการวิจัย ผมยินดีครับ... แต่มีข้อแม้ว่า คุณต้องเปิดใจรับฟังสิ่งที่อาจจะแปลกไปจากที่คุณคิด',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'meeting_theme',
        type: 'background_music',
        mediaId: 'mysterious_encounter.mp3',
        mediaSourceType: 'Media',
        volume: 0.3,
        loop: true
      }
    ],
    choicePrompt: 'ธนาเสนอตัวช่วยงานวิจัย แต่ดูเหมือนจะมีเงื่อนไข...'
  });

  // Advanced Choices สำหรับ scene การพบธนา
  const choice1_3_1 = await ChoiceModel.create({
    novelId: novel._id,
    authorId: baseData.author._id,
    originStoryMapNodeId: scene1_3._id.toString(),
    choiceCode: 'EP1_S3_CHOICE1',
    text: 'ตกลง ฉันเปิดใจรับฟัง',
    hoverText: 'เลือกเชื่อใจธนาและรับการช่วยเหลือ',
    actions: [
      {
        actionId: 'action_006',
        type: 'GO_TO_NODE',
        parameters: {
          targetNodeId: 'scene_1_4_accept_help'
        }
      },
      {
        actionId: 'action_007',
        type: 'ADD_VARIABLE',
        parameters: {
          variableName: 'trust_thana',
          value: 1
        }
      },
      {
        actionId: 'action_008',
        type: 'UNLOCK_CHARACTER',
        parameters: {
          characterId: characters.thana._id.toString()
        }
      }
    ],
    displayOrder: 1,
    conditions: []
  });

  const choice1_3_2 = await ChoiceModel.create({
    novelId: novel._id,
    authorId: baseData.author._id,
    originStoryMapNodeId: scene1_3._id.toString(),
    choiceCode: 'EP1_S3_CHOICE2',
    text: 'ขอบคุณ แต่ฉันอยากลองทำเองก่อน',
    hoverText: 'ยังไม่ไว้ใจธนาเต็มที่ ต้องการสำรวจด้วยตัวเอง',
    actions: [
      {
        actionId: 'action_009',
        type: 'GO_TO_NODE',
        parameters: {
          targetNodeId: 'scene_1_4_solo_research'
        }
      },
      {
        actionId: 'action_010',
        type: 'ADD_VARIABLE',
        parameters: {
          variableName: 'independence',
          value: 1
        }
      }
    ],
    displayOrder: 2
  });

  const choice1_3_3 = await ChoiceModel.create({
    novelId: novel._id,
    authorId: baseData.author._id,
    originStoryMapNodeId: scene1_3._id.toString(),
    choiceCode: 'EP1_S3_CHOICE3',
    text: 'สิ่งแปลกๆ ที่คุณหมายถึงคืออะไร?',
    hoverText: 'อยากรู้ให้ชัดเจนก่อนตัดสินใจ',
    actions: [
      {
        actionId: 'action_011',
        type: 'GO_TO_NODE',
        parameters: {
          targetNodeId: 'scene_1_4_ask_more'
        }
      },
      {
        actionId: 'action_012',
        type: 'ADD_VARIABLE',
        parameters: {
          variableName: 'analytical_thinking',
          value: 1
        }
      }
    ],
    displayOrder: 3
  });

  // Scene สำหรับ Episode 2: การพบกับยายนิ่ม
  const scene2_1 = await SceneModel.create({
    novelId: novel._id,
    episodeId: episodes[1]._id,
    sceneOrder: 1,
    title: 'ยายนิ่มและร้านชาโบราณ',
    background: {
      type: 'image',
      value: '/images/background/old_tea_shop.png'
    },
    characters: [
      {
        instanceId: 'arisa_episode2',
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
        instanceId: 'granny_intro',
        characterId: characters.granny_nim._id,
        expressionId: 'granny_normal',
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
        instanceId: 'ep2_001',
        type: 'narration',
        content: 'วันที่สอง อริษาเดินเข้าไปในร้านชาเก่าแก่ที่ธนาแนะนำ กลิ่นหอมของชาจีนผสมเครื่องเทศไทยลอยฟุ้งในอากาศ',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'ep2_002',
        type: 'dialogue',
        characterId: characters.granny_nim._id,
        speakerDisplayName: 'ยายนิ่ม',
        content: 'หนูคนที่ธนาพาเมื่อวานใช่ไหม? มานั่งเถอะลูก ยายชงชาใหม่ให้',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'ep2_003',
        type: 'dialogue',
        characterId: characters.arisa._id,
        speakerDisplayName: 'อริษา',
        content: 'สวัสดีค่ะยาย ธนาบอกว่ายายรู้เรื่องประวัติของย่านนี้เป็นอย่างดี',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'ep2_004',
        type: 'dialogue',
        characterId: characters.granny_nim._id,
        speakerDisplayName: 'ยายนิ่ม',
        content: '(หัวเราะเบาๆ) รู้มากเกินไปอาจจะไม่ดีนะลูก... แต่เนื่องจากหนูมาด้วยความตั้งใจดี ยายจะเล่าให้ฟังบ้าง',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      },
      {
        instanceId: 'ep2_005',
        type: 'narration',
        content: 'ยายนิ่มมองรอบๆ เหมือนกำลังตรวจสอบว่าไม่มีใครได้ยิน แล้วโน้มตัวเข้าหาอริษา',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#333333'
      },
      {
        instanceId: 'ep2_006',
        type: 'dialogue',
        characterId: characters.granny_nim._id,
        speakerDisplayName: 'ยายนิ่ม',
        content: 'เรื่องที่หนูจะได้ยินต่อไปนี้... อย่าไปเล่าให้คนอื่นฟังเด็ดขาด เข้าใจมั้ยลูก?',
        fontFamily: 'Sarabun',
        fontSize: 18,
        color: '#4A4A4A'
      }
    ],
    audios: [
      {
        instanceId: 'tea_shop_ambience',
        type: 'background_music',
        mediaId: 'traditional_tea_house.mp3',
        mediaSourceType: 'Media',
        volume: 0.25,
        loop: true
      },
      {
        instanceId: 'tea_pour_sound',
        type: 'sound_effect',
        mediaId: 'tea_pouring.mp3',
        mediaSourceType: 'Media',
        volume: 0.4,
        loop: false
      }
    ],
    choicePrompt: 'ยายนิ่มกำลังจะเล่าความลับ คุณพร้อมที่จะรับฟังแล้วหรือยัง?'
  });

  // Update first scene references
  await scene1_2a.updateOne({ 'defaultNextSceneId': scene1_3._id });
  await scene1_2b.updateOne({ 'defaultNextSceneId': scene1_3._id });

  console.log('✅ Created extended scenes and choices');

  // Return updated data
  return {
    scenes: [scene1_2a, scene1_2b, scene1_3, scene2_1],
    choices: [choice1_2a_1, choice1_2a_2, choice1_3_1, choice1_3_2, choice1_3_3]
  };
}

// Branching storylines configuration
export const storyBranches = {
  trust_path: {
    description: 'เส้นทางที่อริษาเลือกเชื่อใจคนอื่น',
    affectedScenes: ['scene_1_4_accept_help', 'scene_2_1', 'scene_3_1_trust'],
    consequences: {
      relationships: { thana: +2, granny_nim: +1 },
      abilities: { spiritual_sight: +1 },
      knowledge: { supernatural_lore: +2 }
    }
  },
  independence_path: {
    description: 'เส้นทางที่อริษาเลือกพึ่งพาตัวเอง',
    affectedScenes: ['scene_1_4_solo_research', 'scene_2_2_alone', 'scene_3_1_solo'],
    consequences: {
      abilities: { investigation: +2, academic_research: +1 },
      knowledge: { historical_facts: +2 },
      risks: { supernatural_danger: +1 }
    }
  },
  analytical_path: {
    description: 'เส้นทางที่อริษาใช้เหตุผลเป็นหลัก',
    affectedScenes: ['scene_1_4_ask_more', 'scene_2_3_analytical', 'scene_3_1_logical'],
    consequences: {
      abilities: { critical_thinking: +2, problem_solving: +1 },
      knowledge: { scientific_approach: +2 },
      relationships: { academic_contacts: +1 }
    }
  }
};

// Character development paths
export const characterArcs = {
  arisa: {
    growth_stages: ['naive_student', 'curious_researcher', 'spiritual_awakened', 'protector_guardian'],
    key_relationships: ['thana', 'granny_nim', 'spirit'],
    major_decisions: ['trust_supernatural', 'embrace_destiny', 'protect_community']
  },
  thana: {
    growth_stages: ['mysterious_helper', 'trusted_ally', 'romantic_interest', 'spiritual_guide'],
    backstory_reveals: ['family_connection', 'spiritual_abilities', 'past_trauma'],
    relationship_arisa: ['stranger', 'friend', 'partner', 'soulmate']
  }
};

const seedNovelContentExtended = { createExtendedScenesAndChoices, storyBranches, characterArcs };

export default seedNovelContentExtended; 