// src/components/dashboard/WriterApplicationForm.tsx
// ฟอร์มสมัครเป็นนักเขียน - อัพเกรดแล้ว
// รองรับ global.css theme system และมี interactive elements ที่สวยงาม
"use client";

import { 
    IWriterApplication, 
    WriterApplicationStatus, 
    WriterLevel, 
    WritingFrequency,
    IPortfolioItem 
} from "@/backend/models/WriterApplication"; // Ensure correct path and export
import { ICategory } from "@/backend/models/Category"; // For preferredGenres
import { motion, AnimatePresence } from "framer-motion";
import { useState, FormEvent, useEffect, useCallback } from "react";
import {
  PenTool, User as UserIcon, Mail, FileText, Star, Sparkles, CheckCircle, AlertCircle, Eye, EyeOff, Send, X, Coffee, BookOpen, Heart, Target, Zap, Award, Crown, Gift, Clock, Info, ArrowRight, ArrowLeft, Save, RefreshCw, PlusCircle, Trash2
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner"; // Assuming you have this

// Define Serialized types for props passed from Server to Client
interface SerializedPortfolioItem {
  title: string;
  url: string;
  description?: string;
}
interface SerializedWriterApplicationData extends Omit<IWriterApplication, '_id' | 'applicantId' | 'preferredGenres' | 'statusHistory' | 'reviewNotes' | 'applicantMessages' | 'portfolioItems' | 'submittedAt' | 'updatedAt' | 'reviewedAt'> {
  _id?: string; // Make it optional if new
  id?: string;
  applicantId: string;
  preferredGenres: string[]; // Array of Category IDs (strings)
  portfolioItems: SerializedPortfolioItem[];
  submittedAt?: string;
  updatedAt?: string;
  reviewedAt?: string;
  // statusHistory, reviewNotes, applicantMessages are usually not needed for form editing by user
}


interface WriterApplicationFormProps {
  userId: string;
  userEmail?: string; // Pre-fill contact email
  userDisplayName?: string; // Pre-fill display name suggestion
  existingApplication?: SerializedWriterApplicationData | null; // Use serialized type
  availableGenres: (Omit<ICategory, '_id'> & { _id: string, id: string })[]; // Pass available genres (serialized)
  onSubmitSuccess: (updatedApplication: IWriterApplication) => void; // Can remain IWriterApplication if API returns full
  onCancel: () => void;
}

interface FormData {
  displayName: string;
  aboutMe: string;
  contactEmail: string;
  writingExperience: string;
  visualNovelExperience: string;
  portfolioItems: IPortfolioItem[];
  preferredGenres: string[]; // Store as array of IDs
  sampleContent: string;
  writingFrequency: WritingFrequency | '';
  goalDescription: string;
  applicationReason: string;
  hasReadTerms: boolean;
}

// Animation variants
const formVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const inputVariants = {
  hover: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 10 } },
  focus: { scale: 1.01, borderColor: "var(--primary)", boxShadow: "0 0 0 2px var(--primary-focus)" },
};

// Component สำหรับ Input Field
interface FormFieldProps {
  label: string;
  name: keyof FormData | string; // for portfolio items
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  description?: string;
}

function FormField({ label, name, required = false, error, children, icon: Icon, description }: FormFieldProps) {
  return (
    <motion.div
      className="space-y-1" // Reduced space for tighter form
      variants={itemVariants}
    >
      <label htmlFor={name.toString()} className="block text-sm font-medium text-muted-foreground">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground/80 mb-1">{description}</p>
        )}
      </label>
      
      <div className="relative">
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </motion.div>
  );
}


