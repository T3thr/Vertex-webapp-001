// src/components/novels/NovelDetailsTab.tsx
import { PopulatedNovelForDetailPage } from '@/app/api/novels/[slug]/route';
import { TagBadge } from './TagBadge';
import { Layers3, BookCopy, Palette, Brain, Users, Languages, ShieldAlert, Info, Clock, CalendarDays, Type, GitFork, FileText, UserCheck, Globe, AlertTriangle, ThumbsDown, Lightbulb, BookHeart } from 'lucide-react';
import { NovelContentType, NovelEndingType, NovelStatus} from '@/backend/models/Novel'; //

interface NovelDetailsTabProps {
  novel: PopulatedNovelForDetailPage;
}

const DetailSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
  <div className={`mb-8 p-4 sm:p-6 bg-card rounded-lg shadow-md border border-border ${className}`}>
    <h3 className="text-xl font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
      {icon && <span className="mr-2 text-primary">{icon}</span>}
      {title}
    </h3>
    <div className="text-foreground/80 space-y-2 text-sm sm:text-base">
      {children}
    </div>
  </div>
);

const CategoryList: React.FC<{ items: PopulatedNovelForDetailPage['themeAssignment']['moodAndTone'], defaultText?: string }> = ({ items, defaultText = "ไม่มีข้อมูล" }) => {
  if (!items || items.length === 0) {
    return <p className="text-muted-foreground italic">{defaultText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => item && <TagBadge key={item._id.toString()} category={item} />)}
    </div>
  );
};


