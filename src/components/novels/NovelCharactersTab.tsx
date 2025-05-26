// src/components/novels/NovelCharactersTab.tsx
// Component สำหรับแสดง Tab ตัวละครในนิยาย

import React from 'react';
import Image from 'next/image';
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { UserCircle, Zap, ShieldQuestion, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface NovelCharactersTabProps {
  novel: PopulatedNovelForDetailPage;
}

const characterCardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: "easeOut"
    }
  })
};

const getRoleDisplayName = (roleKey?: string): string => {
  if (!roleKey) return 'ไม่ระบุบทบาท';
  const rolesMap: Record<string, string> = {
    main_protagonist: "ตัวเอกหลัก",
    secondary_protagonist: "ตัวเอกรอง",
    antagonist: "ตัวร้าย",
    supporting_character: "ตัวละครสมทบ",
    love_interest: "คนรัก",
    mentor: "ที่ปรึกษา",
    comic_relief: "ตัวตลก",
    narrator: "ผู้บรรยาย",
    cameo: "รับเชิญ",
    minor_character: "ตัวละครรอง",
    custom: "บทบาทกำหนดเอง"
  };
  return rolesMap[roleKey] || roleKey;
};


const NovelCharactersTab: React.FC<NovelCharactersTabProps> = ({ novel }) => {
  const characters = novel.characters || [];

  if (characters.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Users size={48} className="mx-auto mb-4" />
        <p className="text-lg">ยังไม่มีข้อมูลตัวละครสำหรับนิยายเรื่องนี้</p>
        {/* TODO: ถ้าเป็นเจ้าของนิยาย อาจจะแสดงปุ่ม "เพิ่มตัวละคร" */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        ตัวละคร ({characters.length} {characters.length >=6 ? "ตัวละครหลักที่แสดง" : "ตัวละคร"})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character, index) => (
          <motion.div
            key={character._id}
            custom={index}
            variants={characterCardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group"
          >
            <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
              <Image
                src={character.profileImageUrl || '/images/default-avatar.png'}
                alt={`รูปตัวละคร ${character.name}`}
                width={300}
                height={225}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
              {character.colorTheme && (
                <div 
                  className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-card"
                  style={{ backgroundColor: character.colorTheme }}
                  title={`สีประจำตัว: ${character.colorTheme}`}
                />
              )}
            </div>
            <div className="p-4">
              <h4 className="text-lg font-semibold text-primary mb-1 truncate group-hover:underline" title={character.name}>
                {character.name}
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                {getRoleDisplayName(character.roleInStory)}
              </p>
              <p className="text-sm text-foreground/80 line-clamp-3 mb-3 min-h-[60px]">
                {character.description || 'ไม่มีคำอธิบายตัวละครนี้'}
              </p>
              {/* อาจจะมีปุ่ม "ดูรายละเอียดตัวละคร" ถ้ามีหน้าเฉพาะ */}
              {/* <button className="text-xs text-primary hover:underline">ดูเพิ่มเติม</button> */}
            </div>
          </motion.div>
        ))}
      </div>
      {novel.characters && novel.characters.length >= 6 && ( // สมมติว่า API ส่งมาไม่เกิน 6 ตัวถ้ามีมากกว่านั้น
         <div className="mt-6 text-center">
          <button 
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => alert('ดูตัวละครทั้งหมด (ยังไม่ได้ทำ)')}
          >
            ดูตัวละครทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};

export default NovelCharactersTab;