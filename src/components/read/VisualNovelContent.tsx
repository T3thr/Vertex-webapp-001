'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

interface Novel {
  _id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  synopsis?: string;
  author: any;
}

interface Episode {
  _id: string;
  title: string;
  slug: string;
  episodeOrder: number;
  accessType: string;
  priceCoins?: number;
  originalPriceCoins?: number;
  firstSceneId?: string;
  teaserText?: string;
  stats?: any;
}

interface Scene {
  _id: string;
  sceneOrder: number;
  content: {
    backgroundImageUrl?: string;
    characterImageUrl?: string;
    characterName?: string;
    dialogueText: string;
    narratorText?: string;
    audioUrl?: string;
  };
  choices?: Array<{
    _id: string;
    text: string;
    nextSceneId?: string;
  }>;
  nextSceneId?: string;
}

interface VisualNovelContentProps {
  novel: Novel;
  episode: Episode;
  currentSceneId?: string;
  isPlaying: boolean;
  textSpeed: number;
  fontSize: number;
  bgOpacity: number;
  onSceneChange: (sceneId: string) => void;
  onProgressChange: (progress: number) => void;
  userId?: string;
}

export default function VisualNovelContent({
  novel,
  episode,
  currentSceneId,
  isPlaying,
  textSpeed,
  fontSize,
  bgOpacity,
  onSceneChange,
  onProgressChange,
  userId
}: VisualNovelContentProps) {
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [showChoices, setShowChoices] = useState(false);
  const [sceneHistory, setSceneHistory] = useState<Scene[]>([]);
  const [totalScenes, setTotalScenes] = useState(10); // ตั้งค่าจำนวนฉากรวม
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isTextComplete, setIsTextComplete] = useState(false);
  
  const textRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ข้อมูลจำลองฉากต่างๆ
  const mockScenes: Scene[] = [
    {
      _id: 'scene-1',
      sceneOrder: 1,
      content: {
        backgroundImageUrl: '/images/background/main.png',
        characterImageUrl: '/images/character/Ana_fullbody.png',
        characterName: 'อริษา',
        dialogueText: 'วันนี้เป็นวันแรกที่ฉันมาถึงย่านเก่าของกรุงเทพฯ เพื่อทำวิจัยเรื่องประวัติศาสตร์ท้องถิ่น',
        narratorText: 'อริษามองดูสถานที่รอบๆ ด้วยความตื่นเต้น'
      },
      choices: [
        {
          _id: 'choice-1',
          text: 'เดินไปสำรวจย่านเก่า',
          nextSceneId: 'scene-2'
        },
        {
          _id: 'choice-2', 
          text: 'หาที่พักก่อน',
          nextSceneId: 'scene-3'
        }
      ],
      nextSceneId: 'scene-2'
    },
    {
      _id: 'scene-2',
      sceneOrder: 2,
      content: {
        backgroundImageUrl: '/images/background/mansion.png',
        characterImageUrl: '/images/character/Cho_fullbody.png',
        characterName: 'คุณยาย',
        dialogueText: 'เธอมาจากไหนเหรอ ลูก? ที่นี่มันไม่ค่อยมีคนแปลกหน้ามาเยี่ยมหรอกนะ',
        narratorText: 'คุณยายคนหนึ่งเดินออกมาจากบ้านเก่าแก่'
      },
      choices: [
        {
          _id: 'choice-3',
          text: 'แนะนำตัวและบอกจุดประสงค์',
          nextSceneId: 'scene-4'
        },
        {
          _id: 'choice-4',
          text: 'ถามเรื่องประวัติของย่านนี้',
          nextSceneId: 'scene-5'
        }
      ],
      nextSceneId: 'scene-4'
    },
    {
      _id: 'scene-3',
      sceneOrder: 3,
      content: {
        backgroundImageUrl: '/images/background/road_day1.png',
        characterImageUrl: '/images/character/Ana_fullbody.png',
        characterName: 'อริษา',
        dialogueText: 'ฉันควรหาที่พักก่อน แล้วค่อยมาทำวิจัยพรุ่งนี้',
        narratorText: 'อริษาตัดสินใจเดินไปหาโรงแรมในย่านใกล้เคียง'
      },
      nextSceneId: 'scene-6'
    },
    {
      _id: 'scene-4',
      sceneOrder: 4,
      content: {
        backgroundImageUrl: '/images/background/mansion.png',
        characterImageUrl: '/images/character/Cho_fullbody.png',
        characterName: 'คุณยาย',
        dialogueText: 'อ๋อ เธอมาทำวิจัยเรื่องประวัติศาสตร์เหรอ? ที่นี่มีเรื่องราวมากมายแหละ ลูก',
        narratorText: 'คุณยายยิ้มและเชิญอริษาเข้าไปในบ้าน'
      },
      nextSceneId: 'scene-7'
    },
    {
      _id: 'scene-5',
      sceneOrder: 5,
      content: {
        backgroundImageUrl: '/images/background/mansion.png',
        characterImageUrl: '/images/character/Cho_fullbody.png',
        characterName: 'คุณยาย',
        dialogueText: 'ย่านนี้มีประวัติยาวนานนะลูก เคยเป็นที่อยู่ของขุนนางในสมัยโบราณ',
        narratorText: 'ดวงตาของคุณยายเศร้าลงเล็กน้อย'
      },
      choices: [
        {
          _id: 'choice-5',
          text: 'ถามเรื่องขุนนางที่เคยอยู่ที่นี่',
          nextSceneId: 'scene-8'
        },
        {
          _id: 'choice-6',
          text: 'สังเกตสีหน้าเศร้าของคุณยาย',
          nextSceneId: 'scene-9'
        }
      ],
      nextSceneId: 'scene-8'
    }
  ];

  // ฟังก์ชันดึงข้อมูล scene
  const fetchScene = useCallback(async (sceneId: string) => {
    try {
      // ลองดึงจาก API ก่อน
      if (sceneId && sceneId !== '') {
        const response = await fetch(`/api/novels/${novel.slug}/episodes/${episode._id}/scenes/${sceneId}`);
        if (response.ok) {
          const sceneData = await response.json();
          setCurrentScene(sceneData);
          setDisplayedText('');
          setIsTextComplete(false);
          setShowChoices(false);
          setSceneHistory(prev => [...prev, sceneData]);
          
          // คำนวณ progress
          const progress = ((currentSceneIndex + 1) / Math.max(totalScenes, 1)) * 100;
          onProgressChange(Math.min(progress, 100));
          return;
        }
      }
      
      // ใช้ข้อมูลจำลองหาก API ไม่สำเร็จ
      let targetScene: Scene | null = null;
      
      if (sceneId && sceneId !== '') {
        targetScene = mockScenes.find(scene => scene._id === sceneId) || null;
      }
      
      // ถ้าไม่เจอหรือไม่มี sceneId ให้ใช้ฉากแรก
      if (!targetScene) {
        targetScene = mockScenes[currentSceneIndex] || mockScenes[0];
      }
      
      if (targetScene) {
        setCurrentScene(targetScene);
        setDisplayedText('');
        setIsTextComplete(false);
        setShowChoices(false);
        setSceneHistory(prev => [...prev, targetScene]);
        
        // คำนวณ progress
        const progress = ((currentSceneIndex + 1) / Math.max(totalScenes, 1)) * 100;
        onProgressChange(Math.min(progress, 100));
      }
      
    } catch (error) {
      console.error('Failed to fetch scene:', error);
      // ใช้ข้อมูลจำลองในกรณีที่เกิดข้อผิดพลาด
      const fallbackScene = mockScenes[0];
      setCurrentScene(fallbackScene);
      setDisplayedText('');
      setIsTextComplete(false);
      setShowChoices(false);
      setSceneHistory(prev => [...prev, fallbackScene]);
    }
  }, [novel.slug, episode._id, currentSceneIndex, totalScenes, onProgressChange, mockScenes]);

  // เอฟเฟกต์แอนิเมชันข้อความ
  useEffect(() => {
    if (!currentScene?.content?.dialogueText) return;
    
    const text = currentScene.content.dialogueText;
    let currentIndex = 0;
    setDisplayedText('');
    setIsTextComplete(false);
    
    const speed = Math.max(30, 150 - (textSpeed * 20)); // ปรับความเร็ว
    
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTextComplete(true);
        setShowChoices(!!currentScene?.choices?.length);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [currentScene, textSpeed]);

  // เอฟเฟกต์การเล่นอัตโนมัติ
  useEffect(() => {
    if (isPlaying && isTextComplete && !showChoices && currentScene?.nextSceneId) {
      const timer = setTimeout(() => {
        handleNextScene();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isPlaying, isTextComplete, showChoices, currentScene]);

  // โหลด scene เริ่มต้น
  useEffect(() => {
    fetchScene(currentSceneId || '');
  }, [currentSceneId, fetchScene]);

  const handleNextScene = useCallback((choiceId?: string) => {
    if (!currentScene) return;
    
    let nextSceneId: string | undefined;
    
    if (choiceId && currentScene.choices) {
      const choice = currentScene.choices.find(c => c._id === choiceId);
      nextSceneId = choice?.nextSceneId;
    } else {
      nextSceneId = currentScene.nextSceneId;
    }
    
    if (nextSceneId) {
      setCurrentSceneIndex(prev => prev + 1);
      onSceneChange(nextSceneId);
      fetchScene(nextSceneId);
    } else {
      // ถ้าไม่มี nextSceneId ให้ไปฉากถัดไปตามลำดับ
      const nextIndex = currentSceneIndex + 1;
      if (nextIndex < mockScenes.length) {
        const nextScene = mockScenes[nextIndex];
        setCurrentSceneIndex(nextIndex);
        onSceneChange(nextScene._id);
        fetchScene(nextScene._id);
      }
    }
  }, [currentScene, onSceneChange, fetchScene, currentSceneIndex, mockScenes]);

  const handleSkipText = useCallback(() => {
    if (!isTextComplete && currentScene?.content?.dialogueText) {
      setDisplayedText(currentScene.content.dialogueText);
      setIsTextComplete(true);
      setShowChoices(!!currentScene?.choices?.length);
    } else if (isTextComplete && !showChoices) {
      handleNextScene();
    }
  }, [isTextComplete, showChoices, currentScene, handleNextScene]);

  if (!currentScene) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">ไม่พบเนื้อหา</h2>
          <p className="text-slate-300">ไม่สามารถโหลดเนื้อหาของตอนนี้ได้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden cursor-pointer" onClick={handleSkipText}>
      {/* รูปพื้นหลัง */}
      <div className="absolute inset-0 z-0">
        {currentScene?.content?.backgroundImageUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={currentScene.content.backgroundImageUrl}
              alt="Background"
              fill
              className="object-cover"
              priority
              onError={(e) => {
                // ถ้าโหลดรูปไม่ได้ ให้ใช้สีพื้นหลัง
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900" />
        )}
        {/* ลด opacity ของ overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* รูปตัวละคร */}
      {currentScene?.content?.characterImageUrl && (
        <motion.div
          className="absolute bottom-0 right-0 z-20"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <Image
              src={currentScene.content.characterImageUrl}
              alt={currentScene.content.characterName || 'Character'}
              width={400}
              height={600}
              className="object-contain max-h-[70vh] drop-shadow-2xl"
              priority
              onError={(e) => {
                // ซ่อนรูปถ้าโหลดไม่ได้
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </motion.div>
      )}

      {/* กล่องบทสนทนา */}
      <motion.div
        className="absolute bottom-4 left-4 right-4 z-30"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-6 shadow-2xl">
          {/* ชื่อตัวละคร */}
          {currentScene?.content?.characterName && (
            <motion.div
              className="mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="bg-primary text-primary-foreground inline-block px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                {currentScene.content.characterName}
              </span>
            </motion.div>
          )}

          {/* ข้อความบทสนทนา */}
          <div
            ref={textRef}
            className="text-card-foreground leading-relaxed mb-2"
            style={{ fontSize: `${fontSize}px` }}
          >
            {displayedText}
            {!isTextComplete && (
              <motion.span
                className="inline-block w-1 h-6 ml-1 bg-primary"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* ข้อความบรรยาย */}
          {currentScene?.content?.narratorText && isTextComplete && (
            <motion.div
              className="mt-3 text-muted-foreground italic text-sm border-l-2 border-primary/30 pl-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: `${fontSize - 2}px` }}
            >
              {currentScene.content.narratorText}
            </motion.div>
          )}

          {/* ตัวเลือก */}
          <AnimatePresence>
            {showChoices && currentScene.choices && (
              <motion.div
                className="mt-6 space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentScene.choices.map((choice, index) => (
                  <motion.button
                    key={choice._id}
                    className="w-full text-left p-4 rounded-xl bg-secondary/70 hover:bg-secondary border border-border transition-all duration-200 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextScene(choice._id);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: `${fontSize - 1}px` }} className="text-card-foreground font-medium">
                        {choice.text}
                      </span>
                      <ChevronDown size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ตัวบ่งชี้การดำเนินต่อ */}
          {isTextComplete && !showChoices && currentScene?.nextSceneId && (
            <motion.div
              className="flex justify-center mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="text-muted-foreground text-sm flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full"
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span>คลิกเพื่อดำเนินต่อ</span>
                <ChevronDown size={16} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* เสียง */}
      {currentScene?.content?.audioUrl && (
        <audio
          ref={audioRef}
          src={currentScene.content.audioUrl}
          autoPlay
          onError={(e) => console.error('Audio error:', e)}
        />
      )}
    </div>
  );
} 