export const NovelDetailsTab: React.FC<NovelDetailsTabProps> = ({ novel }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {novel.longDescription && (
          <DetailSection title="เรื่องเต็ม / คำโปรย" icon={<FileText />}>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none whitespace-pre-wrap break-words">
                {novel.longDescription}
            </div>
          </DetailSection>
        )}

        <DetailSection title="ธีมและหมวดหมู่" icon={<Layers3 />}>
          <div className="space-y-3">
            <div>
              <strong className="font-medium text-foreground block mb-1">หมวดหมู่หลัก:</strong>
              {novel.themeAssignment?.mainTheme?.categoryId ? (
                <TagBadge category={novel.themeAssignment.mainTheme.categoryId} />
              ) : <span className="text-muted-foreground italic">ไม่มีข้อมูล</span>}
              {novel.themeAssignment?.mainTheme?.customName && <span className="ml-2 text-sm text-muted-foreground">({novel.themeAssignment.mainTheme.customName})</span>}
            </div>
            {novel.themeAssignment?.subThemes && novel.themeAssignment.subThemes.length > 0 && (
              <div>
                <strong className="font-medium text-foreground block mb-1">หมวดหมู่รอง:</strong>
                <CategoryList items={novel.themeAssignment.subThemes.map(st => st.categoryId).filter(Boolean) as any[]} />
              </div>
            )}
            {novel.themeAssignment?.moodAndTone && novel.themeAssignment.moodAndTone.length > 0 && (
              <div>
                <strong className="font-medium text-foreground block mb-1">อารมณ์และโทน:</strong>
                <CategoryList items={novel.themeAssignment.moodAndTone} />
              </div>
            )}
            {novel.themeAssignment?.customTags && novel.themeAssignment.customTags.length > 0 && (
              <div>
                <strong className="font-medium text-foreground block mb-1">แท็กที่ผู้เขียนกำหนด:</strong>
                <div className="flex flex-wrap gap-2">
                  {novel.themeAssignment.customTags.map(tag => <TagBadge key={tag} text={tag} category={{name: tag, color: 'var(--accent)'}}/>)}
                </div>
              </div>
            )}
          </div>
        </DetailSection>
        
        {novel.narrativeFocus && Object.values(novel.narrativeFocus).some(val => Array.isArray(val) ? val.length > 0 : val) && (
            <DetailSection title="จุดเน้นการเล่าเรื่อง" icon={<Lightbulb />}>
                <div className="space-y-3">
                    {novel.narrativeFocus.narrativePacingTags && novel.narrativeFocus.narrativePacingTags.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1">จังหวะการดำเนินเรื่อง:</strong> <CategoryList items={novel.narrativeFocus.narrativePacingTags} /></div>
                    )}
                    {novel.narrativeFocus.primaryConflictTypes && novel.narrativeFocus.primaryConflictTypes.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1">ประเภทความขัดแย้งหลัก:</strong> <CategoryList items={novel.narrativeFocus.primaryConflictTypes} /></div>
                    )}
                    {novel.narrativeFocus.narrativePerspective && (
                        <div><strong className="font-medium text-foreground block mb-1">มุมมองการเล่าเรื่อง:</strong> <TagBadge category={novel.narrativeFocus.narrativePerspective} /></div>
                    )}
                    {novel.narrativeFocus.storyArcStructure && (
                        <div><strong className="font-medium text-foreground block mb-1">โครงสร้างเส้นเรื่อง:</strong> <TagBadge category={novel.narrativeFocus.storyArcStructure} /></div>
                    )}
                    {novel.narrativeFocus.artStyle && (
                        <div><strong className="font-medium text-foreground block mb-1">สไตล์ภาพ (ถ้ามี):</strong> <TagBadge category={novel.narrativeFocus.artStyle} /></div>
                    )}
                    {novel.narrativeFocus.gameplayMechanics && novel.narrativeFocus.gameplayMechanics.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1">กลไกการเล่น (ถ้ามี):</strong> <CategoryList items={novel.narrativeFocus.gameplayMechanics} /></div>
                    )}
                     {novel.narrativeFocus.interactivityLevel && (
                        <div><strong className="font-medium text-foreground block mb-1">ระดับการโต้ตอบ:</strong> <TagBadge category={novel.narrativeFocus.interactivityLevel} /></div>
                    )}
                    {novel.narrativeFocus.lengthTag && (
                        <div><strong className="font-medium text-foreground block mb-1">ความยาว:</strong> <TagBadge category={novel.narrativeFocus.lengthTag} /></div>
                    )}
                    {novel.narrativeFocus.commonTropes && novel.narrativeFocus.commonTropes.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1">Common Tropes:</strong> <CategoryList items={novel.narrativeFocus.commonTropes} /></div>
                    )}
                     {novel.narrativeFocus.targetAudienceProfileTags && novel.narrativeFocus.targetAudienceProfileTags.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1">กลุ่มเป้าหมาย:</strong> <CategoryList items={novel.narrativeFocus.targetAudienceProfileTags} /></div>
                    )}
                    {novel.narrativeFocus.avoidIfYouDislikeTags && novel.narrativeFocus.avoidIfYouDislikeTags.length > 0 && (
                        <div><strong className="font-medium text-foreground block mb-1 text-red-600 dark:text-red-400">ควรหลีกเลี่ยงหากไม่ชอบ:</strong> <CategoryList items={novel.narrativeFocus.avoidIfYouDislikeTags} /></div>
                    )}
                </div>
            </DetailSection>
        )}


        {novel.worldBuildingDetails && (novel.worldBuildingDetails.loreSummary || novel.worldBuildingDetails.magicSystemRules || novel.worldBuildingDetails.technologyPrinciples) && (
          <DetailSection title="รายละเอียดโลกในเรื่อง" icon={<Globe />}>
            {novel.worldBuildingDetails.loreSummary && <p><strong>Lore:</strong> {novel.worldBuildingDetails.loreSummary}</p>}
            {novel.worldBuildingDetails.magicSystemRules && <p><strong>ระบบเวทมนตร์:</strong> {novel.worldBuildingDetails.magicSystemRules}</p>}
            {novel.worldBuildingDetails.technologyPrinciples && <p><strong>เทคโนโลยี:</strong> {novel.worldBuildingDetails.technologyPrinciples}</p>}
          </DetailSection>
        )}
      </div>

      <aside className="lg:col-span-1 space-y-6">
        <DetailSection title="ข้อมูลทั่วไป" icon={<Info />}>
          <p><strong>สถานะ:</strong> {novel.status === NovelStatus.COMPLETED ? "จบแล้ว" : novel.status === NovelStatus.PUBLISHED ? "เผยแพร่แล้ว" : novel.status}</p> {/* */}
          <p><strong>การเข้าถึง:</strong> {novel.accessLevel}</p>
          <p><strong>เขียนจบแล้ว:</strong> {novel.isCompleted ? 'ใช่' : 'ไม่ใช่'}</p>
          <p><strong>ประเภทตอนจบ:</strong> {novel.endingType === NovelEndingType.MULTIPLE_ENDINGS ? "หลายตอนจบ" : novel.endingType === NovelEndingType.SINGLE_ENDING ? "ตอนจบเดียว" : novel.endingType === NovelEndingType.OPEN_ENDING ? "ปลายเปิด" : "กำลังดำเนินเรื่อง"}</p> {/* */}
          <p><strong>ภาษา:</strong> {novel.language?.name || 'ไม่ระบุ'}</p>
          <p><strong>อัปเดตล่าสุด:</strong> {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          {novel.publishedAt && <p><strong>เผยแพร่เมื่อ:</strong> {new Date(novel.publishedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
        </DetailSection>

        <DetailSection title="ประเภทเนื้อหา" icon={<BookCopy />}>
          <p><strong>ประเภท:</strong> {
            novel.sourceType.type === NovelContentType.FAN_FICTION ? "แฟนฟิคชั่น" :
            novel.sourceType.type === NovelContentType.TRANSLATION ? "ผลงานแปล" :
            novel.sourceType.type === NovelContentType.ADAPTATION ? "ผลงานดัดแปลง" :
            novel.sourceType.type === NovelContentType.INTERACTIVE_FICTION ? "นิยายเชิงโต้ตอบ" : "ต้นฉบับ"
          }</p> {/* */}
          {novel.sourceType.type === NovelContentType.FAN_FICTION && novel.sourceType.fandomCategoryId && ( // This requires fandomCategoryId to be populated. For now, we assume it might not be fully.
            <p><strong>Fandom:</strong> {(novel.sourceType.fandomCategoryId as any)?.name || 'ไม่ระบุ'}</p>
          )}
          {novel.sourceType.originalWorkTitle && <p><strong>จากเรื่อง:</strong> {novel.sourceType.originalWorkTitle}</p>}
          {novel.sourceType.originalWorkAuthor && <p><strong>ผู้แต่งเดิม:</strong> {novel.sourceType.originalWorkAuthor}</p>}
        </DetailSection>

        {novel.themeAssignment?.contentWarnings && novel.themeAssignment.contentWarnings.length > 0 && (
          <DetailSection title="คำเตือนเนื้อหา" icon={<AlertTriangle className="text-orange-500" />}>
            <CategoryList items={novel.themeAssignment.contentWarnings} />
          </DetailSection>
        )}
         {novel.ageRatingCategoryId && (
            <DetailSection title="เรทผู้อ่าน" icon={<UserCheck />}>
                <TagBadge category={novel.ageRatingCategoryId} />
            </DetailSection>
        )}
        {novel.psychologicalAnalysisConfig?.allowsPsychologicalAnalysis && (
             <DetailSection title="การวิเคราะห์ทางจิตวิทยา" icon={<Brain />}>
                <p className="text-sm text-muted-foreground">นิยายเรื่องนี้อนุญาตให้มีการวิเคราะห์ทางจิตวิทยาเพื่อประสบการณ์การอ่านที่ลึกซึ้งยิ่งขึ้น</p>
             </DetailSection>
        )}
      </aside>
    </div>
  );
};