export default function WriterApplicationForm({
  userId,
  userEmail,
  userDisplayName,
  existingApplication,
  availableGenres,
  onSubmitSuccess,
  onCancel,
}: WriterApplicationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    displayName: existingApplication?.displayName || userDisplayName || "",
    aboutMe: existingApplication?.aboutMe || "",
    contactEmail: existingApplication?.contactEmail || userEmail || "",
    writingExperience: existingApplication?.writingExperience || "",
    visualNovelExperience: existingApplication?.visualNovelExperience || "",
    portfolioItems: existingApplication?.portfolioItems?.map(p => ({...p})) || [], // Deep copy
    preferredGenres: existingApplication?.preferredGenres || [],
    sampleContent: existingApplication?.sampleContent || "",
    writingFrequency: existingApplication?.writingFrequency || '',
    goalDescription: existingApplication?.goalDescription || "",
    applicationReason: existingApplication?.applicationReason || "",
    hasReadTerms: existingApplication?.hasReadTerms || false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    switch (name) {
        case 'displayName':
            if (!value) return 'กรุณาระบุชื่อที่ต้องการแสดง (นามปากกา)';
            if (value.length < 2) return 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร';
            if (value.length > 50) return 'ชื่อต้องไม่เกิน 50 ตัวอักษร';
            if (!/^[ก-๙a-zA-Z0-9\s\-_.]+$/.test(value)) return 'ชื่อมีอักขระที่ไม่ได้รับอนุญาต';
            break;
        case 'contactEmail':
            if (value && !/.+\@.+\..+/.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง';
            break;
        case 'preferredGenres':
            if (!value || (Array.isArray(value) && value.length === 0)) return 'กรุณาเลือกอย่างน้อย 1 ประเภทนิยายที่สนใจ';
            break;
        case 'hasReadTerms':
            if (!value) return 'คุณต้องยืนยันว่าได้อ่านข้อกำหนดและเงื่อนไข';
            break;
        // Add more specific validations as needed
    }
    return undefined;
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue = value;
    if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked as any;
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    
    // Clear error for the field being changed
    if (fieldErrors[name as keyof FormData]) {
        setFieldErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const handlePortfolioChange = (index: number, field: keyof IPortfolioItem, value: string) => {
    const updatedPortfolio = [...formData.portfolioItems];
    updatedPortfolio[index] = { ...updatedPortfolio[index], [field]: value };
    setFormData((prev) => ({ ...prev, portfolioItems: updatedPortfolio }));
  };

  const addPortfolioItem = () => {
    if (formData.portfolioItems.length < 3) {
      setFormData((prev) => ({
        ...prev,
        portfolioItems: [...prev.portfolioItems, { title: "", url: "", description: "" }],
      }));
    }
  };

  const removePortfolioItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      portfolioItems: prev.portfolioItems.filter((_, i) => i !== index),
    }));
  };

  const handleGenreChange = (genreId: string) => {
    setFormData(prev => {
        const newPreferredGenres = prev.preferredGenres.includes(genreId)
            ? prev.preferredGenres.filter(id => id !== genreId)
            : [...prev.preferredGenres, genreId];
        
        // Validate preferredGenres after change
        if (fieldErrors.preferredGenres && newPreferredGenres.length > 0) {
            setFieldErrors(currentErrors => ({...currentErrors, preferredGenres: undefined}));
        }
        return {...prev, preferredGenres: newPreferredGenres};
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setFieldErrors({});
    setIsSuccess(false);

    // --- Client-side Validation ---
    const errors: Record<string, string> = {};
    (Object.keys(formData) as Array<keyof FormData>).forEach(key => {
        const error = validateField(key, formData[key]);
        if (error) {
            errors[key] = error;
        }
    });

    // Portfolio items validation
    formData.portfolioItems.forEach((item, index) => {
        if (!item.title) errors[`portfolioItems[${index}].title`] = 'กรุณาระบุชื่อผลงาน';
        if (!item.url) errors[`portfolioItems[${index}].url`] = 'กรุณาระบุ URL ผลงาน';
        else if (!/^https?:\/\/.+/.test(item.url)) errors[`portfolioItems[${index}].url`] = 'URL ไม่ถูกต้อง';
    });


    if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setIsLoading(false);
        setFormError("กรุณาแก้ไขข้อมูลในฟอร์มให้ถูกต้อง");
        return;
    }

    const payload = {
      ...formData,
      applicantId: userId, // Add userId to the payload
      // existingApplicationId: existingApplication?._id, // Send if updating
    };

    try {
      const response = await fetch( existingApplication?._id ? `/api/writer-applications/${existingApplication._id}` : '/api/writer-applications', {
        method: existingApplication?._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result.message || result.error || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
        if (result.errors) {
            // Assuming API returns field-specific errors like { fieldName: 'message' }
            setFieldErrors(result.errors);
        }
      } else {
        setIsSuccess(true);
        setFormError(null);
        onSubmitSuccess(result.application); // API should return the created/updated application
      }
    } catch (error) {
      console.error("Application submission error:", error);
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isSuccess) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 bg-card border border-border rounded-2xl shadow-lg"
        >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-card-foreground mb-2">ส่งใบสมัครสำเร็จ!</h3>
            <p className="text-muted-foreground mb-6">
                ทีมงานได้รับใบสมัครของคุณแล้ว และจะดำเนินการตรวจสอบโดยเร็วที่สุด 
                คุณสามารถตรวจสอบสถานะได้ในหน้า Dashboard
            </p>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel} // Assuming onCancel closes the form/modal
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors"
            >
                กลับสู่ Dashboard
            </motion.button>
        </motion.div>
    );
  }


  return (
    <AnimatePresence>
      <motion.form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div variants={itemVariants} className="text-center">
            <PenTool className="w-12 h-12 text-primary mx-auto mb-3"/>
            <h2 className="text-2xl sm:text-3xl font-bold text-card-foreground">
                {existingApplication?._id ? "แก้ไขใบสมัครนักเขียน" : "สมัครเป็นนักเขียน"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                ร่วมเป็นส่วนหนึ่งในการสร้างสรรค์เรื่องราวที่น่าประทับใจบน NovelMaze
            </p>
        </motion.div>

        {formError && (
          <motion.div 
            variants={itemVariants} 
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5"/>
            <span>{formError}</span>
          </motion.div>
        )}

        {/* Section 1: Basic Info */}
        <motion.fieldset variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
            <legend className="text-lg font-semibold text-primary mb-4 col-span-full flex items-center gap-2"><UserIcon className="w-5 h-5"/>ข้อมูลเบื้องต้น</legend>
            <FormField label="ชื่อที่ต้องการแสดง (นามปากกา)" name="displayName" required error={fieldErrors.displayName} icon={PenTool}>
                <motion.input variants={inputVariants} whileHover="hover" whileFocus="focus" type="text" name="displayName" id="displayName" value={formData.displayName} onChange={handleChange} className="input-form" maxLength={50} />
            </FormField>
            <FormField label="อีเมลติดต่อ (สำหรับการแจ้งเตือน)" name="contactEmail" error={fieldErrors.contactEmail} icon={Mail} description="หากไม่ระบุ จะใช้อีเมลหลักของบัญชี">
                <motion.input variants={inputVariants} whileHover="hover" whileFocus="focus" type="email" name="contactEmail" id="contactEmail" value={formData.contactEmail} onChange={handleChange} className="input-form" maxLength={100} />
            </FormField>
            <div className="md:col-span-2">
                <FormField label="แนะนำตัวเองสั้นๆ (About Me)" name="aboutMe" error={fieldErrors.aboutMe} icon={Sparkles} description="บอกเล่าความเป็นคุณให้ผู้อ่านรู้จัก (ไม่เกิน 500 ตัวอักษร)">
                    <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="aboutMe" id="aboutMe" value={formData.aboutMe} onChange={handleChange} rows={3} className="input-form" maxLength={500}></motion.textarea>
                </FormField>
            </div>
        </motion.fieldset>

        {/* Section 2: Writing Experience & Portfolio */}
        <motion.fieldset variants={itemVariants} className="border-t border-border pt-6 space-y-6">
            <legend className="text-lg font-semibold text-primary mb-4 col-span-full flex items-center gap-2"><BookOpen className="w-5 h-5"/>ประสบการณ์และผลงาน</legend>
            <FormField label="ประสบการณ์การเขียน (ถ้ามี)" name="writingExperience" error={fieldErrors.writingExperience} icon={FileText} description="เล่าถึงประสบการณ์การเขียนนิยาย บทความ หรืออื่นๆ (ไม่เกิน 500 ตัวอักษร)">
                <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="writingExperience" id="writingExperience" value={formData.writingExperience} onChange={handleChange} rows={3} className="input-form" maxLength={500}></motion.textarea>
            </FormField>
             <FormField label="ประสบการณ์เกี่ยวกับ Visual Novel (ถ้ามี)" name="visualNovelExperience" error={fieldErrors.visualNovelExperience} icon={Zap} description="เคยสร้าง อ่าน หรือมีส่วนร่วมกับ Visual Novel อย่างไรบ้าง (ไม่เกิน 500 ตัวอักษร)">
                <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="visualNovelExperience" id="visualNovelExperience" value={formData.visualNovelExperience} onChange={handleChange} rows={3} className="input-form" maxLength={500}></motion.textarea>
            </FormField>

            {/* Portfolio Items */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1"> <Star className="w-4 h-4 text-primary" /> ลิงก์ผลงาน (Portfolio - ไม่เกิน 3 รายการ) </div>
                    <p className="text-xs text-muted-foreground/80 mb-1">เช่น นิยายที่เคยเผยแพร่, บล็อก, ArtStation, GitHub ฯลฯ</p>
                </label>
                <AnimatePresence>
                {formData.portfolioItems.map((item, index) => (
                    <motion.div 
                        key={index} 
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 p-4 border border-border rounded-lg bg-background"
                        variants={itemVariants}
                        initial="hidden" animate="visible" exit="hidden"
                    >
                        <FormField label={`ชื่อผลงาน ${index + 1}`} name={`portfolioItems[${index}].title`} required error={(fieldErrors as any)[`portfolioItems[${index}].title`]}>
                            <motion.input variants={inputVariants} whileHover="hover" whileFocus="focus" type="text" value={item.title} onChange={(e) => handlePortfolioChange(index, "title", e.target.value)} className="input-form" maxLength={100}/>
                        </FormField>
                        <FormField label={`URL ผลงาน ${index + 1}`} name={`portfolioItems[${index}].url`} required error={(fieldErrors as any)[`portfolioItems[${index}].url`]}>
                             <motion.input variants={inputVariants} whileHover="hover" whileFocus="focus" type="url" value={item.url} onChange={(e) => handlePortfolioChange(index, "url", e.target.value)} className="input-form" maxLength={500}/>
                        </FormField>
                        <div className="sm:col-span-2">
                             <FormField label={`คำอธิบายสั้นๆ (ผลงาน ${index + 1})`} name={`portfolioItems[${index}].description`} error={(fieldErrors as any)[`portfolioItems[${index}].description`]}>
                                <motion.input variants={inputVariants} whileHover="hover" whileFocus="focus" type="text" value={item.description} onChange={(e) => handlePortfolioChange(index, "description", e.target.value)} className="input-form" maxLength={200}/>
                            </FormField>
                        </div>
                        <div className="sm:col-start-3 sm:row-start-1 flex items-end">
                             <motion.button type="button" onClick={() => removePortfolioItem(index)} className="btn-icon text-red-500 hover:text-red-700" whileHover={{scale:1.1}} whileTap={{scale:0.9}}>
                                <Trash2 size={20} /> <span className="sr-only">ลบผลงาน</span>
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
                {formData.portfolioItems.length < 3 && (
                    <motion.button type="button" onClick={addPortfolioItem} className="btn-secondary text-sm flex items-center gap-2" whileHover={{scale:1.05}} whileTap={{scale:0.95}}>
                        <PlusCircle size={18}/> เพิ่มลิงก์ผลงาน
                    </motion.button>
                )}
            </div>
        </motion.fieldset>

        {/* Section 3: Writing Preferences & Sample */}
        <motion.fieldset variants={itemVariants} className="border-t border-border pt-6 space-y-6">
            <legend className="text-lg font-semibold text-primary mb-4 col-span-full flex items-center gap-2"><Heart className="w-5 h-5"/>ความสนใจและตัวอย่างงานเขียน</legend>
            <div>
                <FormField label="ประเภทนิยายที่สนใจเขียน (เลือกอย่างน้อย 1 ประเภท)" name="preferredGenres" required error={fieldErrors.preferredGenres} icon={Award}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                        {availableGenres.map(genre => (
                            <motion.label 
                                key={genre._id} 
                                htmlFor={`genre-${genre._id}`}
                                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all duration-200
                                            ${formData.preferredGenres.includes(genre._id) 
                                                ? 'bg-primary/10 border-primary ring-2 ring-primary text-primary' 
                                                : 'bg-secondary/30 border-border hover:border-primary/50'}`}
                                whileHover={{y: -2, boxShadow: "0px 2px 8px rgba(var(--primary-rgb), 0.1)"}}
                            >
                                <input type="checkbox" id={`genre-${genre._id}`} name="preferredGenres" value={genre._id} checked={formData.preferredGenres.includes(genre._id)} onChange={() => handleGenreChange(genre._id)} className="hidden" />
                                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${formData.preferredGenres.includes(genre._id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {formData.preferredGenres.includes(genre._id) && <CheckCircle className="w-3 h-3 text-primary-foreground"/>}
                                </div>
                                <span className="text-xs sm:text-sm font-medium">{genre.name}</span>
                            </motion.label>
                        ))}
                    </div>
                </FormField>
            </div>
            <FormField label="ตัวอย่างผลงานเขียน (ไม่เกิน 2000 ตัวอักษร)" name="sampleContent" error={fieldErrors.sampleContent} icon={Coffee} description="อาจเป็นส่วนหนึ่งของนิยาย, บทนำ, หรือเรื่องสั้น เพื่อให้ทีมงานพิจารณาสไตล์การเขียนของคุณ">
                <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="sampleContent" id="sampleContent" value={formData.sampleContent} onChange={handleChange} rows={6} className="input-form" maxLength={2000}></motion.textarea>
            </FormField>
        </motion.fieldset>
        
        {/* Section 4: Goals & Commitment */}
        <motion.fieldset variants={itemVariants} className="border-t border-border pt-6 space-y-6">
            <legend className="text-lg font-semibold text-primary mb-4 col-span-full flex items-center gap-2"><Target className="w-5 h-5"/>เป้าหมายและความมุ่งมั่น</legend>
            <FormField label="ความถี่ในการเขียนนิยายโดยประมาณ" name="writingFrequency" error={fieldErrors.writingFrequency} icon={Clock}>
                <motion.select variants={inputVariants} whileHover="hover" whileFocus="focus" name="writingFrequency" id="writingFrequency" value={formData.writingFrequency} onChange={handleChange} className="input-form">
                    <option value="">-- กรุณาเลือก --</option>
                    {Object.values(WritingFrequency).map(freq => (
                        <option key={freq} value={freq}>
                            {freq === WritingFrequency.DAILY && "ทุกวัน"}
                            {freq === WritingFrequency.WEEKLY && "สัปดาห์ละครั้ง"}
                            {freq === WritingFrequency.BIWEEKLY && "สองสัปดาห์ครั้ง"}
                            {freq === WritingFrequency.MONTHLY && "เดือนละครั้ง"}
                            {freq === WritingFrequency.IRREGULAR && "ไม่แน่นอน"}
                        </option>
                    ))}
                </motion.select>
            </FormField>
            <FormField label="เป้าหมายในการเป็นนักเขียนบน NovelMaze" name="goalDescription" error={fieldErrors.goalDescription} icon={Crown} description="คุณคาดหวังอะไรจากการเป็นนักเขียนกับเรา (ไม่เกิน 500 ตัวอักษร)">
                 <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="goalDescription" id="goalDescription" value={formData.goalDescription} onChange={handleChange} rows={3} className="input-form" maxLength={500}></motion.textarea>
            </FormField>
            <FormField label="เหตุผลที่ต้องการเป็นนักเขียนกับ NovelMaze" name="applicationReason" error={fieldErrors.applicationReason} icon={Gift} description="ทำไมคุณถึงเลือก NovelMaze (ไม่เกิน 500 ตัวอักษร)">
                 <motion.textarea variants={inputVariants} whileHover="hover" whileFocus="focus" name="applicationReason" id="applicationReason" value={formData.applicationReason} onChange={handleChange} rows={3} className="input-form" maxLength={500}></motion.textarea>
            </FormField>
        </motion.fieldset>

        {/* Section 5: Terms and Submission */}
        <motion.div variants={itemVariants} className="border-t border-border pt-8 space-y-6">
            <div className="flex items-start gap-3">
                <input type="checkbox" id="hasReadTerms" name="hasReadTerms" checked={formData.hasReadTerms} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <div className="flex-1">
                    <label htmlFor="hasReadTerms" className="text-sm font-medium text-card-foreground">
                        ฉันได้อ่านและยอมรับ <a href="/terms/writer" target="_blank" className="text-primary hover:underline font-semibold">ข้อกำหนดและเงื่อนไขสำหรับนักเขียน</a> ของ NovelMaze แล้ว <span className="text-red-500">*</span>
                    </label>
                    {fieldErrors.hasReadTerms && <p className="mt-1 text-xs text-red-500">{fieldErrors.hasReadTerms}</p>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <X size={18}/> ยกเลิก
                </motion.button>
                <motion.button
                    type="submit"
                    disabled={isLoading || !formData.hasReadTerms}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(var(--primary-rgb), 0.3)" }}
                    whileTap={{ scale: 0.97 }}
                >
                    {isLoading ? <LoadingSpinner size="small" /> : <Send size={18}/>}
                    {existingApplication?._id ? "บันทึกการแก้ไข" : "ส่งใบสมัคร"}
                </motion.button>
            </div>
        </motion.div>
      </motion.form>
    </AnimatePresence>
  );
}