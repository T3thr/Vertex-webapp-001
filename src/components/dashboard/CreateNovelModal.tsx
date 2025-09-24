// src/components/dashboard/CreateNovelModal.tsx
// Modal สำหรับสร้างนิยายใหม่ - Visual Novel Style - รองรับการสร้างแบบสมบูรณ์
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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
  MessageSquare,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Palette,
  Star,
  Heart,
  Gamepad2,
  Camera,
  Clock,
  Users
} from 'lucide-react';
import { SerializedUser } from '@/app/dashboard/page';
import { useRouter } from 'next/navigation';

interface CreateNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SerializedUser;
  onNovelCreated: (novel: any) => void;
}

interface NovelFormData {
  title: string;
  slug: string;
  penName: string;
  synopsis: string;
  longDescription: string;
  mainThemeId?: string;
  languageId?: string;
  coverImage?: File;
  bannerImage?: File;
  ageRating?: string;
  contentType: 'original' | 'fan_fiction' | 'translation' | 'adaptation' | 'interactive_fiction';
  endingType: 'single_ending' | 'multiple_endings' | 'ongoing' | 'open_ending';
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  categoryType: string;
}

export default function CreateNovelModal({ isOpen, onClose, user, onNovelCreated }: CreateNovelModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<NovelFormData>({
    title: '',
    slug: '',
    penName: user.profile?.penNames?.[0] || user.profile?.displayName || user.username || '',
    synopsis: '',
    longDescription: '',
    mainThemeId: '',
    languageId: '',
    coverImage: undefined,
    bannerImage: undefined,
    ageRating: '',
    contentType: 'interactive_fiction',
    endingType: 'multiple_endings'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Category[]>([]);
  const [ageRatings, setAgeRatings] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [penNameDropdownOpen, setPenNameDropdownOpen] = useState(false);
  const [availablePenNames, setAvailablePenNames] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Load available pen names from user profile
  useEffect(() => {
    if (isOpen && user.profile?.penNames) {
      setAvailablePenNames(user.profile.penNames);
    }
  }, [isOpen, user.profile?.penNames]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const [themesRes, languagesRes, ageRatingsRes] = await Promise.all([
        fetch('/api/categories?type=theme&limit=20&isActive=true'),
        fetch('/api/categories?type=language&limit=10&isActive=true'),
        fetch('/api/categories?type=age_rating&limit=10&isActive=true')
      ]);

      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData.categories || []);
      }

      if (languagesRes.ok) {
        const languagesData = await languagesRes.json();
        setLanguages(languagesData.categories || []);

        // Auto-select Thai language if available
        const thaiLang = languagesData.categories?.find((lang: Category) =>
          lang.name === 'ไทย' || lang.name === 'Thai' || lang.slug === 'thai'
        );
        if (thaiLang) {
          setFormData(prev => ({ ...prev, languageId: thaiLang._id }));
        }
      }

      if (ageRatingsRes.ok) {
        const ageRatingsData = await ageRatingsRes.json();
        setAgeRatings(ageRatingsData.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('ไม่สามารถโหลดหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoadingCategories(false);
    }
  };

  // ฟังก์ชันสร้าง slug จากชื่อเรื่อง
  const generateSlug = (title: string): string => {
    if (!title) return '';
    
    return title
      .toString()
      .normalize('NFC')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .substring(0, 280);
  };

  const handleInputChange = (field: keyof NovelFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate slug when title changes
      if (field === 'title') {
        newData.slug = generateSlug(value);
      }
      
      return newData;
    });
    setError(null);
  };

  const handleImageUpload = (type: 'cover' | 'banner', file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (type === 'cover') {
          setCoverPreview(preview);
          setFormData(prev => ({ ...prev, coverImage: file }));
        } else {
          setBannerPreview(preview);
          setFormData(prev => ({ ...prev, bannerImage: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('กรุณาระบุชื่อเรื่อง');
      return;
    }

    if (!formData.slug.trim()) {
      setError('กรุณาระบุ Slug');
      return;
    }

    if (!formData.penName.trim()) {
      setError('กรุณาระบุนามปากกา');
      return;
    }

    if (!formData.synopsis.trim()) {
      setError('กรุณาระบุเรื่องย่อ');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create FormData for file uploads
      const submitData = new FormData();
      submitData.append('title', formData.title.trim());
      submitData.append('slug', formData.slug.trim());
      submitData.append('penName', formData.penName.trim());
      submitData.append('synopsis', formData.synopsis.trim());
      submitData.append('longDescription', formData.longDescription.trim());
      submitData.append('contentType', formData.contentType);
      submitData.append('endingType', formData.endingType);
      submitData.append('authorId', user._id);

      if (formData.mainThemeId) submitData.append('mainThemeId', formData.mainThemeId);
      if (formData.languageId) submitData.append('languageId', formData.languageId);
      if (formData.ageRating) submitData.append('ageRating', formData.ageRating);
      if (formData.coverImage) submitData.append('coverImage', formData.coverImage);
      if (formData.bannerImage) submitData.append('bannerImage', formData.bannerImage);

      const response = await fetch('/api/novels', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'เกิดข้อผิดพลาดในการสร้างนิยาย';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        setError(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success && data.novel) {
        onNovelCreated(data.novel);
        handleClose();
        
        // 🎯 PROFESSIONAL: Navigate to overview without any URL parameters
        // Tutorial will show automatically when no episodes exist
        router.push(`/novels/${data.novel.slug}/overview`);
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
        slug: '',
        penName: user.profile?.penNames?.[0] || user.profile?.displayName || user.username || '',
        synopsis: '',
        longDescription: '',
        mainThemeId: '',
        languageId: '',
        coverImage: undefined,
        bannerImage: undefined,
        ageRating: '',
        contentType: 'interactive_fiction',
        endingType: 'multiple_endings'
      });
      setError(null);
      setCoverPreview(null);
      setBannerPreview(null);
      setCurrentStep(1);
      setPenNameDropdownOpen(false);
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

  const contentTypes = [
    { value: 'interactive_fiction', label: 'Visual Novel', icon: Gamepad2, color: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' },
    { value: 'original', label: 'นิยายต้นฉบับ', icon: BookOpen, color: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' },
    { value: 'fan_fiction', label: 'แฟนฟิคชั่น', icon: Heart, color: 'bg-gradient-to-br from-pink-500 to-pink-600 text-white' },
    { value: 'adaptation', label: 'ดัดแปลง', icon: Star, color: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' },
    { value: 'translation', label: 'แปล', icon: Globe, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' }
  ];

  const endingTypes = [
    { value: 'multiple_endings', label: 'หลายจบ', icon: '🎭' },
    { value: 'single_ending', label: 'จบเดียว', icon: '🎯' },
    { value: 'ongoing', label: 'ยังไม่จบ', icon: '⏳' },
    { value: 'open_ending', label: 'จบเปิด', icon: '🌟' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
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
            className="relative w-full max-w-4xl max-h-[95vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Sticky Header */}
            <div className="flex-shrink-0 bg-card/80 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative p-2 sm:p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg sm:rounded-xl border border-purple-500/20">
                    <Gamepad2 className="w-5 h-5 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      สร้างนิยายโต้ตอบใหม่
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      เริ่มต้นสร้างสรรค์ Visual Novel ที่น่าตื่นเต้น ✨
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="p-2.5 hover:bg-secondary/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground backdrop-blur-sm"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-8">
                {/* Error Message */}
                {error && (
                  <motion.div
                    className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl p-4 backdrop-blur-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <p className="text-red-600 dark:text-red-300 text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Images */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Cover Image */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <ImageIcon className="w-4 h-4 text-purple-500" />
                        รูปปก Visual Novel
                      </label>
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <div className="aspect-[3/4] bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30">
                          {coverPreview ? (
                            <Image src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" width={300} height={400} />
                          ) : (
                            <div className="text-center">
                              <Camera className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">คลิกเพื่ออัพโหลด</p>
                              <p className="text-xs text-muted-foreground mt-1">แนะนำ 600x800px</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('cover', e.target.files[0])}
                          className="hidden"
                          aria-label="อัพโหลดรูปปก Visual Novel"
                        />
                      </div>
                    </div>

                    {/* Banner Image */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        รูปแบนเนอร์
                      </label>
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <div className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
                          {bannerPreview ? (
                            <Image src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" width={400} height={225} />
                          ) : (
                            <div className="text-center">
                              <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">คลิกเพื่ออัพโหลด</p>
                              <p className="text-xs text-muted-foreground mt-1">แนะนำ 1920x1080px</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('banner', e.target.files[0])}
                          className="hidden"
                          aria-label="อัพโหลดรูปแบนเนอร์"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Form Fields */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Novel Title */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Type className="w-4 h-4 text-pink-500" />
                        ชื่อเรื่อง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground placeholder-muted-foreground text-lg font-medium"
                        placeholder="ใส่ชื่อ Visual Novel ที่น่าสนใจ..."
                        disabled={isLoading}
                        required
                      />
                    </div>

                    {/* Slug */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Globe className="w-4 h-4 text-green-500" />
                        Slug (URL) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => handleInputChange('slug', e.target.value)}
                          className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground placeholder-muted-foreground font-mono text-sm"
                          placeholder="my-visual-novel"
                          disabled={isLoading}
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <span className="text-xs text-muted-foreground">/novels/{formData.slug || 'slug'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Slug จะถูกสร้างอัตโนมัติจากชื่อเรื่อง หรือคุณสามารถแก้ไขได้เอง
                      </p>
                    </div>

                    {/* Pen Name Dropdown */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <PenTool className="w-4 h-4 text-blue-500" />
                        นามปากกา <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPenNameDropdownOpen(!penNameDropdownOpen)}
                          className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground flex items-center justify-between"
                          disabled={isLoading}
                        >
                          <span className={formData.penName ? 'text-foreground' : 'text-muted-foreground'}>
                            {formData.penName || 'เลือกนามปากกา...'}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${penNameDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {penNameDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-10 backdrop-blur-sm">
                            {availablePenNames.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  handleInputChange('penName', name);
                                  setPenNameDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Type */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Palette className="w-4 h-4 text-purple-500" />
                        ประเภทเนื้อหา
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {contentTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleInputChange('contentType', type.value)}
                              className={`p-3 rounded-xl border transition-all duration-300 ${
                                formData.contentType === type.value
                            ? `border-primary bg-primary/10 ${type.color}`
                            : 'border-border hover:border-muted-foreground hover:bg-secondary/50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-2 ${
                                formData.contentType === type.value ? 'text-white' : 'text-muted-foreground'
                              }`} />
                              <p className={`text-xs font-medium ${
                                formData.contentType === type.value ? 'text-white' : 'text-muted-foreground'
                              }`}>
                                {type.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ending Type */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <Clock className="w-4 h-4 text-green-500" />
                        รูปแบบการจบ
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {endingTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleInputChange('endingType', type.value)}
                            className={`p-3 rounded-xl border transition-all duration-300 ${
                              formData.endingType === type.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-muted-foreground hover:bg-secondary/50'
                            }`}
                          >
                            <div className="text-2xl mb-2">{type.icon}</div>
                            <p className={`text-xs font-medium ${
                              formData.endingType === type.value ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {type.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Synopsis */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        เรื่องย่อ
                      </label>
                      <textarea
                        value={formData.synopsis}
                        onChange={(e) => handleInputChange('synopsis', e.target.value)}
                        className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground placeholder-muted-foreground resize-none"
                        placeholder="เขียนเรื่องย่อที่ดึงดูดใจ..."
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Categories Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Main Theme */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                          <Tag className="w-4 h-4 text-indigo-500" />
                          หมวดหมู่หลัก
                        </label>
                        {loadingCategories ? (
                          <div className="w-full px-4 py-4 bg-background border border-border rounded-xl flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground text-sm">กำลังโหลด...</span>
                          </div>
                        ) : (
                          <select
                            value={formData.mainThemeId}
                            onChange={(e) => handleInputChange('mainThemeId', e.target.value)}
                            className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground"
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
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                          <Globe className="w-4 h-4 text-teal-500" />
                          ภาษา
                        </label>
                        {loadingCategories ? (
                          <div className="w-full px-4 py-4 bg-background border border-border rounded-xl flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground text-sm">กำลังโหลด...</span>
                          </div>
                        ) : (
                          <select
                            value={formData.languageId}
                            onChange={(e) => handleInputChange('languageId', e.target.value)}
                            className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground"
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

                      {/* Age Rating */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                          <Users className="w-4 h-4 text-amber-500" />
                          เรทติ้ง
                        </label>
                        {loadingCategories ? (
                          <div className="w-full px-4 py-4 bg-background border border-border rounded-xl flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground text-sm">กำลังโหลด...</span>
                          </div>
                        ) : (
                          <select
                            value={formData.ageRating}
                            onChange={(e) => handleInputChange('ageRating', e.target.value)}
                            className="w-full px-4 py-4 bg-background border border-input-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-300 text-foreground"
                            disabled={isLoading}
                          >
                            <option value="">เลือกเรทติ้ง</option>
                            {ageRatings.map((rating) => (
                              <option key={rating._id} value={rating._id}>
                                {rating.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">เกี่ยวกับการสร้าง Visual Novel:</p>
                      <ul className="space-y-1 text-sm">
                        <li>• นิยายที่สร้างใหม่จะอยู่ในสถานะ &quot;ฉบับร่าง&quot; และเป็นส่วนตัว</li>
                        <li>• คุณสามารถเพิ่มตอน สร้างตัวละคร และออกแบบเส้นทางเรื่องได้ภายหลัง</li>
                        <li>• รูปภาพทั้งหมดจะถูกประมวลผลและปรับขนาดอัตโนมัติ</li>
                        <li>• Visual Novel รองรับการมีปฏิสัมพันธ์และการเลือกที่หลากหลาย</li>
                        <li>• ระบบจะสร้างแผนผังเรื่อง (StoryMap) เริ่มต้นให้อัตโนมัติ</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-border">
                  <motion.button
                    type="button"
                    onClick={handleClose}
                    className="px-8 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    ยกเลิก
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground px-10 py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    disabled={isLoading || !formData.title.trim() || !formData.slug.trim() || !formData.penName.trim() || !formData.synopsis.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังสร้าง...
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="w-5 h-5" />
                        สร้าง Visual Novel
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}