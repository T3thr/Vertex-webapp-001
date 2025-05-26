// src/components/novels/NovelCharactersSection.tsx
import Image from 'next/image';
import { PopulatedCharacterForDetailPage } from '@/app/api/novels/[slug]/route';
import { UserCircle2, Palette, Gamepad2, Smile, Drama, Users2 } from 'lucide-react'; // Using Drama for role
import { motion } from 'framer-motion';
import { CharacterRoleInStory } from '@/backend/models/Character'; //

interface NovelCharactersSectionProps {
  characters: PopulatedCharacterForDetailPage[];
}

export const NovelCharactersSection: React.FC<NovelCharactersSectionProps> = ({ characters }) => {
  if (!characters || characters.length === 0) {
    return (
      <div className="text-center py-10">
        <Users2 size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">ยังไม่มีข้อมูลตัวละครสำหรับนิยายเรื่องนี้</p>
      </div>
    );
  }

  const getRoleDisplayName = (role?: CharacterRoleInStory, customRole?: string) //
  : string => {
    if (role === CharacterRoleInStory.CUSTOM && customRole) return customRole; //
    if (role) {
        // Thai translation for roles
        switch(role) {
            case CharacterRoleInStory.MAIN_PROTAGONIST: return "ตัวเอกหลัก"; //
            case CharacterRoleInStory.SECONDARY_PROTAGONIST: return "ตัวเอกรอง"; //
            case CharacterRoleInStory.ANTAGONIST: return "ตัวร้าย"; //
            case CharacterRoleInStory.SUPPORTING_CHARACTER: return "ตัวละครสมทบ"; //
            case CharacterRoleInStory.LOVE_INTEREST: return "คนรัก"; //
            case CharacterRoleInStory.MENTOR: return "ผู้ชี้แนะ"; //
            case CharacterRoleInStory.COMIC_RELIEF: return "ตัวละครตลก"; //
            case CharacterRoleInStory.NARRATOR: return "ผู้บรรยาย"; //
            case CharacterRoleInStory.CAMEO: return "นักแสดงรับเชิญ"; //
            case CharacterRoleInStory.MINOR_CHARACTER: return "ตัวละครรอง"; //
            default: return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }
    return customRole || 'ไม่ระบุบทบาท';
  }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {characters.map((character, index) => (
        <motion.div
          key={character._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.07, duration: 0.3 }}
          className="bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all duration-300 hover:shadow-lg group"
        >
          <div className="aspect-[3/4] relative bg-secondary overflow-hidden">
            {character.profileImageUrl && character.profileImageUrl !== '/images/default-avatar.png' ? (
              <Image
                src={character.profileImageUrl}
                alt={`รูปโปรไฟล์ของ ${character.name}`}
                layout="fill"
                objectFit="cover"
                className="group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                <UserCircle2 size={64} className="text-muted-foreground" />
              </div>
            )}
             {character.colorTheme && (
                <div className="absolute top-2 right-2 p-1.5 rounded-full shadow-sm" style={{ backgroundColor: character.colorTheme }}>
                    <Palette size={12} style={{ color: character.colorTheme && parseInt(character.colorTheme.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff' }} />
                </div>
            )}
          </div>
          <div className="p-4">
            <h5 className="text-lg font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
              {character.name}
            </h5>
            {character.characterCode && (
              <p className="text-xs text-muted-foreground mb-1">CODE: {character.characterCode}</p>
            )}
            <p className="text-sm text-muted-foreground mb-2 flex items-center">
              <Drama size={14} className="mr-1.5 text-accent" />
              {getRoleDisplayName(character.roleInStory, character.customRoleDetails)}
            </p>
            {character.description && (
              <p className="text-xs text-foreground/70 line-clamp-2 mb-1">
                {character.description}
              </p>
            )}
            {character.personalityTraits?.strengths && character.personalityTraits.strengths.length > 0 && (
                 <div className="mt-2">
                    <span className="text-xs font-medium text-accent flex items-center"><Smile size={12} className="mr-1" /> จุดเด่น: </span>
                    <p className="text-xs text-muted-foreground line-clamp-1">{character.personalityTraits.strengths.join(', ')}</p>
                 </div>
            )}
            {/* Placeholder for a link to character detail page if you have one */}
            {/* <Link href={`/novels/${novelSlug}/characters/${character.characterCode || character._id}`}>
                <a className="text-xs text-primary hover:underline mt-2 inline-block">ดูเพิ่มเติม</a>
            </Link> */}
          </div>
        </motion.div>
      ))}
    </div>
  );
};