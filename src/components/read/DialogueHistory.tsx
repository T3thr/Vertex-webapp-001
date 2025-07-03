'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, User } from 'lucide-react';

interface DialogueHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: string;
}

interface HistoryItem {
  _id: string;
  sceneOrder: number;
  characterName?: string;
  dialogueText: string;
  narratorText?: string;
  timestamp: string;
}

export default function DialogueHistory({ isOpen, onClose, episodeId }: DialogueHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dialogue history
  useEffect(() => {
    if (isOpen && episodeId) {
      fetchHistory();
    }
  }, [isOpen, episodeId]);

  // Filter history based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = history.filter(item =>
        item.dialogueText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.characterName && item.characterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.narratorText && item.narratorText.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(history);
    }
  }, [history, searchQuery]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to get reading history
      // For now, mock data
      const mockHistory: HistoryItem[] = [
        {
          _id: '1',
          sceneOrder: 1,
          characterName: 'อริษา',
          dialogueText: 'วันนี้เป็นวันแรกที่ฉันมาถึงย่านเก่าของกรุงเทพฯ เพื่อทำวิจัยเรื่องประวัติศาสตร์ท้องถิ่น',
          narratorText: 'อริษามองดูสถานที่รอบๆ ด้วยความตื่นเต้น',
          timestamp: new Date().toISOString()
        },
        {
          _id: '2',
          sceneOrder: 2,
          characterName: 'คุณยาย',
          dialogueText: 'เธอมาจากไหนเหรอ ลูก? ที่นี่มันไม่ค่อยมีคนแปลกหน้ามาเยี่ยมหรอกนะ',
          timestamp: new Date(Date.now() - 60000).toISOString()
        },
        {
          _id: '3',
          sceneOrder: 3,
          characterName: 'อริษา',
          dialogueText: 'ฉันมาจากมหาวิทยาลัยค่ะ มาทำวิจัยเรื่องประวัติศาสตร์ของย่านนี้',
          timestamp: new Date(Date.now() - 120000).toISOString()
        },
        {
          _id: '4',
          sceneOrder: 4,
          dialogueText: 'ย่านเก่าแห่งนี้เต็มไปด้วยเรื่องราวและความลึกลับมากมาย ที่รอให้ใครบางคนมาค้นพบ',
          narratorText: 'เสียงลมเอื่อยผ่านตึกเก่าแก่ ดังกังวานเหมือนเสียงกระซิบของอดีต',
          timestamp: new Date(Date.now() - 180000).toISOString()
        }
      ];
      setHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <Search size={32} className="mb-2" />
                      <p>ไม่พบผลการค้นหา</p>
                    </>
                  ) : (
                    <>
                      <Clock size={32} className="mb-2" />
                      <p>ยังไม่มีประวัติการสนทนา</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {filteredHistory.map((item, index) => (
                    <motion.div
                      key={item._id}
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
                          {formatTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Dialogue */}
                      <p className="text-card-foreground text-sm leading-relaxed mb-2">
                        {item.dialogueText}
                      </p>

                      {/* Narrator text */}
                      {item.narratorText && (
                        <p className="text-muted-foreground text-xs italic">
                          {item.narratorText}
                        </p>
                      )}

                      {/* Scene indicator */}
                      <div className="flex justify-end mt-2">
                        <span className="text-primary text-xs">
                          ฉาก {item.sceneOrder}
                        </span>
                      </div>
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