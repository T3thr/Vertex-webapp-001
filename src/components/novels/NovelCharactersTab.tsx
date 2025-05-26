// src/components/novels/NovelCharactersTab.tsx
// (เพิ่มใหม่) Component แสดงรายการตัวละครทั้งหมดสำหรับนิยาย
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { UsersRound, ArrowRight } from "lucide-react";
// ✅ แก้ไข: อ้างอิง PopulatedCharacterSummary จาก API Route
import { PopulatedCharacterSummary } from "@/app/api/novels/[slug]/route"; // เปลี่ยนชื่อ type ที่ import

interface NovelCharactersTabProps {
  characters: PopulatedCharacterSummary[]; // ✅ ใช้ PopulatedCharacterSummary
  novelId: string; // ID ของนิยายปัจจุบัน (สำหรับสร้าง Link ไปยังหน้าตัวละครเต็มๆ)
}

export function NovelCharactersTab({ characters, novelId }: NovelCharactersTabProps) {
  if (!characters || characters.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <UsersRound size={48} className="mx-auto mb-4 opacity-50" />
        <p>ยังไม่มีข้อมูลตัวละครสำหรับนิยายเรื่องนี้</p>
      </div>
    );
  }

  const listVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className="pb-10 space-y-6">
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {characters.map((character) => (
          <motion.div
            key={character._id} // _id เป็น string แล้วจาก PopulatedCharacterSummary
            variants={itemVariants}
            className="bg-card border border-border rounded-xl shadow-lg overflow-hidden hover:shadow-primary/20 transition-all duration-300 ease-out group"
          >
            {/* ✅ แก้ไข: ปรับ Link href ไปยังหน้าตัวละคร ถ้ามี */}
            {/* สมมติว่า URL ของหน้ารายละเอียดตัวละครเป็น /novels/[novelSlug]/characters/[characterId] */}
            {/* ถ้าโครงสร้าง URL ต่างไป ให้ปรับตามนั้น */}
            <Link href={`/novels/${novelId}/characters/${character.characterCode || character._id}`} className="block">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                {character.profileImageUrl ? (
                  <Image
                    src={character.profileImageUrl}
                    alt={character.name || "รูปตัวละคร"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }}
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                    <UsersRound size={48} className="opacity-50" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">{character.name}</h3>
                {character.roleInStory && (
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {character.roleInStory.replace(/_/g, ' ')}{character.customRoleDetails ? ` (${character.customRoleDetails})` : ''}
                  </p>
                )}
                {character.synopsis && (
                  <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{character.synopsis}</p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}