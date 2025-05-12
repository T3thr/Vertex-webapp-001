// src/components/novels/NovelDetailsTab.tsx
// Component แสดงเนื้อหาสำหรับ Tab รายละเอียด
import { PopulatedNovelForDetailPage } from "@/app/api/novels/[slug]/route";
import { TagBadge } from "./TagBadge";
import { AlertTriangle, Languages, Calendar, Clock, CheckCircle, Info, Users, ShieldCheck, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface NovelDetailsTabProps {
  novel: PopulatedNovelForDetailPage;
}

// ฟังก์ชัน format วันที่
const formatDateFull = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return "ไม่มีข้อมูล";
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return format(date, "d MMMM yyyy, HH:mm", { locale: th });
  } catch (e) {
    return "วันที่ไม่ถูกต้อง";
  }
};

// Mapping ค่า status และ age rating เป็นภาษาไทย
const statusMap: { [key: string]: string } = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่แล้ว",
  completed: "จบแล้ว",
  onHiatus: "พักการเขียน",
  archived: "เก็บเข้าคลัง",
};

const ageRatingMap: { [key: string]: string } = {
  everyone: "ทั่วไป",
  teen: "13+",
  mature17: "17+", // แก้ไข key ให้ตรงกับ Model
  adult18: "18+",   // แก้ไข key ให้ตรงกับ Model
};


export function NovelDetailsTab({ novel }: NovelDetailsTabProps) {
  return (
    <div className="space-y-6 pb-10">
      {/* Description */}
      <section>
        <h3 className="text-xl font-semibold mb-3 text-foreground">เรื่องย่อ</h3>
        {/* ใช้ prose-invert ใน dark mode */}
        <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 dark:prose-invert dark:text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
          {novel.description || "ไม่มีคำอธิบาย"}
        </div>
      </section>

      {/* Tags & Categories */}
      <section>
        <h3 className="text-xl font-semibold mb-3 text-foreground">หมวดหมู่และแท็ก</h3>
        <div className="flex flex-wrap gap-2">
          {novel.categories?.map((cat) => (
             <TagBadge key={`cat-${cat._id}`} text={cat.name} type="category" slug={cat.slug} />
          ))}
          {novel.subCategories?.map((subCat) => (
            <TagBadge key={`subcat-${subCat._id}`} text={subCat.name} type="category" slug={subCat.slug} variant="secondary" />
          ))}
          {novel.tags?.map((tag) => (
             <TagBadge key={`tag-${tag}`} text={tag} type="tag" />
          ))}
          {(!novel.categories || novel.categories.length === 0) && (!novel.tags || novel.tags.length === 0) && (
            <p className="text-muted-foreground text-sm">ไม่มีหมวดหมู่หรือแท็ก</p>
          )}
        </div>
      </section>

      {/* Additional Details */}
      <section>
        <h3 className="text-xl font-semibold mb-4 text-foreground">ข้อมูลเพิ่มเติม</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <DetailItem icon={Info} label="สถานะ" value={statusMap[novel.status] || novel.status} />
          <DetailItem icon={Users} label="ระดับผู้อ่าน" value={ageRatingMap[novel.ageRating || 'everyone'] || novel.ageRating} />
          <DetailItem icon={Languages} label="ภาษา" value={novel.language === 'th' ? 'ไทย' : novel.language} />
          {novel.isExplicitContent && (
             <DetailItem icon={AlertTriangle} label="เนื้อหา" value="มีเนื้อหาสำหรับผู้ใหญ่" valueClassName="text-red-500 font-medium" />
          )}
          <DetailItem icon={Calendar} label="เผยแพร่ครั้งแรก" value={formatDateFull(novel.firstPublishedAt)} />
          <DetailItem icon={Clock} label="อัปเดตล่าสุด" value={formatDateFull(novel.lastEpisodePublishedAt || novel.updatedAt)} />
           {novel.isOriginalWork ? (
             <DetailItem icon={ShieldCheck} label="ผลงาน" value="ต้นฉบับ" />
           ) : (
             <DetailItem icon={Edit3} label="ผลงาน" value={`แปล (ต้นฉบับ: ${novel.originalLanguage || 'ไม่ระบุ'})`} />
           )}
          {novel.status === 'completed' && (
             <DetailItem icon={CheckCircle} label="จบ" value="จบสมบูรณ์แล้ว" valueClassName="text-green-600 dark:text-green-400 font-medium" />
          )}
        </div>
      </section>

      {/* Content Warnings (ถ้ามี) */}
      {novel.settings?.showContentWarnings && novel.settings?.contentWarnings && novel.settings.contentWarnings.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
             <AlertTriangle className="w-5 h-5 text-yellow-500"/> คำเตือนเนื้อหา
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
            {novel.settings.contentWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

       {/* Game Elements (ถ้ามี) */}
       {novel.gameElementsSummary && Object.values(novel.gameElementsSummary).some(v => v === true) && (
         <section>
           <h3 className="text-xl font-semibold mb-3 text-foreground">องค์ประกอบเกม</h3>
           <div className="flex flex-wrap gap-2">
             {novel.gameElementsSummary.hasChoices && <TagBadge text="มีตัวเลือก" type="feature" />}
             {novel.gameElementsSummary.hasMultipleEndings && <TagBadge text="หลายฉากจบ" type="feature" />}
             {novel.gameElementsSummary.hasStatSystem && <TagBadge text="ระบบค่าสถานะ" type="feature" />}
             {novel.gameElementsSummary.hasRelationshipSystem && <TagBadge text="ระบบความสัมพันธ์" type="feature" />}
             {novel.gameElementsSummary.hasInventorySystem && <TagBadge text="ระบบไอเทม" type="feature" />}
           </div>
         </section>
       )}
    </div>
  );
}

// Helper component for displaying detail items
function DetailItem({ icon: Icon, label, value, valueClassName }: { icon: React.ElementType, label: string, value: string | number | undefined | null, valueClassName?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      <div>
        <span className="font-medium text-foreground/80 dark:text-foreground/70">{label}:</span>{' '}
        <span className={valueClassName || "text-foreground"}>
          {value ?? <span className="text-muted-foreground italic">ไม่มีข้อมูล</span>}
        </span>
      </div>
    </div>
  );
}