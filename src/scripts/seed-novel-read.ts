// src/scripts/seed-novel-read.ts
// Seed script สำหรับนิยาย "วิญญาณเมืองกรุง" - Visual Novel แนวสยองขวัญแฟนตาซี

import dbConnect from '@/backend/lib/mongodb';
import UserModel from '@/backend/models/User';
import NovelModel from '@/backend/models/Novel';
import CategoryModel from '@/backend/models/Category';
import CharacterModel from '@/backend/models/Character';
import EpisodeModel from '@/backend/models/Episode';
import SceneModel from '@/backend/models/Scene';
import ChoiceModel from '@/backend/models/Choice';
import { Types } from 'mongoose';

async function seedSpiritOfBangkokNovel() {
  try {
    await dbConnect();
    console.log('🌟 Starting seed for "วิญญาณเมืองกรุง" Visual Novel...');

    // 1. สร้างผู้เขียน
    const author = await UserModel.create({
      username: 'darkmyst_writer',
      email: 'darkmyst.writer@divwy.com',
      password: 'hashedpassword123',
      profile: {
        displayName: 'ดาร์ค มิสต์',
        penNames: ['ดาร์ค มิสต์', 'Dark Mystique'],
        bio: 'นักเขียนผู้เชี่ยวชาญเรื่องลึกลับและสยองขวัญ มีประสบการณ์การเขียนมากว่า 10 ปี',
        avatarUrl: '/images/character/author_darkmyst.png',
        socialMediaLinks: {
          facebook: 'https://facebook.com/darkmyst.writer',
          twitter: 'https://twitter.com/darkmyst_writer'
        }
      },
      writerStats: {
        totalNovelsPublished: 5,
        totalFollowers: 15420,
        totalWordsPublished: 500000,
        averageRating: 4.7
      },
      isVerified: true,
      accountType: 'writer'
    });

    // 2. สร้างหมวดหมู่
    const categories = {
      horror: await CategoryModel.create({
        name: 'สยองขวัญ',
        slug: 'horror',
        description: 'เรื่องราวที่น่าสะพรึงกลัวและลึกลับ',
        color: '#8B0000',
        type: 'GENRE'
      }),
      supernatural: await CategoryModel.create({
        name: 'เหนือธรรมชาติ',
        slug: 'supernatural',
        description: 'เรื่องราวเกี่ยวกับสิ่งเหนือธรรมชาติ',
        color: '#4B0082',
        type: 'GENRE'
      }),
      bangkok: await CategoryModel.create({
        name: 'กรุงเทพฯ',
        slug: 'bangkok',
        description: 'เรื่องราวที่เกิดขึ้นในกรุงเทพมหานคร',
        color: '#FF6B35',
        type: 'SETTING'
      }),
      thai: await CategoryModel.create({
        name: 'ไทย',
        slug: 'thai',
        description: 'ภาษาไทย',
        color: '#0066CC',
        type: 'LANGUAGE'
      })
    };

    // 3. สร้างนิยาย
    const novel = await NovelModel.create({
      title: 'วิญญาณเมืองกรุง',
      slug: 'spirit-of-bangkok',
      author: author._id,
      synopsis: 'ในย่านเก่าแก่ของกรุงเทพฯ ที่ความทันสมัยยังไม่เข้าไปแตะต้อง มีเรื่องราวลึกลับซ่อนอยู่ใต้ผิวหน้าของชีวิตประจำวัน เมื่อ "อริษา" นักศึกษาภาควิชาโบราณคดี ได้รับมอบหมายให้มาทำวิจัยเกี่ยวกับประวัติศาสตร์ย่านนี้ เธอก็ไม่เคยคิดว่าจะได้พบกับสิ่งที่เปลี่ยนแปลงชีวิตของเธอไปตลอดกาล...',
      longDescription: `ในหัวใจของกรุงเทพมหานคร ซ่อนอยู่ในซอกซอยที่เวลาราวกับหยุดนิ่ง มีย่านเก่าแก่ที่เต็มไปด้วยบ้านไม้โบราณ วัดเก่า และตลาดที่ยังคงกลิ่นอายของอดีต

อริษา นักศึกษาโบราณคดีจากจุฬาลงกรณ์มหาวิทยาลัย ได้รับมอบหมายงานวิจัยพิเศษเกี่ยวกับการอนุรักษ์มรดกทางวัฒนธรรมในย่านนี้ สิ่งที่เธอคิดว่าจะเป็นเพียงงานรวบรวมข้อมูลประวัติศาสตร์ธรรมดา กลับกลายเป็นการเดินทางสู่โลกที่ซ่อนอยู่ระหว่างความเป็นจริงกับความลึกลับ

เมื่อเธอเริ่มสัมภาษณ์ผู้คนในย่าน อริษาก็ค่อยๆ ค้นพบว่าทุกคนล้วนมีเรื่องราวแปลกๆ ที่เกี่ยวข้องกับ "วิญญาณเมืองกรุง" - สิ่งที่ผู้คนเล่าขานกันว่าเป็นผู้คุมครองย่านนี้มาช้านาน

แต่เมื่อเหตุการณ์แปลกประหลาดเริ่มเกิดขึ้นรอบตัวเธอ และเธอเริ่มเห็นสิ่งที่คนอื่นมองไม่เห็น อริษาจึงรู้ว่าเธอไม่ได้เป็นเพียงผู้สังเกตการณ์อีกต่อไป แต่เธอกำลังกลายเป็นส่วนหนึ่งของเรื่องราวลึกลับนี้

ร่วมเดินทางไปกับอริษาในการค้นหาความจริงเบื้องหลังตำนานเก่าแก่ พบปะกับตัวละครที่น่าสนใจ และเผชิญหน้ากับทางเลือกที่จะเปลี่ยนแปลงโชคชะตาของทุกคนในย่านนี้

การเลือกของคุณจะกำหนดว่า อริษาจะสามารถปกป้องสิ่งที่เธอรักได้หรือไม่ และความลับของวิญญาณเมืองกรุงจะถูกเปิดเผยอย่างไร`,
      coverImageUrl: '/images/novels/spirit-bangkok-cover.png',
      bannerImageUrl: '/images/novels/spirit-bangkok-banner.png',
      themeAssignment: {
        mainTheme: {
          categoryId: categories.horror._id,
          customName: 'สยองขวัญไทย'
        },
        subThemes: [
          {
            categoryId: categories.supernatural._id,
            customName: 'เหนือธรรมชาติ'
          },
          {
            categoryId: categories.bangkok._id,
            customName: 'กรุงเทพ'
          }
        ],
        customTags: ['วิญญาณ', 'กรุงเทพ', 'ลึกลับ', 'โบราณคดี', 'วัฒนธรรมไทย', 'สยองขวัญ', 'แฟนตาซี', 'รัก', 'ผจญภัย']
      },
      status: 'published',
      accessLevel: 'public',
      isCompleted: false,
      endingType: 'multiple_endings',
      sourceType: {
        type: 'original'
      },
      language: categories.thai._id,
      totalEpisodesCount: 5,
      publishedEpisodesCount: 3,
      stats: {
        viewsCount: 45230,
        uniqueViewersCount: 12800,
        likesCount: 3420,
        commentsCount: 890,
        ratingsCount: 450,
        averageRating: 4.8,
        followersCount: 2100,
        totalWords: 85000,
        estimatedReadingTimeMinutes: 340
      },
      publishedAt: new Date('2024-01-15'),
      lastContentUpdatedAt: new Date()
    });

    console.log(`✅ Created novel: ${novel.title}`);

    // 4. สร้างตัวละคร
    const characters = {
      arisa: await CharacterModel.create({
        novelId: novel._id,
        authorId: author._id,
        characterCode: 'ARISA_001',
        name: 'อริษา',
        fullName: 'อริษา สุริยงค์',
        age: '22',
        gender: 'female',
        description: 'นักศึกษาโบราณคดีปีสุดท้าย มีความอยากรู้อยากเห็นสูง และไม่กลัวที่จะเผชิญหน้ากับสิ่งลึกลับ',
        roleInStory: 'main_protagonist',
        colorTheme: '#E8B4B8',
        expressions: [
          {
            expressionId: 'arisa_normal',
            name: 'ปกติ',
            mediaId: 'arisa_normal.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'arisa_surprised',
            name: 'ตกใจ',
            mediaId: 'arisa_surprised.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'arisa_determined',
            name: 'มุ่งมั่น',
            mediaId: 'arisa_determined.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'arisa_scared',
            name: 'กลัว',
            mediaId: 'arisa_scared.png',
            mediaSourceType: 'Media'
          }
        ],
        defaultExpressionId: 'arisa_normal',
        physicalAttributes: {
          heightCm: 165,
          eyeColor: 'น้ำตาลเข้ม',
          hairColor: 'ดำยาว',
          distinguishingFeatures: ['แหวนโบราณที่สวมนิ้วกลาง', 'กระเป๋าเก่าที่ใช้ใส่เครื่องมือขุดค้น']
        },
        personalityTraits: {
          goals: ['ค้นหาความจริงเกี่ยวกับวิญญาณเมืองกรุง', 'ปกป้องมรดกทางวัฒนธรรม', 'จบการศึกษาด้วยเกียรตินิยม'],
          fears: ['การสูญเสียคนที่รัก', 'ความมืด', 'สิ่งเหนือธรรมชาติ'],
          strengths: ['ความกล้าหาญ', 'ปัญญาดี', 'มีสัญชาตญาณดี'],
          weaknesses: ['ดื้อ', 'ใจร้อน', 'เชื่อคนง่าย'],
          likes: ['หนังสือประวัติศาสตร์', 'กาแฟ', 'ดนตรีคลาสสิก'],
          dislikes: ['ความไม่ยุติธรรม', 'การโกหก', 'อาหารเผ็ด'],
          quotes: ['ความจริงมักซ่อนอยู่ในสิ่งที่เราไม่กล้ามอง', 'อดีตคือครู ปัจจุบันคือนักเรียน']
        }
      }),

      thana: await CharacterModel.create({
        novelId: novel._id,
        authorId: author._id,
        characterCode: 'THANA_001',
        name: 'ธนา',
        fullName: 'ธนา วรรณศิลป์',
        age: '28',
        gender: 'male',
        description: 'ช่างภาพท้องถิ่นที่มีความสามารถพิเศษในการมองเห็นวิญญาณ เป็นคนที่ช่วยเหลืออริษาในการค้นหาความจริง',
        roleInStory: 'love_interest',
        colorTheme: '#4A90A4',
        expressions: [
          {
            expressionId: 'thana_normal',
            name: 'ปกติ',
            mediaId: 'thana_normal.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'thana_serious',
            name: 'จริงจัง',
            mediaId: 'thana_serious.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'thana_smile',
            name: 'ยิ้ม',
            mediaId: 'thana_smile.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'thana_worried',
            name: 'กังวล',
            mediaId: 'thana_worried.png',
            mediaSourceType: 'Media'
          }
        ],
        defaultExpressionId: 'thana_normal',
        personalityTraits: {
          goals: ['ปกป้องย่านเก่าจากการพัฒนา', 'ช่วยเหลือวิญญาณที่ติดค้างอยู่', 'ดูแลอริษา'],
          strengths: ['ใจเย็น', 'มีประสบการณ์', 'อ่านใจคนเก่ง'],
          weaknesses: ['ไม่ค่อยเปิดใจ', 'ขี้กังวล', 'กลัวการสูญเสีย']
        }
      }),

      granny_nim: await CharacterModel.create({
        novelId: novel._id,
        authorId: author._id,
        characterCode: 'GRANNY_001',
        name: 'ยายนิ่ม',
        fullName: 'นิ่มนวล จันทร์แก้ว',
        age: '78',
        gender: 'female',
        description: 'ยายแก่ผู้เป็นเหมือนหัวหน้าชุมชนนอกทางการ มีความรู้เรื่องเก่าแก่และตำนานของย่านนี้มากมาย',
        roleInStory: 'mentor',
        colorTheme: '#8B4513',
        expressions: [
          {
            expressionId: 'granny_normal',
            name: 'ปกติ',
            mediaId: 'granny_normal.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'granny_wise',
            name: 'ชาญฉลาด',
            mediaId: 'granny_wise.png',
            mediaSourceType: 'Media'
          }
        ],
        defaultExpressionId: 'granny_normal'
      }),

      spirit: await CharacterModel.create({
        novelId: novel._id,
        authorId: author._id,
        characterCode: 'SPIRIT_001',
        name: 'วิญญาณเมืองกรุง',
        fullName: 'พระยาศรีเมืองกรุง',
        age: 'เก่าแก่',
        gender: 'not_specified',
        description: 'วิญญาณผู้คุมครองย่านเก่าของกรุงเทพฯ มีอำนาจลึกลับและปรากฏตัวเป็นครั้งคราว',
        roleInStory: 'antagonist',
        colorTheme: '#663399',
        expressions: [
          {
            expressionId: 'spirit_normal',
            name: 'ปกติ',
            mediaId: 'spirit_normal.png',
            mediaSourceType: 'Media'
          },
          {
            expressionId: 'spirit_angry',
            name: 'โกรธ',
            mediaId: 'spirit_angry.png',
            mediaSourceType: 'Media'
          }
        ],
        defaultExpressionId: 'spirit_normal'
      })
    };

    console.log('✅ Created characters');

    // 5. สร้าง Episodes
    const episodes = [];
    
    // Episode 1: การเริ่มต้น
    const episode1 = await EpisodeModel.create({
      novelId: novel._id,
      authorId: author._id,
      title: 'การมาถึงย่านเก่า',
      episodeOrder: 1,
      status: 'published',
      accessType: 'free',
      teaserText: 'อริษาเดินทางมาถึงย่านเก่าของกรุงเทพฯ เพื่อเริ่มต้นงานวิจัย แต่เธอไม่รู้ว่าสิ่งที่รออยู่จะเปลี่ยนชีวิตเธอไปตลอดกาล',
      stats: {
        viewsCount: 15420,
        uniqueViewersCount: 8900,
        likesCount: 1250,
        commentsCount: 340,
        totalWords: 8500,
        estimatedReadingTimeMinutes: 25
      },
      publishedAt: new Date('2024-01-15'),
      lastContentUpdatedAt: new Date()
    });

    // Scene 1.1: อริษาถึงย่านเก่า
    const scene1_1 = await SceneModel.create({
      novelId: novel._id,
      episodeId: episode1._id,
      sceneOrder: 1,
      title: 'ย่านเก่าในวันแรก',
      background: {
        type: 'image',
        value: '/images/background/old_bangkok_street.png'
      },
      characters: [
        {
          instanceId: 'arisa_main',
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
          instanceId: 'text_001',
          type: 'narration',
          content: 'รถแท็กซี่สีเหลือง-เขียวคันเก่าแก่แล่นผ่านถนนลาดยางที่แคบ ข้างทางเต็มไปด้วยบ้านไม้โบราณที่ดูเหมือนจะเล่าเรื่องราวอันยาวนานได้',
          fontFamily: 'Sarabun',
          fontSize: 18,
          color: '#333333'
        },
        {
          instanceId: 'text_002',
          type: 'narration',
          content: 'อริษามองออกไปนอกหน้าต่างด้วยความทึ่ง... นี่คือกรุงเทพฯ ที่เธอไม่เคยเห็นมาก่อน',
          fontFamily: 'Sarabun',
          fontSize: 18,
          color: '#333333'
        },
        {
          instanceId: 'text_003',
          type: 'dialogue',
          characterId: characters.arisa._id,
          speakerDisplayName: 'อริษา',
          content: 'ลุงค่ะ ที่นี่คือย่านที่ยังไม่ถูกพัฒนาแบบที่ว่าใช่ไหม?',
          fontFamily: 'Sarabun',
          fontSize: 18,
          color: '#4A4A4A'
        },
        {
          instanceId: 'text_004',
          type: 'dialogue',
          speakerDisplayName: 'คนขับแท็กซี่',
          content: 'ใช่แล้วลูก... ที่นี่เก่าแก่มาตั้งแต่สมัยรัชกาลที่ 5 แล้ว คนแถวนี้เขาไม่ค่อยอยากให้เปลี่ยนแปลงอะไร เพราะกลัวจะทำลายสิ่งที่เขาคุ้นเคย',
          fontFamily: 'Sarabun',
          fontSize: 18,
          color: '#4A4A4A'
        },
        {
          instanceId: 'text_005',
          type: 'dialogue',
          characterId: characters.arisa._id,
          speakerDisplayName: 'อริษา',
          content: '(ใจคิด) นั่นแหละที่ทำให้ที่นี่น่าสนใจ... ฉันสงสัยว่าจะมีเรื่องราวอะไรซ่อนอยู่บ้าง',
          fontFamily: 'Sarabun',
          fontSize: 16,
          color: '#666666'
        }
      ],
      audios: [
        {
          instanceId: 'bgm_001',
          type: 'background_music',
          mediaId: 'old_bangkok_theme.mp3',
          mediaSourceType: 'Media',
          volume: 0.3,
          loop: true
        }
      ],
      defaultNextSceneId: null // จะใส่ scene ถัดไปภายหลัง
    });

    console.log('✅ Created first scene');

    // สร้าง Choice สำหรับ scene แรก
    const choice1_1 = await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene1_1._id.toString(),
      choiceCode: 'EP1_S1_CHOICE1',
      text: 'ลงจากแท็กซี่และเริ่มสำรวจย่านทันที',
      hoverText: 'อริษาตัดสินใจสำรวจบริเวณทันทีที่มาถึง',
      actions: [
        {
          actionId: 'action_001',
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene_1_2_explore'
          }
        }
      ],
      displayOrder: 1
    });

    const choice1_2 = await ChoiceModel.create({
      novelId: novel._id,
      authorId: author._id,
      originStoryMapNodeId: scene1_1._id.toString(),
      choiceCode: 'EP1_S1_CHOICE2',
      text: 'ไปที่บ้านพักก่อนแล้วค่อยวางแผน',
      hoverText: 'เตรียมตัวให้พร้อมก่อนเริ่มงานวิจัย',
      actions: [
        {
          actionId: 'action_002',
          type: 'GO_TO_NODE',
          parameters: {
            targetNodeId: 'scene_1_2_rest'
          }
        }
      ],
      displayOrder: 2
    });

    console.log('✅ Created choices for first scene');

    // Episode 2
    const episode2 = await EpisodeModel.create({
      novelId: novel._id,
      authorId: author._id,
      title: 'การพบกับธนา',
      episodeOrder: 2,
      status: 'published',
      accessType: 'free',
      teaserText: 'อริษาได้พบกับธนา ช่างภาพลึกลับที่ดูเหมือนจะรู้เรื่องเก่าแก่ของย่านนี้มากกว่าที่คิด',
      stats: {
        viewsCount: 12350,
        uniqueViewersCount: 7200,
        likesCount: 980,
        commentsCount: 280,
        totalWords: 9200,
        estimatedReadingTimeMinutes: 28
      },
      publishedAt: new Date('2024-01-22'),
      lastContentUpdatedAt: new Date()
    });

    // Episode 3
    const episode3 = await EpisodeModel.create({
      novelId: novel._id,
      authorId: author._id,
      title: 'ความลับของยายนิ่ม',
      episodeOrder: 3,
      status: 'published',
      accessType: 'ad_supported_free',
      teaserText: 'ยายนิ่มเล่าเรื่องราวลึกลับเกี่ยวกับวิญญาณเมืองกรุง และอริษาเริ่มเข้าใจว่าเธอมาถูกที่แล้ว',
      stats: {
        viewsCount: 10800,
        uniqueViewersCount: 6100,
        likesCount: 850,
        commentsCount: 220,
        totalWords: 8800,
        estimatedReadingTimeMinutes: 26
      },
      publishedAt: new Date('2024-01-29'),
      lastContentUpdatedAt: new Date()
    });

    episodes.push(episode1, episode2, episode3);

    // อัปเดต firstSceneId ของ episode1
    episode1.firstSceneId = scene1_1._id;
    await episode1.save();

    console.log(`✅ Created ${episodes.length} episodes`);

    // อัปเดตสถิตินิยาย
    await NovelModel.findByIdAndUpdate(novel._id, {
      firstEpisodeId: episode1._id,
      'stats.totalWords': episodes.reduce((sum, ep) => sum + (ep.stats?.totalWords || 0), 0),
      'stats.estimatedReadingTimeMinutes': episodes.reduce((sum, ep) => sum + (ep.stats?.estimatedReadingTimeMinutes || 0), 0)
    });

    console.log('🎉 Successfully seeded "วิญญาณเมืองกรุง" Visual Novel!');
    console.log('📊 Summary:');
    console.log(`- Novel: ${novel.title}`);
    console.log(`- Author: ${author.profile.displayName}`);
    console.log(`- Characters: ${Object.keys(characters).length}`);
    console.log(`- Episodes: ${episodes.length}`);
    console.log(`- Scenes: 1 (with more to be added)`);
    console.log(`- Choices: 2`);
    console.log(`\n🔗 Access URLs:`);
    console.log(`- Novel Page: /novels/${novel.slug}`);
    console.log(`- Read Episode 1: /novels/${novel.slug}/read/${episode1._id}`);

    return {
      novel,
      author,
      characters,
      episodes,
      scenes: [scene1_1],
      choices: [choice1_1, choice1_2]
    };

  } catch (error) {
    console.error('❌ Error seeding novel:', error);
    throw error;
  }
}

// Execute seeding
if (require.main === module) {
  seedSpiritOfBangkokNovel()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedSpiritOfBangkokNovel; 