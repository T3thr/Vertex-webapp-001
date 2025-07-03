// src/scripts/seed-novel-read.ts
// Seed script สำหรับนิยาย "วิญญาณเมืองกรุง" - Visual Novel แนวสยองขวัญแฟนตาซี
// REVISED: สคริปต์นี้ถูกปรับปรุงให้ทำงานร่วมกับ admin-seed.ts และ novel-seed.ts
// FIXED: เปลี่ยนวิธีการสร้างตัวละครเป็นแบบ insertMany เพื่อความเสถียรและป้องกัน E11000 duplicate key error

import dbConnect from '@/backend/lib/mongodb';
import UserModel from '@/backend/models/User';
import NovelModel from '@/backend/models/Novel';
import CharacterModel from '@/backend/models/Character';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import ChoiceModel from '@/backend/models/Choice';
import { Types } from 'mongoose';
import { config } from 'dotenv';

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env
config({ path: '.env' });

const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME;
const NOVEL_TITLE = "วิญญาณเมืองกรุง";
const NOVEL_SLUG = "วิญญาณเมืองกรุง".normalize('NFC').toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\p{M}-]+/gu, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '').substring(0, 280);


async function seedSpiritOfBangkokContent() {
  try {
    await dbConnect();
    console.log('🌟 Starting seed for "วิญญาณเมืองกรุง" Visual Novel Content...');

    // ==================================================================================================
    // SECTION 1: ค้นหาผู้เขียนและนิยายที่มีอยู่แล้ว
    // ==================================================================================================

    if (!AUTHOR_USERNAME) {
      throw new Error("AUTHOR_USERNAME environment variable is not set. Please run admin-seed.ts or set it in .env");
    }
    const author = await UserModel.findOne({ username: AUTHOR_USERNAME });
    if (!author) {
      throw new Error(`Author with username "${AUTHOR_USERNAME}" not found. Please run the admin-seed.ts script first.`);
    }
    console.log(`✅ Found author: ${author.username} (ID: ${author._id})`);

    const novel = await NovelModel.findOne({ slug: NOVEL_SLUG, author: author._id });
    if (!novel) {
      throw new Error(`Novel with slug "${NOVEL_SLUG}" for author "${author.username}" not found. Please run novel-seed.ts first.`);
    }
    console.log(`✅ Found novel: "${novel.title}" (ID: ${novel._id})`);

    // ==================================================================================================
    // SECTION 2: ล้างข้อมูลเนื้อหาเก่าของนิยายเรื่องนี้
    // ==================================================================================================
    console.log(`🧹 Cleaning up old content for novel ID: ${novel._id}...`);
    await EpisodeModel.deleteMany({ novelId: novel._id });
    await CharacterModel.deleteMany({ novelId: novel._id });
    await SceneModel.deleteMany({ novelId: novel._id });
    await ChoiceModel.deleteMany({ novelId: novel._id });
    console.log(`✅ Old content cleared successfully.`);


    // ==================================================================================================
    // SECTION 3: สร้างตัวละคร (Characters) สำหรับนิยายเรื่องนี้ (ปรับปรุงใหม่)
    // ==================================================================================================
    console.log('👥 Preparing character data...');

    const characterData = [
        {
            novelId: novel._id, authorId: author._id, characterCode: 'ARISA_001', name: 'อริษา', fullName: 'อริษา สุริยงค์', age: '22', gender: 'female',
            description: 'นักศึกษาโบราณคดีปีสุดท้าย มีความอยากรู้อยากเห็นสูง และไม่กลัวที่จะเผชิญหน้ากับสิ่งลึกลับ', roleInStory: 'main_protagonist', colorTheme: '#E8B4B8',
            expressions: [
                { expressionId: 'arisa_normal', name: 'ปกติ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'arisa_surprised', name: 'ตกใจ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'arisa_determined', name: 'มุ่งมั่น', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'arisa_scared', name: 'กลัว', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' }
            ],
            defaultExpressionId: 'arisa_normal',
            physicalAttributes: { heightCm: 165, eyeColor: 'น้ำตาลเข้ม', hairColor: 'ดำยาว', distinguishingFeatures: ['แหวนโบราณที่สวมนิ้วกลาง', 'กระเป๋าเก่าที่ใช้ใส่เครื่องมือขุดค้น'] },
            personalityTraits: { goals: ['ค้นหาความจริงเกี่ยวกับวิญญาณเมืองกรุง', 'ปกป้องมรดกทางวัฒนธรรม', 'จบการศึกษาด้วยเกียรตินิยม'], fears: ['การสูญเสียคนที่รัก', 'ความมืด', 'สิ่งเหนือธรรมชาติ'], strengths: ['ความกล้าหาญ', 'ปัญญาดี', 'มีสัญชาตญาณดี'], weaknesses: ['ดื้อ', 'ใจร้อน', 'เชื่อคนง่าย'], likes: ['หนังสือประวัติศาสตร์', 'กาแฟ', 'ดนตรีคลาสสิก'], dislikes: ['ความไม่ยุติธรรม', 'การโกหก', 'อาหารเผ็ด'], quotes: ['ความจริงมักซ่อนอยู่ในสิ่งที่เราไม่กล้ามอง', 'อดีตคือครู ปัจจุบันคือนักเรียน'] }
        },
        {
            novelId: novel._id, authorId: author._id, characterCode: 'THANA_001', name: 'ธนา', fullName: 'ธนา วรรณศิลป์', age: '28', gender: 'male',
            description: 'ช่างภาพท้องถิ่นที่มีความสามารถพิเศษในการมองเห็นวิญญาณ เป็นคนที่ช่วยเหลืออริษาในการค้นหาความจริง', roleInStory: 'love_interest', colorTheme: '#4A90A4',
            expressions: [
                { expressionId: 'thana_normal', name: 'ปกติ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'thana_serious', name: 'จริงจัง', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'thana_smile', name: 'ยิ้ม', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'thana_worried', name: 'กังวล', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' }
            ],
            defaultExpressionId: 'thana_normal',
            personalityTraits: { goals: ['ปกป้องย่านเก่าจากการพัฒนา', 'ช่วยเหลือวิญญาณที่ติดค้างอยู่', 'ดูแลอริษา'], strengths: ['ใจเย็น', 'มีประสบการณ์', 'อ่านใจคนเก่ง'], weaknesses: ['ไม่ค่อยเปิดใจ', 'ขี้กังวล', 'กลัวการสูญเสีย'] }
        },
        {
            novelId: novel._id, authorId: author._id, characterCode: 'GRANNY_001', name: 'ยายนิ่ม', fullName: 'นิ่มนวล จันทร์แก้ว', age: '78', gender: 'female',
            description: 'ยายแก่ผู้เป็นเหมือนหัวหน้าชุมชนนอกทางการ มีความรู้เรื่องเก่าแก่และตำนานของย่านนี้มากมาย', roleInStory: 'mentor', colorTheme: '#8B4513',
            expressions: [
                { expressionId: 'granny_normal', name: 'ปกติ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'granny_wise', name: 'ชาญฉลาด', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' }
            ],
            defaultExpressionId: 'granny_normal'
        },
        {
            novelId: novel._id, authorId: author._id, characterCode: 'SPIRIT_001', name: 'วิญญาณเมืองกรุง', fullName: 'พระยาศรีเมืองกรุง', age: 'เก่าแก่', gender: 'not_specified',
            description: 'วิญญาณผู้คุมครองย่านเก่าของกรุงเทพฯ มีอำนาจลึกลับและปรากฏตัวเป็นครั้งคราว', roleInStory: 'antagonist', colorTheme: '#663399',
            expressions: [
                { expressionId: 'spirit_normal', name: 'ปกติ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' },
                { expressionId: 'spirit_angry', name: 'โกรธ', mediaId: new Types.ObjectId(), mediaSourceType: 'Media' }
            ],
            defaultExpressionId: 'spirit_normal'
        }
    ];

    console.log(`Inserting ${characterData.length} characters...`);
    const insertedCharacters = await CharacterModel.insertMany(characterData);

    // สร้าง Object characters ขึ้นมาใหม่เพื่อให้โค้ดส่วนที่เหลือทำงานได้
    const characters: { [key: string]: any } = {};
    insertedCharacters.forEach(char => {
        if (char.characterCode === 'ARISA_001') characters.arisa = char;
        if (char.characterCode === 'THANA_001') characters.thana = char;
        if (char.characterCode === 'GRANNY_001') characters.granny_nim = char;
        if (char.characterCode === 'SPIRIT_001') characters.spirit = char;
    });

    console.log('✅ Created characters successfully.');

    // ==================================================================================================
    // SECTION 4: สร้าง Episodes, Scenes, และ Choices
    // ==================================================================================================
    const episodes = [];

    // Episode 1: การเริ่มต้น
    console.log('📖 Creating Episode 1...');
    const episode1 = await EpisodeModel.create({
      novelId: novel._id,
      authorId: author._id,
      title: 'การมาถึงย่านเก่า',
      episodeOrder: 1,
      status: 'published',
      accessType: 'free',
      teaserText: 'อริษาเดินทางมาถึงย่านเก่าของกรุงเทพฯ เพื่อเริ่มต้นงานวิจัย แต่เธอไม่รู้ว่าสิ่งที่รออยู่จะเปลี่ยนชีวิตเธอไปตลอดกาล',
      stats: { viewsCount: 120, uniqueViewersCount: 80, likesCount: 45, commentsCount: 12, totalWords: 850, estimatedReadingTimeMinutes: 4 },
      publishedAt: new Date(),
      lastContentUpdatedAt: new Date()
    });

    // Scene 1.1: อริษาถึงย่านเก่า
    const scene1_1 = await SceneModel.create({
      novelId: novel._id,
      episodeId: episode1._id,
      sceneOrder: 1,
      title: 'ย่านเก่าในวันแรก',
      background: { type: 'image', value: '/images/background/old_bangkok_street.png' },
      characters: [{ instanceId: 'arisa_main', characterId: characters.arisa._id, expressionId: 'arisa_normal', transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, opacity: 1 }, isVisible: true }],
      textContents: [
        { instanceId: 'text_001', type: 'narration', content: 'รถแท็กซี่สีเหลือง-เขียวคันเก่าแก่แล่นผ่านถนนลาดยางที่แคบ ข้างทางเต็มไปด้วยบ้านไม้โบราณที่ดูเหมือนจะเล่าเรื่องราวอันยาวนานได้', fontFamily: 'Sarabun', fontSize: 18, color: '#333333' },
        { instanceId: 'text_002', type: 'narration', content: 'อริษามองออกไปนอกหน้าต่างด้วยความทึ่ง... นี่คือกรุงเทพฯ ที่เธอไม่เคยเห็นมาก่อน', fontFamily: 'Sarabun', fontSize: 18, color: '#333333' },
        { instanceId: 'text_003', type: 'dialogue', characterId: characters.arisa._id, speakerDisplayName: 'อริษา', content: 'ลุงคะ ที่นี่คือย่านที่ยังไม่ถูกพัฒนาแบบที่ว่าใช่ไหม?', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' },
        { instanceId: 'text_004', type: 'dialogue', speakerDisplayName: 'คนขับแท็กซี่', content: 'ใช่แล้วลูก... ที่นี่เก่าแก่มาตั้งแต่สมัยรัชกาลที่ 5 แล้ว คนแถวนี้เขาไม่ค่อยอยากให้เปลี่ยนแปลงอะไร เพราะกลัวจะทำลายสิ่งที่เขาคุ้นเคย', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' },
        { instanceId: 'text_005', type: 'dialogue', characterId: characters.arisa._id, speakerDisplayName: 'อริษา', content: '(ใจคิด) นั่นแหละที่ทำให้ที่นี่น่าสนใจ... ฉันสงสัยว่าจะมีเรื่องราวอะไรซ่อนอยู่บ้าง', fontFamily: 'Sarabun', fontSize: 16, color: '#666666' }
      ],
      audios: [{ instanceId: 'bgm_001', type: 'background_music', mediaId: new Types.ObjectId(), mediaSourceType: 'Media', volume: 0.3, loop: true }],
      choicePrompt: 'เมื่อถึงที่หมาย อริษาควรจะ...'
    });
    console.log('    ...Created Scene 1.1');

    // สร้าง Choice สำหรับ scene 1.1
    const choice1_1 = await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene1_1._id.toString(),
      choiceCode: 'EP1_S1_CHOICE1',
      text: 'ลงจากแท็กซี่และเริ่มสำรวจย่านทันที',
      hoverText: 'อริษาตัดสินใจสำรวจบริเวณทันทีที่มาถึง',
      actions: [{ actionId: 'action_001', type: 'go_to_node', parameters: { targetNodeId: 'scene_1_2_explore' }}],
      displayOrder: 1,
      version: 1 
    });
    const choice1_2 = await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene1_1._id.toString(),
      choiceCode: 'EP1_S1_CHOICE2',
      text: 'ไปที่บ้านพักก่อนแล้วค่อยวางแผน',
      hoverText: 'เตรียมตัวให้พร้อมก่อนเริ่มงานวิจัย',
      actions: [{ actionId: 'action_002', type: 'go_to_node', parameters: { targetNodeId: 'scene_1_2_rest' } }],
      displayOrder: 2,
      version: 1
    });
    console.log('    ...Created Choices for Scene 1.1');

    // Scene 1.2a: เลือกสำรวจทันที
    const scene1_2a = await SceneModel.create({
      novelId: novel._id, episodeId: episode1._id, sceneOrder: 2, title: 'การสำรวจย่านเก่า',
      sceneCode: 'scene_1_2_explore',
      background: { type: 'image', value: '/images/background/old_market_day.png' },
      characters: [{ instanceId: 'arisa_exploring', characterId: characters.arisa._id, expressionId: 'arisa_normal', transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, opacity: 1 }, isVisible: true }],
      textContents: [
        { instanceId: 'explore_001', type: 'narration', content: 'อริษาเดินผ่านตลาดเก่าที่เต็มไปด้วยกลิ่นของอาหารไทยโบราณ เสียงของผู้คนที่พูดคุยกันด้วยสำเนียงกรุงเก่า และบรรยากาศที่เหมือนย้อนเวลากลับไปหลายสิบปี', fontFamily: 'Sarabun', fontSize: 18, color: '#333333' },
        { instanceId: 'explore_003', type: 'dialogue', speakerDisplayName: 'คุณป้าขายผลไม้', content: 'หนูคนใหม่ใช่ไหม? ที่นี่ไม่ค่อยมีคนแปลกหน้ามาเดินเล่นหรอกลูก', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' },
        { instanceId: 'explore_004', type: 'dialogue', characterId: characters.arisa._id, speakerDisplayName: 'อริษา', content: 'ค่ะ หนูมาทำวิจัยเกี่ยวกับประวัติศาสตร์ของย่านนี้ แต่ดูเหมือนว่าที่นี่จะมีเรื่องราวมากกว่าที่อยู่ในหนังสือ', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' }
      ],
      audios: [{ instanceId: 'market_ambience', type: 'sound_effect', mediaId: new Types.ObjectId(), mediaSourceType: 'Media', volume: 0.2, loop: true }],
    });

    // Scene 1.2b: เลือกกลับไปพัก
    const scene1_2b = await SceneModel.create({
        novelId: novel._id, episodeId: episode1._id, sceneOrder: 2, title: 'เข้าที่พัก',
        sceneCode: 'scene_1_2_rest',
        background: { type: 'image', value: '/images/background/guesthouse_room.png' },
        textContents: [
          { instanceId: 'rest_001', type: 'narration', content: 'อริษาตัดสินใจเข้าที่พักก่อนเพื่อเก็บของและตั้งหลัก เธอวางแผนการสำรวจบนแผนที่กระดาษใบเก่า พลางจิบชาอุ่นๆ', fontFamily: 'Sarabun', fontSize: 18, color: '#333333' },
        ],
    });

    // อัปเดต Choice ให้ชี้ไปยัง Scene ที่ถูกต้อง
    choice1_1.actions[0].parameters.targetNodeId = scene1_2a._id.toString();
    await choice1_1.save();
    choice1_2.actions[0].parameters.targetNodeId = scene1_2b._id.toString();
    await choice1_2.save();


    // Scene 1.3: การพบกับธนา (เป็นฉากที่ตามมาไม่ว่าเลือกทางไหน)
    const scene1_3 = await SceneModel.create({
      novelId: novel._id, episodeId: episode1._id, sceneOrder: 3, title: 'ช่างภาพลึกลับ',
      background: { type: 'image', value: '/images/background/old_street_evening.png' },
      characters: [
        { instanceId: 'arisa_meeting', characterId: characters.arisa._id, expressionId: 'arisa_surprised', transform: { positionX: -0.3, positionY: 0, scaleX: 1, scaleY: 1, opacity: 1 }, isVisible: true },
        { instanceId: 'thana_intro', characterId: characters.thana._id, expressionId: 'thana_normal', transform: { positionX: 0.3, positionY: 0, scaleX: 1, scaleY: 1, opacity: 1 }, isVisible: true }
      ],
      textContents: [
        { instanceId: 'meet_001', type: 'narration', content: 'ขณะที่อริษากำลังถ่ายรูปบ้านเก่าแก่ มีเสียงของชัตเตอร์กล้องดังขึ้นจากข้างหลัง เมื่อเธอหันไปมอง ก็พบกับชายหนุ่มที่ถือกล้องฟิล์มเก่า', fontFamily: 'Sarabun', fontSize: 18, color: '#333333' },
        { instanceId: 'meet_002', type: 'dialogue', characterId: characters.thana._id, speakerDisplayName: 'ธนา', content: 'ขอโทษครับ ผมไม่ได้ตั้งใจจะแอบถ่าย แต่เห็นคุณถ่ายรูปบ้านหลังนั้น... คุณเห็นอะไรพิเศษมั้ย?', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' },
        { instanceId: 'meet_006', type: 'dialogue', characterId: characters.thana._id, speakerDisplayName: 'ธนา', content: 'เพราะคุณเห็นใช่ไหม... เงาที่อยู่หน้าต่างชั้นสองของบ้านหลังนั้น', fontFamily: 'Sarabun', fontSize: 18, color: '#4A4A4A' }
      ],
      choicePrompt: 'ธนาพูดถึงเงาที่หน้าต่าง... อริษาจะตอบอย่างไร?'
    });
     // เชื่อม Scene ก่อนหน้าให้มาที่นี่
    scene1_2a.defaultNextSceneId = scene1_3._id;
    await scene1_2a.save();
    scene1_2b.defaultNextSceneId = scene1_3._id;
    await scene1_2b.save();

    console.log('    ...Created more scenes for Episode 1');


    // Episode 2
    console.log('📖 Creating Episode 2...');
    const episode2 = await EpisodeModel.create({
      novelId: novel._id, authorId: author._id, title: 'ความลับของยายนิ่ม', episodeOrder: 2, status: 'published', accessType: 'ad_supported_free',
      teaserText: 'ยายนิ่มเล่าเรื่องราวลึกลับเกี่ยวกับวิญญาณเมืองกรุง และอริษาเริ่มเข้าใจว่าเธอมาถูกที่แล้ว',
      stats: { viewsCount: 95, uniqueViewersCount: 60, likesCount: 30, commentsCount: 8, totalWords: 920, estimatedReadingTimeMinutes: 4 },
      publishedAt: new Date(), lastContentUpdatedAt: new Date()
    });

    episodes.push(episode1, episode2);

    // อัปเดต firstSceneId ของ episode1
    episode1.firstSceneId = scene1_1._id;
    await episode1.save();

    console.log(`✅ Created ${episodes.length} episodes`);

    // ==================================================================================================
    // SECTION 5: อัปเดตข้อมูลสรุปของนิยาย
    // ==================================================================================================
    // คำนวณค่าสถิติใหม่จากตอนที่สร้างขึ้น
    const totalWords = episodes.reduce((sum, ep) => sum + (ep.stats?.totalWords || 0), 0);
    const totalEstimatedReadingTime = episodes.reduce((sum, ep) => sum + (ep.stats?.estimatedReadingTimeMinutes || 0), 0);

    // อัปเดตข้อมูลใน Novel หลัก
    await NovelModel.findByIdAndUpdate(novel._id, {
      firstEpisodeId: episode1._id,
      // เพิ่มจำนวนตอนที่สร้างเข้าไปในจำนวนที่มีอยู่แล้ว
      $inc: {
          totalEpisodesCount: episodes.length,
          publishedEpisodesCount: episodes.filter(ep => ep.status === 'published').length,
          'stats.totalWords': totalWords,
          'stats.estimatedReadingTimeMinutes': totalEstimatedReadingTime
      },
      lastContentUpdatedAt: new Date()
    });

    console.log('✅ Updated novel stats.');

    console.log(`🎉 Successfully seeded content for "${NOVEL_TITLE}"!`);
    console.log('📊 Summary:');
    console.log(`- Novel: ${novel.title}`);
    console.log(`- Author: ${author.username}`);
    console.log(`- Characters Created: ${insertedCharacters.length}`);
    console.log(`- Episodes Created: ${episodes.length}`);
    console.log(`\n🔗 Access URLs:`);
    console.log(`- Novel Page: /novels/${novel.slug}`);
    console.log(`- Read Episode 1: /read/${novel.slug}/${episode1._id}`);

  } catch (error) {
    console.error('❌ Error seeding novel content:', error);
    throw error;
  }
}

// Execute seeding
if (require.main === module) {
  seedSpiritOfBangkokContent()
    .then(() => {
      console.log('✅ Seeding completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

export default seedSpiritOfBangkokContent;