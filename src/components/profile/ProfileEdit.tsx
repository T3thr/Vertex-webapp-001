'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Camera } from 'lucide-react';

// Define validation schema using zod
const profileSchema = z.object({
  displayName: z.string().max(100, 'ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร').optional(),
  bio: z.string().max(500, 'ข้อความแนะนำตัวต้องไม่เกิน 500 ตัวอักษร').optional(),
  facebook: z.string().url('URL ไม่ถูกต้อง').max(2048, 'URL ยาวเกินไป').optional().or(z.literal('')),
  location: z.string().max(200, 'ที่อยู่ต้องไม่เกิน 200 ตัวอักษร').optional(),
  primaryPenName: z.string().max(50, 'นามปากกาหลักต้องไม่เกิน 50 ตัวอักษร').optional(),
  newPenName: z.string().max(50, 'นามปากกาต้องไม่เกิน 50 ตัวอักษร').optional().or(z.literal('')),
  editPenName: z.string().max(50, 'นามปากกาต้องไม่เกิน 50 ตัวอักษร').optional().or(z.literal('')),
  showTrophies: z.boolean().optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditProps {
  initialProfile: {
    userId: string;
    displayName?: string;
    penNames?: string[];
    primaryPenName?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    bio?: string;
    gender?: string;
    location?: string;
    websiteUrl?: string;
    showTrophies?: boolean;
  };
}

export default function ProfileEdit({ initialProfile }: ProfileEditProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialProfile.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [penNames, setPenNames] = useState<string[]>(initialProfile.penNames || []);
  const [showAddPenName, setShowAddPenName] = useState(false);
  const [editingPenName, setEditingPenName] = useState<string | null>(null);
  const [showEditPenName, setShowEditPenName] = useState(false);
  
  // Initialize react-hook-form with zod validation
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: initialProfile.displayName || '',
      bio: initialProfile.bio || '',
      facebook: initialProfile.websiteUrl || '',
      location: initialProfile.location || '',
      primaryPenName: initialProfile.primaryPenName || '',
      newPenName: '',
      editPenName: '',
      showTrophies: initialProfile.showTrophies !== undefined ? initialProfile.showTrophies : true
    }
  });
  
  // Watch for changes to newPenName
  const newPenNameValue = watch('newPenName');

  // No longer need handleChange as react-hook-form handles this

  // Handle checkbox changes for trophy display
  const handleCheckboxChange = (id: string, checked: boolean | string) => {
    // This would be implemented if we had trophy data
    console.log(`Trophy ${id} display set to ${checked}`);
  };
  
  // Handle adding a new pen name
  const handleAddPenName = () => {
    if (newPenNameValue && newPenNameValue.trim() !== '') {
      if (!penNames.includes(newPenNameValue.trim())) {
        setPenNames([...penNames, newPenNameValue.trim()]);
        setValue('newPenName', '');
        setShowAddPenName(false);
      } else {
        toast.error('นามปากกานี้มีอยู่แล้ว');
      }
    }
  };
  
  // Handle removing a pen name
  const handleRemovePenName = (penName: string) => {
    // Check if it's the primary pen name
    if (penName === watch('primaryPenName')) {
      toast.error('ไม่สามารถลบนามปากกาหลักได้ กรุณาเปลี่ยนนามปากกาหลักก่อน');
      return;
    }
    
    setPenNames(penNames.filter(name => name !== penName));
  };
  
  // Handle setting primary pen name
  const handleSetPrimaryPenName = (penName: string) => {
    setValue('primaryPenName', penName);
    toast.success(`ตั้ง "${penName}" เป็นนามปากกาหลักแล้ว`);
  };
  
  // Handle editing a pen name
  const handleEditPenNameStart = (penName: string) => {
    setEditingPenName(penName);
    setValue('editPenName', penName);
    setShowEditPenName(true);
  };
  
  // Handle save edited pen name
  const handleEditPenNameSave = () => {
    const newName = watch('editPenName')?.trim();
    const oldName = editingPenName;
    
    if (!newName || !oldName) {
      setShowEditPenName(false);
      setEditingPenName(null);
      return;
    }
    
    if (newName === oldName) {
      setShowEditPenName(false);
      setEditingPenName(null);
      return;
    }
    
    if (penNames.includes(newName)) {
      toast.error('นามปากกานี้มีอยู่แล้ว');
      return;
    }
    
    const newPenNames = penNames.map(name => name === oldName ? newName : name);
    setPenNames(newPenNames);
    
    // Update primary pen name if needed
    if (watch('primaryPenName') === oldName) {
      setValue('primaryPenName', newName);
    }
    
    toast.success(`แก้ไขนามปากกาจาก "${oldName}" เป็น "${newName}" สำเร็จ`);
    setShowEditPenName(false);
    setEditingPenName(null);
    setValue('editPenName', '');
  };
  
  // Handle cancel edit pen name
  const handleEditPenNameCancel = () => {
    setShowEditPenName(false);
    setEditingPenName(null);
    setValue('editPenName', '');
  };

  // Handle file upload for profile picture
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagePreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input click
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Save profile changes
  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add profile data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'newPenName') {
          formData.append(key, value.toString());
        }
      });
      
      // Add userId
      formData.append('userId', initialProfile.userId);
      
      // Add penNames as JSON string
      formData.append('penNames', JSON.stringify(penNames));

      // Add file if there's a new one
      if (fileInputRef.current?.files?.[0]) {
        formData.append('profileImage', fileInputRef.current.files[0]);
      }

      // Send to API
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์');
      }

      const updatedProfile = await response.json();
      
      // Update session if needed
      if (updatedProfile.avatarUrl !== (session?.user as any)?.image || 
          updatedProfile.primaryPenName !== session?.user?.name) {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: updatedProfile.primaryPenName || session?.user?.name,
            image: updatedProfile.avatarUrl || (session?.user as any)?.image
          }
        });
      }

      toast.success('อัปเดตโปรไฟล์สำเร็จ');
      
      // เด้งกลับไปยังหน้า Profile
      if (session?.user?.username) {
        router.push(`/u/${session.user.username}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์');
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>แก้ไขข้อมูล</CardTitle>
        <CardDescription>ปรับแต่งข้อมูลโปรไฟล์ของคุณ</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center mb-6">
            <div 
              className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer border-2 border-primary/50 hover:border-primary transition-colors"
              onClick={handleImageClick}
            >
              {imagePreview ? (
                <Image 
                  src={imagePreview} 
                  alt="รูปโปรไฟล์" 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <p className="text-sm text-muted-foreground mt-2">คลิกเพื่อเปลี่ยนรูปโปรไฟล์</p>
          </div>

          {/* ชื่อที่แสดง */}
          <div className="space-y-2">
            <Label htmlFor="displayName">ชื่อที่แสดง</Label>
            <Input 
              id="displayName"
              placeholder="ชื่อที่ต้องการแสดง"
              {...register('displayName')}
              aria-invalid={errors.displayName ? 'true' : 'false'}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>
            )}
          </div>

          {/* แนะนำตัว */}
          <div className="space-y-2">
            <Label htmlFor="bio">แนะนำตัว</Label>
            <Textarea 
              id="bio"
              placeholder="เขียนข้อความแนะนำตัวสั้นๆ"
              rows={5}
              {...register('bio')}
              aria-invalid={errors.bio ? 'true' : 'false'}
            />
            {errors.bio && (
              <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>
            )}
          </div>

          {/* ข้อมูลติดต่อ */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">ข้อมูลติดต่อ</h3>
            
            {/* Facebook */}
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input 
                id="facebook"
                placeholder="https://www.facebook.com/Divwy"
                {...register('facebook')}
                aria-invalid={errors.facebook ? 'true' : 'false'}
              />
              {errors.facebook && (
                <p className="text-sm text-destructive mt-1">{errors.facebook.message}</p>
              )}
            </div>
          </div>

          {/* นามปากกา */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">นามปากกา</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddPenName(!showAddPenName)}
              >
                {showAddPenName ? 'ยกเลิก' : 'เพิ่มนามปากกา'}
              </Button>
            </div>
            
            {showAddPenName && (
              <div className="flex items-center gap-2 mt-2">
                <Input 
                  placeholder="เพิ่มนามปากกาใหม่" 
                  {...register('newPenName')} 
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleAddPenName}
                  size="sm"
                >
                  เพิ่ม
                </Button>
              </div>
            )}
            
            {errors.newPenName && (
              <p className="text-sm text-destructive">{errors.newPenName.message}</p>
            )}
            
            {showEditPenName && (
              <div className="flex items-center gap-2 mt-4">
                <Input 
                  placeholder="แก้ไขนามปากกา" 
                  {...register('editPenName')} 
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={handleEditPenNameSave}
                    size="sm"
                  >
                    บันทึก
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleEditPenNameCancel}
                    size="sm"
                    variant="outline"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}
            
            {errors.editPenName && (
              <p className="text-sm text-destructive">{errors.editPenName.message}</p>
            )}
            
            <div className="space-y-2 mt-4">
              {penNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีนามปากกา</p>
              ) : (
                <div className="space-y-2">
                  {penNames.map((penName) => (
                    <div key={penName} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <span>{penName}</span>
                        {watch('primaryPenName') === penName && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">หลัก</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditPenNameStart(penName)}
                          disabled={showEditPenName}
                        >
                          แก้ไข
                        </Button>
                        {watch('primaryPenName') !== penName && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSetPrimaryPenName(penName)}
                          >
                            ตั้งเป็นหลัก
                          </Button>
                        )}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemovePenName(penName)}
                          className="text-destructive hover:text-destructive"
                        >
                          ลบ
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* แสดง Trophy */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">การตั้งค่าการแสดงผล</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="showTrophies" 
                checked={watch('showTrophies')} 
                onCheckedChange={(checked: boolean | string) => {
                  setValue('showTrophies', !!checked);
                }} 
              />
              <Label htmlFor="showTrophies">แสดงถ้วยรางวัลในหน้าโปรไฟล์</Label>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          type="submit" 
          form="profile-form"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          บันทึก
        </Button>
      </CardFooter>
    </Card>
  );
}