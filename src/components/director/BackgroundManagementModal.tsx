// components/director/BackgroundManagementModal.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Upload,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Palette,
  Monitor
} from 'lucide-react';

interface Background {
  id: string;
  name: string;
  description: string;
  type: 'image' | 'color' | 'gradient';
  value: string; // URL for image, color code for color/gradient
  tags: string[];
  createdAt: string;
}

interface BackgroundManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgrounds: Background[];
  onBackgroundAdd: (background: Omit<Background, 'id' | 'createdAt'>) => void;
  onBackgroundUpdate: (id: string, background: Partial<Background>) => void;
  onBackgroundDelete: (id: string) => void;
}

const BackgroundManagementModal: React.FC<BackgroundManagementModalProps> = ({
  isOpen,
  onClose,
  backgrounds,
  onBackgroundAdd,
  onBackgroundUpdate,
  onBackgroundDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBackground, setSelectedBackground] = useState<Background | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundType, setBackgroundType] = useState<'image' | 'color' | 'gradient'>('image');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    value: '',
    type: 'image' as 'image' | 'color' | 'gradient'
  });

  // Predefined colors and gradients
  const predefinedColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const predefinedGradients = [
    'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(45deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(45deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)'
  ];

  // Filter backgrounds based on search
  const filteredBackgrounds = backgrounds.filter(background =>
    background.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    background.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    background.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', 'background');
      formData.append('tags', 'background,scene,visual-novel');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({ ...prev, value: result.data.secure_url, type: 'image' }));
        setBackgroundType('image');
        toast.success('รูปพื้นหลังอัปโหลดสำเร็จ!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`เกิดข้อผิดพลาดในการอัปโหลด: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('กรุณาใส่ชื่อพื้นหลัง');
      return;
    }

    if (!formData.value.trim()) {
      toast.error('กรุณาเลือกหรือใส่ค่าพื้นหลัง');
      return;
    }

    const backgroundData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      value: formData.value,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    if (selectedBackground && isEditing) {
      onBackgroundUpdate(selectedBackground.id, backgroundData);
      toast.success('อัปเดตพื้นหลังสำเร็จ!');
    } else {
      onBackgroundAdd(backgroundData);
      toast.success('เพิ่มพื้นหลังสำเร็จ!');
    }

    // Reset form
    setFormData({ name: '', description: '', tags: '', value: '', type: 'image' });
    setSelectedBackground(null);
    setIsEditing(false);
    setBackgroundType('image');
  }, [formData, selectedBackground, isEditing, onBackgroundAdd, onBackgroundUpdate]);

  const handleEdit = useCallback((background: Background) => {
    setSelectedBackground(background);
    setIsEditing(true);
    setFormData({
      name: background.name,
      description: background.description,
      tags: background.tags.join(', '),
      value: background.value,
      type: background.type
    });
    setBackgroundType(background.type);
  }, []);

  const handleDelete = useCallback((background: Background) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบพื้นหลัง "${background.name}"?`)) {
      onBackgroundDelete(background.id);
      toast.success('ลบพื้นหลังสำเร็จ!');
      if (selectedBackground?.id === background.id) {
        setSelectedBackground(null);
        setIsEditing(false);
        setFormData({ name: '', description: '', tags: '', value: '', type: 'image' });
        setBackgroundType('image');
      }
    }
  }, [selectedBackground, onBackgroundDelete]);

  const resetForm = useCallback(() => {
    setFormData({ name: '', description: '', tags: '', value: '', type: 'image' });
    setSelectedBackground(null);
    setIsEditing(false);
    setBackgroundType('image');
  }, []);

  const renderBackgroundPreview = (background: Background) => {
    switch (background.type) {
      case 'image':
        return (
          <img 
            src={background.value} 
            alt={background.name}
            className="w-full h-full object-cover"
          />
        );
      case 'color':
        return (
          <div 
            className="w-full h-full"
            style={{ backgroundColor: background.value }}
          />
        );
      case 'gradient':
        return (
          <div 
            className="w-full h-full"
            style={{ background: background.value }}
          />
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            จัดการพื้นหลัง
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Background List */}
          <div className="w-1/2 border-r flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาพื้นหลัง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Background Grid */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Add New Background Card */}
                <Card 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer transition-colors"
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">เพิ่มพื้นหลังใหม่</span>
                  </CardContent>
                </Card>

                {/* Background Cards */}
                {filteredBackgrounds.map((background) => (
                  <Card 
                    key={background.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBackground?.id === background.id 
                        ? 'ring-2 ring-orange-500 shadow-lg' 
                        : ''
                    }`}
                    onClick={() => setSelectedBackground(background)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 overflow-hidden border">
                        {renderBackgroundPreview(background)}
                      </div>
                      <h4 className="font-medium text-sm truncate mb-1">{background.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                        {background.description || 'ไม่มีคำอธิบาย'}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={background.type === 'image' ? 'default' : background.type === 'color' ? 'secondary' : 'outline'} className="text-xs">
                          {background.type === 'image' ? 'รูปภาพ' : background.type === 'color' ? 'สี' : 'ไล่สี'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {background.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {background.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{background.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredBackgrounds.length === 0 && searchQuery && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>ไม่พบพื้นหลังที่ค้นหา</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Background Form */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800">
              <h3 className="font-medium flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit className="w-4 h-4" />
                    แก้ไขพื้นหลัง
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    เพิ่มพื้นหลังใหม่
                  </>
                )}
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Background Type Tabs */}
                <Tabs value={backgroundType} onValueChange={(value) => {
                  setBackgroundType(value as 'image' | 'color' | 'gradient');
                  setFormData(prev => ({ ...prev, type: value as 'image' | 'color' | 'gradient', value: '' }));
                }}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="image" className="gap-2">
                      <ImageIcon className="w-4 h-4" />
                      รูปภาพ
                    </TabsTrigger>
                    <TabsTrigger value="color" className="gap-2">
                      <Palette className="w-4 h-4" />
                      สี
                    </TabsTrigger>
                    <TabsTrigger value="gradient" className="gap-2">
                      <Monitor className="w-4 h-4" />
                      ไล่สี
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="space-y-4">
                    {/* Image Upload */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">รูปพื้นหลัง</Label>
                      {formData.value && formData.type === 'image' && (
                        <div className="relative w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-3">
                          <img 
                            src={formData.value} 
                            alt="Background preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                            onClick={() => setFormData(prev => ({ ...prev, value: '' }))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(file);
                          };
                          input.click();
                        }}
                        className="w-full gap-2"
                      >
                        {isUploading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="color" className="space-y-4">
                    {/* Color Picker */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">เลือกสี</Label>
                      <div className="space-y-3">
                        <Input
                          type="color"
                          value={formData.value || '#000000'}
                          onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                          className="w-full h-12"
                        />
                        
                        {/* Predefined Colors */}
                        <div className="grid grid-cols-5 gap-2">
                          {predefinedColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-full h-8 rounded border-2 transition-all ${
                                formData.value === color ? 'border-blue-500 scale-110' : 'border-slate-200 dark:border-slate-600'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setFormData(prev => ({ ...prev, value: color }))}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="gradient" className="space-y-4">
                    {/* Gradient Picker */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">เลือกไล่สี</Label>
                      <div className="space-y-3">
                        <Input
                          value={formData.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                          placeholder="เช่น linear-gradient(45deg, #667eea 0%, #764ba2 100%)"
                        />
                        
                        {/* Predefined Gradients */}
                        <div className="grid grid-cols-2 gap-2">
                          {predefinedGradients.map((gradient, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`w-full h-12 rounded border-2 transition-all ${
                                formData.value === gradient ? 'border-blue-500 scale-105' : 'border-slate-200 dark:border-slate-600'
                              }`}
                              style={{ background: gradient }}
                              onClick={() => setFormData(prev => ({ ...prev, value: gradient }))}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Background Name */}
                <div>
                  <Label htmlFor="background-name" className="text-sm font-medium">
                    ชื่อพื้นหลัง *
                  </Label>
                  <Input
                    id="background-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ใส่ชื่อพื้นหลัง..."
                    required
                  />
                </div>

                {/* Background Description */}
                <div>
                  <Label htmlFor="background-description" className="text-sm font-medium">
                    คำอธิบาย
                  </Label>
                  <Textarea
                    id="background-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="อธิบายลักษณะหรือการใช้งานของพื้นหลัง..."
                    rows={3}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="background-tags" className="text-sm font-medium">
                    แท็ก (คั่นด้วยจุลภาค)
                  </Label>
                  <Input
                    id="background-tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="เช่น outdoor, indoor, fantasy, modern..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {isEditing ? 'อัปเดตพื้นหลัง' : 'เพิ่มพื้นหลัง'}
                  </Button>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                    >
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </form>
            </ScrollArea>

            {/* Background Actions */}
            {selectedBackground && (
              <div className="p-4 border-t bg-slate-50 dark:bg-slate-800">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(selectedBackground)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedBackground)}
                    className="flex-1 gap-2 bg-red-500 hover:bg-red-600 text-white border-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundManagementModal;
