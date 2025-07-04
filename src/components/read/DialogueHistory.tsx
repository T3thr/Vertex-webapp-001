'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, User } from 'lucide-react';

interface HistoryItem {
  id: string;
  sceneId: string;
  sceneOrder: number;
  characterName?: string;
  dialogueText: string;
}

interface DialogueHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
}

export default function DialogueHistory({ isOpen, onClose, history }: DialogueHistoryProps) {
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter history based on search
  useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
    }

    if (searchQuery.trim()) {
      const filtered = history.filter(item =>
        (item.dialogueText && item.dialogueText.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.characterName && item.characterName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(history);
    }
  }, [history, searchQuery, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-card-foreground text-lg font-semibold">ประวัติการสนทนา</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-card-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="ค้นหาในประวัติ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-input-border rounded-lg text-card-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Clock size={32} className="mb-2" />
                    <p>ยังไม่มีประวัติการสนทนา</p>
                </div>
              ) : filteredHistory.length === 0 && searchQuery ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Search size={32} className="mb-2" />
                    <p>ไม่พบผลการค้นหา</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="bg-secondary/30 border border-border rounded-lg p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.characterName ? (
                            <>
                              <User size={14} className="text-primary" />
                              <span className="text-primary text-sm font-medium">
                                {item.characterName}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">บรรยาย</span>
                          )}
                        </div>
                         <span className="text-muted-foreground text-xs">
                          ฉาก {item.sceneOrder}
                        </span>
                      </div>

                      {/* Dialogue */}
                      {item.dialogueText && (
                        <p className="text-card-foreground text-sm leading-relaxed">
                          {item.dialogueText}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 