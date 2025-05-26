// src/components/novels/NovelDetailsTab.tsx
// Component แสดงเนื้อหาสำหรับ Tab รายละเอียด
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route"; // อัปเดต import
import { TagBadge } from "./TagBadge";
import { AlertTriangle, Languages, Calendar, Clock, CheckCircle, Info, Users, ShieldCheck, Edit3, UsersRound, FileText, Milestone, Paintbrush, Palette } from 'lucide-react'; // เพิ่ม UsersRound, FileText, Milestone, Paintbrush
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import Image from "next/image";
import { NovelStatus } from "@/backend/models/Novel"; // Import enum โดยตรง
import Link from "next/link";

interface NovelDetailsTabProps {
  novel: PopulatedNovelForDetailPage;
}

// ฟังก์ชัน format วันที่ (ตรวจสอบว่า Date object หรือ ISO string)
const formatDateFull = (dateInput?: Date | string | null): string => {
  if (!dateInput) return "ไม่มีข้อมูล";
  try {
    const date = new Date(dateInput); // new Date() สามารถรับ Date object หรือ ISO string
    if (isNaN(date.getTime())) return "วันที่ไม่ถูกต้อง"; // ตรวจสอบว่าเป็นวันที่ถูกต้องหรือไม่
    return format(date, "d MMMM yyyy, HH:mm", { locale: th });
  } catch (e) {
    return "วันที่ไม่ถูกต้อง";
  }
};

// Mapping ค่า status ให้สอดคล้องกับ Enum (สำคัญมาก)
const statusMap: { [key in NovelStatus]: string } = {
  [NovelStatus.DRAFT]: "ฉบับร่าง",
  [NovelStatus.PUBLISHED]: "เผยแพร่แล้ว",
  [NovelStatus.COMPLETED]: "เผยแพร่ (จบแล้ว)",
  [NovelStatus.UNPUBLISHED]: "ยกเลิกการเผยแพร่",
  [NovelStatus.ARCHIVED]: "เก็บเข้าคลัง",
  [NovelStatus.PENDING_REVIEW]: "รอการตรวจสอบ",
  [NovelStatus.REJECTED_BY_ADMIN]: "ถูกปฏิเสธโดยผู้ดูแล",
  [NovelStatus.BANNED_BY_ADMIN]: "ถูกระงับโดยผู้ดูแล",
  [NovelStatus.SCHEDULED]: "ตั้งเวลาเผยแพร่",
};


