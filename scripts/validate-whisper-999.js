// scripts/validate-whisper-999.js
// Script สำหรับตรวจสอบว่าข้อมูล The Whisper of 999 ถูกลงถูกต้องหรือไม่

const mongoose = require('mongoose');
const dbConnect = require('../src/backend/lib/mongodb-script');

// Import Models
const NovelModel = require('../src/backend/models/Novel').default;
const EpisodeModel = require('../src/backend/models/Episode').default;
const SceneModel = require('../src/backend/models/Scene').default;
const CharacterModel = require('../src/backend/models/Character').default;
const ChoiceModel = require('../src/backend/models/Choice').default;
const UserModel = require('../src/backend/models/User').default;
const CategoryModel = require('../src/backend/models/Category').default;
const StoryMapModel = require('../src/backend/models/StoryMap').default;

require('dotenv').config();

const NOVEL_SLUG = 'whisper-from-apartment-999';
const AUTHOR_USERNAME = process.env.AUTHOR_USERNAME || 'whisper_author';

/**
 * ตรวจสอบการมีอยู่และความถูกต้องของข้อมูล
 */
const validateWhisper999Data = async () => {
  try {
    console.log('🔍 เริ่มต้นการตรวจสอบข้อมูล "เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999"...\n');
    
    await dbConnect();

    let isValid = true;
    const errors = [];
    const warnings = [];

    // === ตรวจสอบผู้แต่ง ===
    console.log('👤 ตรวจสอบผู้แต่ง...');
    const author = await UserModel.findOne({ username: AUTHOR_USERNAME });
    
    if (!author) {
      errors.push(`❌ ไม่พบผู้แต่ง: ${AUTHOR_USERNAME}`);
      isValid = false;
    } else {
      console.log(`✅ พบผู้แต่ง: ${author.username} (${author._id})`);
      
      // ตรวจสอบข้อมูล profile
      if (!author.profile?.displayName) {
        warnings.push(`⚠️  ผู้แต่งไม่มี displayName`);
      }
      if (!author.profile?.penName) {
        warnings.push(`⚠️  ผู้แต่งไม่มี penName`);
      }
      if (author.role !== 'WRITER') {
        warnings.push(`⚠️  Role ของผู้แต่งไม่ใช่ WRITER: ${author.role}`);
      }
    }

    // === ตรวจสอบหมวดหมู่ ===
    console.log('\n📂 ตรวจสอบหมวดหมู่...');
    const requiredCategories = [
      { name: 'ภาษาไทย', type: 'LANGUAGE', slug: 'th' },
      { name: 'สยองขวัญ', type: 'GENRE', slug: 'horror' },
      { name: 'จิตวิทยา', type: 'SUB_GENRE', slug: 'psychological' },
      { name: '18+', type: 'AGE_RATING', slug: '18-plus' }
    ];

    for (const reqCat of requiredCategories) {
      const category = await CategoryModel.findOne({ 
        slug: reqCat.slug, 
        categoryType: reqCat.type 
      });
      
      if (!category) {
        errors.push(`❌ ไม่พบหมวดหมู่: ${reqCat.name} (${reqCat.type})`);
        isValid = false;
      } else {
        console.log(`✅ พบหมวดหมู่: ${category.name} (${category.categoryType})`);
      }
    }

    // === ตรวจสอบนิยาย ===
    console.log('\n📖 ตรวจสอบนิยาย...');
    const novel = await NovelModel.findOne({ slug: NOVEL_SLUG })
      .populate('author')
      .populate('themeAssignment.mainTheme.categoryId')
      .populate('language')
      .populate('ageRatingCategoryId');

    if (!novel) {
      errors.push(`❌ ไม่พบนิยาย: ${NOVEL_SLUG}`);
      isValid = false;
    } else {
      console.log(`✅ พบนิยาย: ${novel.title} (${novel._id})`);
      
      // ตรวจสอบข้อมูลสำคัญ
      const novelChecks = [
        { field: 'title', expected: 'เสียงกระซิบจากอพาร์ตเมนท์หมายเลข999' },
        { field: 'status', expected: 'PUBLISHED' },
        { field: 'accessLevel', expected: 'PUBLIC' },
        { field: 'endingType', expected: 'MULTIPLE_ENDINGS' }
      ];

      for (const check of novelChecks) {
        if (novel[check.field] !== check.expected) {
          warnings.push(`⚠️  Novel.${check.field}: ได้ "${novel[check.field]}" คาดหวัง "${check.expected}"`);
        }
      }

      // ตรวจสอบสถิติ
      if (!novel.stats || novel.stats.viewsCount === 0) {
        warnings.push(`⚠️  Novel stats อาจไม่ถูกต้อง`);
      }

      // ตรวจสอบการเชื่อมโยงกับผู้แต่ง
      if (novel.author._id.toString() !== author._id.toString()) {
        errors.push(`❌ Novel ไม่ได้เชื่อมโยงกับผู้แต่งที่ถูกต้อง`);
        isValid = false;
      }
    }

    // === ตรวจสอบ Episodes ===
    console.log('\n📚 ตรวจสอบ Episodes...');
    const episodes = await EpisodeModel.find({ novelId: novel._id }).sort({ episodeOrder: 1 });
    
    if (episodes.length === 0) {
      errors.push(`❌ ไม่พบ Episodes สำหรับนิยาย`);
      isValid = false;
    } else {
      console.log(`✅ พบ Episodes: ${episodes.length} ตอน`);
      
      const episode1 = episodes[0];
      if (episode1.title !== 'บทที่ 1: ย้ายเข้า') {
        warnings.push(`⚠️  Episode 1 title ไม่ตรงตามที่คาดหวัง: "${episode1.title}"`);
      }
      
      if (episode1.status !== 'PUBLISHED') {
        warnings.push(`⚠️  Episode 1 status ไม่ใช่ PUBLISHED: ${episode1.status}`);
      }
    }

    // === ตรวจสอบตัวละคร ===
    console.log('\n👥 ตรวจสอบตัวละคร...');
    const characters = await CharacterModel.find({ novelId: novel._id });
    
    if (characters.length === 0) {
      errors.push(`❌ ไม่พบตัวละครสำหรับนิยาย`);
      isValid = false;
    } else {
      console.log(`✅ พบตัวละคร: ${characters.length} ตัว`);
      
      const expectedCharacters = ['nira', 'agent'];
      const foundCharacters = characters.map(c => c.characterCode);
      
      for (const expected of expectedCharacters) {
        if (!foundCharacters.includes(expected)) {
          warnings.push(`⚠️  ไม่พบตัวละคร: ${expected}`);
        }
      }
      
      // ตรวจสอบตัวเอก
      const protagonist = characters.find(c => c.roleInStory === 'main_protagonist');
      if (!protagonist) {
        warnings.push(`⚠️  ไม่พบตัวเอก (main_protagonist)`);
      }
    }

    // === ตรวจสอบตัวเลือก ===
    console.log('\n🎯 ตรวจสอบตัวเลือก...');
    const choices = await ChoiceModel.find({ novelId: novel._id });
    
    if (choices.length === 0) {
      errors.push(`❌ ไม่พบตัวเลือกสำหรับนิยาย`);
      isValid = false;
    } else {
      console.log(`✅ พบตัวเลือก: ${choices.length} ตัวเลือก`);
      
      const expectedChoices = [
        'CHOICE_EXPLORE', 'CHOICE_CLEAN', 'CHOICE_CALL',
        'CHOICE_LISTEN_NOW', 'CHOICE_LISTEN_LATER', 'CHOICE_BURN_TAPE'
      ];
      
      const foundChoices = choices.map(c => c.choiceCode);
      
      for (const expected of expectedChoices) {
        if (!foundChoices.includes(expected)) {
          warnings.push(`⚠️  ไม่พบตัวเลือก: ${expected}`);
        }
      }
    }

    // === ตรวจสอบฉาก ===
    console.log('\n🎬 ตรวจสอบฉาก...');
    const scenes = await SceneModel.find({ novelId: novel._id }).sort({ sceneOrder: 1 });
    
    if (scenes.length === 0) {
      errors.push(`❌ ไม่พบฉากสำหรับนิยาย`);
      isValid = false;
    } else {
      console.log(`✅ พบฉาก: ${scenes.length} ฉาง`);
      
      // ตรวจสอบฉากแรก
      const firstScene = scenes[0];
      if (firstScene.title !== 'การมาถึง') {
        warnings.push(`⚠️  ฉากแรกไม่ใช่ "การมาถึง": "${firstScene.title}"`);
      }
      
      // ตรวจสอบการเชื่อมต่อฉาง
      let connectedScenes = 0;
      for (const scene of scenes) {
        if (scene.defaultNextSceneId) {
          connectedScenes++;
        }
      }
      
      if (connectedScenes < scenes.length / 2) {
        warnings.push(`⚠️  ฉากส่วนใหญ่ไม่ได้เชื่อมต่อกัน (${connectedScenes}/${scenes.length})`);
      }
    }

    // === ตรวจสอบ Story Map (ถ้ามี) ===
    console.log('\n📊 ตรวจสอบ Story Map...');
    const storyMap = await StoryMapModel.findOne({ novelId: novel._id });
    
    if (!storyMap) {
      warnings.push(`⚠️  ไม่พบ Story Map (อาจใช้เวอร์ชันพื้นฐาน)`);
    } else {
      console.log(`✅ พบ Story Map: ${storyMap.title} (${storyMap.nodes.length} nodes, ${storyMap.edges.length} edges)`);
      
      if (storyMap.nodes.length < 3) {
        warnings.push(`⚠️  Story Map มี nodes น้อยเกินไป: ${storyMap.nodes.length}`);
      }
      
      if (storyMap.edges.length < 2) {
        warnings.push(`⚠️  Story Map มี edges น้อยเกินไป: ${storyMap.edges.length}`);
      }
    }

    // === สรุปผลการตรวจสอบ ===
    console.log('\n' + '='.repeat(50));
    console.log('📋 สรุปผลการตรวจสอบ');
    console.log('='.repeat(50));

    if (isValid) {
      console.log('🎉 ข้อมูลถูกต้องและพร้อมใช้งาน!');
    } else {
      console.log('💥 พบข้อผิดพลาดที่ต้องแก้ไข!');
    }

    if (errors.length > 0) {
      console.log('\n❌ ข้อผิดพลาด:');
      errors.forEach(error => console.log(`  ${error}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  คำเตือน:');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }

    console.log('\n📊 สถิติ:');
    console.log(`  • ผู้แต่ง: ${author ? '✅' : '❌'}`);
    console.log(`  • นิยาย: ${novel ? '✅' : '❌'}`);
    console.log(`  • Episodes: ${episodes?.length || 0} ตอน`);
    console.log(`  • ตัวละคร: ${characters?.length || 0} ตัว`);
    console.log(`  • ตัวเลือก: ${choices?.length || 0} ตัวเลือก`);
    console.log(`  • ฉาก: ${scenes?.length || 0} ฉาง`);
    console.log(`  • Story Map: ${storyMap ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(50));

    return {
      isValid,
      errors,
      warnings,
      stats: {
        author: !!author,
        novel: !!novel,
        episodesCount: episodes?.length || 0,
        charactersCount: characters?.length || 0,
        choicesCount: choices?.length || 0,
        scenesCount: scenes?.length || 0,
        hasStoryMap: !!storyMap
      }
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:', error);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
    }
  }
};

// เรียกใช้ฟังก์ชันหากไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
  validateWhisper999Data();
}

module.exports = { validateWhisper999Data };
