// run-seed.js
// ไฟล์สำหรับรัน seed script ของนิยาย "วิญญาณเมืองกรุง"

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting seed process for "วิญญาณเมืองกรุง"...');
console.log('📁 Working directory:', process.cwd());

try {
  // เปลี่ยนไปยัง src/scripts directory
  const scriptsPath = path.join(__dirname, 'src', 'scripts');
  console.log(`📂 Changing to scripts directory: ${scriptsPath}`);
  
  // รัน seed script
  console.log('🌱 Running seed script...');
  const result = execSync('npx tsx seed-novel-read.ts', { 
    cwd: scriptsPath,
    stdio: 'inherit',
    encoding: 'utf8' 
  });
  
  console.log('✅ Seed completed successfully!');
  console.log('\n🎉 นิยาย "วิญญาณเมืองกรุง" ได้ถูกสร้างเรียบร้อยแล้ว!');
  console.log('\n📖 คุณสามารถเข้าไปอ่านได้ที่:');
  console.log('• หน้านิยาย: /novels/spirit-of-bangkok');
  console.log('• อ่านตอนแรก: /novels/spirit-of-bangkok/read/[episode-id]');
  
} catch (error) {
  console.error('❌ Error running seed script:', error.message);
  console.error('\n🔧 วิธีแก้ไขที่เป็นไปได้:');
  console.error('1. ตรวจสอบว่า MongoDB เชื่อมต่อได้');
  console.error('2. ตรวจสอบ environment variables');
  console.error('3. ตรวจสอบว่าติดตั้ง dependencies ครบถ้วน');
  process.exit(1);
} 