export function NovelDetailsTab({ novel }: NovelDetailsTabProps) {
  // ดึงข้อมูล Category จาก PopulatedNovelForDetailPage (ซึ่งควรจะเป็น PopulatedCategory ที่มี _id เป็น string)
  const langCat = novel.languageCategory;
  const ageCat = novel.ageRatingCategory;
  const artStyleCat = novel.artStyleCategory; // จาก narrativeFocus

  return (
    <div className="space-y-8 pb-10">
      {/* Long Description */}
      {novel.longDescription && (
        <section>
          <h3 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
            <FileText size={20} className="text-primary" /> คำนำเรื่อง / เรื่องราวเพิ่มเติม
          </h3>
          <div
            className="prose prose-sm sm:prose-base max-w-none text-foreground/90 dark:prose-invert dark:text-foreground/80 leading-relaxed whitespace-pre-wrap break-words bg-secondary/30 dark:bg-secondary/20 p-4 rounded-lg"
            dangerouslySetInnerHTML={{ __html: novel.longDescription.replace(/\n/g, '<br />') }} // หรือใช้ CSS `white-space: pre-wrap`
          />
        </section>
      )}

      {/* Categories & Tags */}
      <section>
        <h3 className="text-xl font-semibold mb-3 text-foreground">หมวดหมู่และแท็ก</h3>
        <div className="flex flex-wrap gap-2">
          {novel.mainThemeCategory && (
             <TagBadge key={`mainCat-${novel.mainThemeCategory._id}`} text={novel.mainThemeCategory.name} type="category" slug={novel.mainThemeCategory.slug} />
          )}
          {novel.subThemeCategories?.map((subCat) => (
            <TagBadge key={`subCat-${subCat._id}`} text={subCat.name} type="category" slug={subCat.slug} variant="secondary" />
          ))}
          {novel.moodAndToneCategories?.map((moodCat) => (
            <TagBadge key={`moodCat-${moodCat._id}`} text={moodCat.name} type="category" slug={moodCat.slug} variant="secondary" />
          ))}
          {/* แสดง Content Warnings จาก novel.contentWarningCategories */}
          {novel.contentWarningCategories?.map((warningCat) => (
            <TagBadge key={`warningCat-${warningCat._id}`} text={warningCat.name} type="category" slug={warningCat.slug} variant="secondary" />
          ))}
          {novel.customTags?.map((tag) => (
             <TagBadge key={`tag-${tag}`} text={tag} type="tag" />
          ))}
          {/* แสดงข้อความถ้าไม่มีหมวดหมู่หรือแท็ก */}
          {
            !novel.mainThemeCategory &&
            (!novel.subThemeCategories || novel.subThemeCategories.length === 0) &&
            (!novel.moodAndToneCategories || novel.moodAndToneCategories.length === 0) &&
            (!novel.contentWarningCategories || novel.contentWarningCategories.length === 0) &&
            (!novel.customTags || novel.customTags.length === 0) &&
            (<p className="text-muted-foreground text-sm">ไม่มีหมวดหมู่หรือแท็กที่ระบุ</p>)
          }
        </div>
      </section>

       {/* Characters Section (ปรับปรุง) */}
       {novel.charactersList && novel.charactersList.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <UsersRound size={22} className="text-primary"/> ตัวละครเด่น ({novel.charactersList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* แสดงตัวละครไม่เกิน 6 ตัว หรือตามที่ต้องการ */}
            {novel.charactersList.slice(0, 6).map((character) => (
              <div key={character._id} className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {character.profileImageUrl ? (
                    <Image
                      src={character.profileImageUrl}
                      alt={character.name || "รูปตัวละคร"}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-md object-cover border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/images/default-avatar.png"; }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                      <UsersRound size={32} /> {/* Icon fallback */}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-md font-semibold text-foreground">{character.name}</h4>
                    {character.roleInStory && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {character.roleInStory.replace(/_/g, ' ')}{character.customRoleDetails ? ` (${character.customRoleDetails})` : ''}
                      </p>
                    )}
                    {character.synopsis && (
                         <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{character.synopsis}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* อาจจะมี Link ไปหน้าแสดงตัวละครทั้งหมดถ้ามีข้อมูลมากกว่าที่แสดง */}
          {novel.charactersList.length > 6 && (
            <div className="mt-4 text-center">
              <Link href={`/novels/${novel.slug}/characters`} className="text-sm text-primary hover:underline">
                ดูตัวละครทั้งหมด ({novel.charactersList.length})
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Additional Details */}
      <section>
        <h3 className="text-xl font-semibold mb-4 text-foreground">ข้อมูลเพิ่มเติม</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          {/* ตรวจสอบว่า novel.status เป็น key ที่ถูกต้องของ statusMap ก่อนใช้งาน */}
          <DetailItem icon={Info} label="สถานะ" value={(novel.status && statusMap[novel.status]) || novel.status.toString()} />
          {ageCat && <DetailItem icon={Users} label="ระดับผู้อ่าน" value={ageCat.name} />}
          {langCat && <DetailItem icon={Languages} label="ภาษา" value={langCat.name} />}
          {artStyleCat && <DetailItem icon={Palette} label="สไตล์ภาพ" value={artStyleCat.name} /> } {/* ใช้ Palette icon จาก lucide */}
          {/* NovelModel ไม่มี isExplicitContent โดยตรง, อาจต้องดูจาก ageRating หรือ contentWarnings */}
          {novel.firstPublishedAt && <DetailItem icon={Calendar} label="เผยแพร่ครั้งแรก" value={formatDateFull(novel.firstPublishedAt)} />}
          <DetailItem icon={Clock} label="อัปเดตข้อมูลล่าสุด" value={formatDateFull(novel.updatedAt)} />
          {novel.lastContentUpdatedAt && <DetailItem icon={Clock} label="อัปเดตเนื้อหาล่าสุด" value={formatDateFull(novel.lastContentUpdatedAt)} /> }
          {/* NovelModel ไม่มี sourceType.type โดยตรง, แต่มี sourceType object */}
          {/* <DetailItem icon={novel.sourceType?.type === "ORIGINAL" ? ShieldCheck : Edit3} label="ประเภทผลงาน" value={novel.sourceType?.type || "ไม่ระบุ"} /> */}
          {novel.isCompleted && (
             <DetailItem icon={CheckCircle} label="สถานะการจบ" value="จบสมบูรณ์แล้ว" valueClassName="text-green-600 dark:text-green-400 font-medium" />
          )}
          {novel.endingType && <DetailItem icon={Milestone} label="รูปแบบตอนจบ" value={novel.endingType.replace(/_/g, ' ')} /> }
        </div>
      </section>

      {/* Content Warnings (ย้ายมาแสดงจาก novel.contentWarningCategories ที่ถูก populate) */}
      {novel.contentWarningCategories && novel.contentWarningCategories.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
             <AlertTriangle className="w-5 h-5 text-yellow-500"/> คำเตือนเนื้อหา
          </h3>
          <div className="flex flex-wrap gap-2">
            {novel.contentWarningCategories.map((warningCat) => (
              <TagBadge key={`detailsWarning-${warningCat._id}`} text={warningCat.name} type="category" slug={warningCat.slug} variant="secondary" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Helper component for displaying detail items
function DetailItem({ icon: Icon, label, value, valueClassName }: { icon: React.ElementType, label: string, value?: string | number | null, valueClassName?: string }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      <div>
        <span className="font-medium text-foreground/80 dark:text-foreground/70">{label}:</span>{' '}
        <span className={valueClassName || "text-foreground"}>
          {value}
        </span>
      </div>
    </div>
  );
}