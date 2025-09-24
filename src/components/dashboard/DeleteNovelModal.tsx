// src/components/dashboard/DeleteNovelModal.tsx
// Modal สำหรับยืนยันการลบนิยาย - พร้อมคำเตือนและข้อมูลที่จะถูกลบ
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  X, 
  Trash2, 
  BookOpen, 
  Users, 
  MessageCircle, 
  BarChart3,
  Clock,
  Loader2
} from 'lucide-react';
import { SerializedNovel } from '@/app/dashboard/page';

interface DeleteNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: SerializedNovel | null;
  onConfirmDelete: (novelId: string) => Promise<void>;
}

export default function DeleteNovelModal({ 
  isOpen, 
  onClose, 
  novel, 
  onConfirmDelete 
}: DeleteNovelModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm' | 'deleting'>('warning');

  // Reset modal state when opening/closing or when novel changes
  useEffect(() => {
    if (isOpen && novel) {
      // Reset all states when modal opens with a new novel
      setIsDeleting(false);
      setConfirmText('');
      setStep('warning');
    }
  }, [isOpen, novel?._id]); // Use novel._id to detect novel changes more precisely

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Add a small delay to ensure smooth animation
      const timer = setTimeout(() => {
        setIsDeleting(false);
        setConfirmText('');
        setStep('warning');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!novel) return null;

  const requiredConfirmText = `ลบ ${novel.title}`;
  const isConfirmTextValid = confirmText === requiredConfirmText;

  const handleDelete = async () => {
    if (!isConfirmTextValid) return;
    
    setStep('deleting');
    setIsDeleting(true);
    
    try {
      await onConfirmDelete(novel._id);
      // Reset all states before closing
      setStep('warning');
      setConfirmText('');
      setIsDeleting(false);
      onClose();
    } catch (error) {
      console.error('Error deleting novel:', error);
      // On error, go back to confirm step but keep the text
      setStep('confirm');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    // Reset all states before closing
    setStep('warning');
    setConfirmText('');
    setIsDeleting(false);
    onClose();
  };

  const deletionImpacts = [
    {
      icon: BookOpen,
      title: 'ตอนทั้งหมด',
      count: novel.publishedEpisodesCount,
      description: 'ตอนที่เผยแพร่แล้วจะถูกลบถาวร'
    },
    {
      icon: Users,
      title: 'ผู้ติดตาม',
      count: novel.stats.followersCount,
      description: 'ผู้ติดตามจะไม่สามารถเข้าถึงได้'
    },
    {
      icon: MessageCircle,
      title: 'คอมเมนต์',
      count: novel.stats.commentsCount,
      description: 'คอมเมนต์ทั้งหมดจะถูกลบ'
    },
    {
      icon: BarChart3,
      title: 'สถิติ',
      count: novel.stats.viewsCount,
      description: 'ข้อมูลสถิติทั้งหมดจะหายไป'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-card-foreground">
                    ลบนิยายถาวร
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    การดำเนินการนี้ไม่สามารถย้อนกลับได้
                  </p>
                </div>
              </div>
              
              {!isDeleting && (
                <motion.button
                  onClick={handleClose}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'warning' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Novel Info */}
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {novel.coverImageUrl ? (
                          <img 
                            src={novel.coverImageUrl} 
                            alt={novel.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-card-foreground mb-1 line-clamp-2">
                          {novel.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {novel.synopsis}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>สร้างเมื่อ: {new Date(novel.createdAt).toLocaleDateString('th-TH')}</span>
                          <span>อัปเดต: {new Date(novel.lastContentUpdatedAt).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning Message */}
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                          คำเตือนสำคัญ
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-300 leading-relaxed">
                          การลบนิยายเรื่องนี้จะเป็นการลบ<strong>ถาวร</strong> และ<strong>ไม่สามารถกู้คืนได้</strong> 
                          ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากระบบอย่างสมบูรณ์
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deletion Impact */}
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-4">
                      ข้อมูลที่จะถูกลบ:
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {deletionImpacts.map((impact, index) => (
                        <motion.div
                          key={impact.title}
                          className="bg-secondary/30 rounded-lg p-3 border border-border/50"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <impact.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{impact.title}</span>
                          </div>
                          <div className="text-lg font-bold text-card-foreground mb-1">
                            {impact.count.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {impact.description}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      onClick={handleClose}
                      className="flex-1 bg-secondary text-secondary-foreground px-4 py-3 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ยกเลิก
                    </motion.button>
                    <motion.button
                      onClick={() => setStep('confirm')}
                      className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ดำเนินการต่อ
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 'confirm' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground mb-2">
                      ยืนยันการลบ
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      กรุณาพิมพ์ข้อความด้านล่างเพื่อยืนยันการลบ
                    </p>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      พิมพ์ข้อความนี้เพื่อยืนยัน:
                    </p>
                    <code className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-mono text-sm">
                      {requiredConfirmText}
                    </code>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="พิมพ์ข้อความยืนยันที่นี่..."
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      autoFocus
                    />
                    {confirmText && !isConfirmTextValid && (
                      <p className="text-xs text-red-500 mt-2">
                        ข้อความไม่ตรงกัน กรุณาพิมพ์ให้ถูกต้อง
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setStep('warning')}
                      className="flex-1 bg-secondary text-secondary-foreground px-4 py-3 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      กลับ
                    </motion.button>
                    <motion.button
                      onClick={handleDelete}
                      disabled={!isConfirmTextValid}
                      className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: isConfirmTextValid ? 1.02 : 1 }}
                      whileTap={{ scale: isConfirmTextValid ? 0.98 : 1 }}
                    >
                      ลบนิยายถาวร
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 'deleting' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground mb-2">
                    กำลังลบนิยาย...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    กรุณารอสักครู่ ระบบกำลังลบข้อมูลทั้งหมด
                  </p>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>การดำเนินการนี้อาจใช้เวลาสักครู่...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
