// src/components/dashboard/CreateNovelModal.tsx
// Modal สำหรับสร้างนิยายใหม่ - รองรับการสร้างแบบร่างนิยายคร่าวๆ
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  BookOpen, 
  User, 
  FileText, 
  Tag, 
  Globe,
  Loader2,
  Sparkles,
  PenTool,
  Type,
  MessageSquare
} from 'lucide-react';
import { SerializedUser } from '@/app/dashboard/page';

interface CreateNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SerializedUser;
  onNovelCreated: (novel: any) => void;
}

interface NovelFormData {
  title: string;
  penName: string;
  synopsis: string;
  mainThemeId?: string;
  languageId?: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  categoryType: string;
}

export default function CreateNovelModal({ isOpen, onClose, user, onNovelCreated }: CreateNovelModalProps) {
  const [formData, setFormData] = useState<NovelFormData>({
    title: '',
    penName: user.profile?.penNames?.[0] || user.profile?.displayName || user.username || '',
    synopsis: '',
    mainThemeId: '',
    languageId: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const [themesRes, languagesRes] = await Promise.all([
        fetch('/api/search/categories?type=THEME&limit=20&forNovelCreation=true'),
        fetch('/api/search/categories?type=LANGUAGE&limit=10&forNovelCreation=true')
      ]);

      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData.data || []);
      }

      if (languagesRes.ok) {
        const languagesData = await languagesRes.json();
        setLanguages(languagesData.data || []);
        
        // Auto-select Thai language if available
        const thaiLang = languagesData.data?.find((lang: Category) => 
          lang.name === 'ไทย' || lang.name === 'Thai' || lang.slug === 'thai'
        );
        if (thaiLang) {
          setFormData(prev => ({ ...prev, languageId: thaiLang._id }));
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleInputChange = (field: keyof NovelFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('กรุณาระบุชื่อเรื่อง');
      return;
    }

    if (!formData.penName.trim()) {
      setError('กรุณาระบุนามปากกา');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          penName: formData.penName.trim(),
          synopsis: formData.synopsis.trim(),
          mainThemeId: formData.mainThemeId || undefined,
          languageId: formData.languageId || undefined,
          authorId: user._id
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Success - call the callback and close modal
        onNovelCreated(data.novel);
        handleClose();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการสร้างนิยาย');
      }
    } catch (error) {
      console.error('Error creating novel:', error);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        title: '',
        penName: user.profile?.penNames?.[0] || user.profile?.displayName || user.username || '',
        synopsis: '',
        mainThemeId: '',
        languageId: ''
      });
      setError(null);
      onClose();
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-card-foreground">สร้างนิยายใหม่</h2>
                    <p className="text-sm text-muted-foreground">เริ่มต้นสร้างสรรค์เรื่องราวใหม่ของคุณ</p>
                  </div>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Novel Title */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  <Type className="w-4 h-4" />
                  ชื่อเรื่อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-foreground placeholder-muted-foreground"
                  placeholder="ระบุชื่อนิยายของคุณ..."
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Pen Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  <PenTool className="w-4 h-4" />
                  นามปากกา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.penName}
                  onChange={(e) => handleInputChange('penName', e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-foreground placeholder-muted-foreground"
                  placeholder="ชื่อที่จะแสดงเป็นผู้แต่ง..."
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Synopsis */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                  <MessageSquare className="w-4 h-4" />
                  เรื่องย่อ (ไม่บังคับ)
                </label>
                <textarea
                  value={formData.synopsis}
                  onChange={(e) => handleInputChange('synopsis', e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-foreground placeholder-muted-foreground resize-none"
                  placeholder="เขียนเรื่องย่อของนิยายแบบคร่าวๆ..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Categories Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Theme */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Tag className="w-4 h-4" />
                    หมวดหมู่หลัก
                  </label>
                  {loadingCategories ? (
                    <div className="w-full px-4 py-3 bg-background border border-border rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-muted-foreground text-sm">กำลังโหลด...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.mainThemeId}
                      onChange={(e) => handleInputChange('mainThemeId', e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-foreground"
                      disabled={isLoading}
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      {themes.map((theme) => (
                        <option key={theme._id} value={theme._id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Globe className="w-4 h-4" />
                    ภาษา
                  </label>
                  {loadingCategories ? (
                    <div className="w-full px-4 py-3 bg-background border border-border rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-muted-foreground text-sm">กำลังโหลด...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.languageId}
                      onChange={(e) => handleInputChange('languageId', e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-foreground"
                      disabled={isLoading}
                    >
                      <option value="">เลือกภาษา</option>
                      {languages.map((language) => (
                        <option key={language._id} value={language._id}>
                          {language.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">เกี่ยวกับการสร้างนิยาย:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• นิยายที่สร้างใหม่จะอยู่ในสถานะ &quot;ฉบับร่าง&quot; และเป็นส่วนตัว</li>
                      <li>• คุณสามารถแก้ไขข้อมูลและเพิ่มตอนได้ภายหลัง</li>
                      <li>• หมวดหมู่และภาษาสามารถเปลี่ยนแปลงได้ในหน้าตั้งค่านิยาย</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <motion.button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  ยกเลิก
                </motion.button>
                <motion.button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  disabled={isLoading || !formData.title.trim() || !formData.penName.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      สร้างนิยาย
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 