// components/director/CharacterManagementModal.tsx
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
import { toast } from 'sonner';
import {
  Upload,
  User,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';

interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  createdAt: string;
}

interface CharacterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onCharacterAdd: (character: Omit<Character, 'id' | 'createdAt'>) => void;
  onCharacterUpdate: (id: string, character: Partial<Character>) => void;
  onCharacterDelete: (id: string) => void;
}

const CharacterManagementModal: React.FC<CharacterManagementModalProps> = ({
  isOpen,
  onClose,
  characters,
  onCharacterAdd,
  onCharacterUpdate,
  onCharacterDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    imageUrl: ''
  });

  // Filter characters based on search
  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    character.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    character.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', 'character');
      formData.append('tags', 'character,visual-novel');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({ ...prev, imageUrl: result.data.secure_url }));
        toast.success('รูปภาพอัปโหลดสำเร็จ!');
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
      toast.error('กรุณาใส่ชื่อตัวละคร');
      return;
    }

    const characterData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      imageUrl: formData.imageUrl,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    if (selectedCharacter && isEditing) {
      onCharacterUpdate(selectedCharacter.id, characterData);
      toast.success('อัปเดตตัวละครสำเร็จ!');
    } else {
      onCharacterAdd(characterData);
      toast.success('เพิ่มตัวละครสำเร็จ!');
    }

    // Reset form
    setFormData({ name: '', description: '', tags: '', imageUrl: '' });
    setSelectedCharacter(null);
    setIsEditing(false);
  }, [formData, selectedCharacter, isEditing, onCharacterAdd, onCharacterUpdate]);

  const handleEdit = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setIsEditing(true);
    setFormData({
      name: character.name,
      description: character.description,
      tags: character.tags.join(', '),
      imageUrl: character.imageUrl || ''
    });
  }, []);

  const handleDelete = useCallback((character: Character) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบตัวละคร "${character.name}"?`)) {
      onCharacterDelete(character.id);
      toast.success('ลบตัวละครสำเร็จ!');
      if (selectedCharacter?.id === character.id) {
        setSelectedCharacter(null);
        setIsEditing(false);
        setFormData({ name: '', description: '', tags: '', imageUrl: '' });
      }
    }
  }, [selectedCharacter, onCharacterDelete]);

  const resetForm = useCallback(() => {
    setFormData({ name: '', description: '', tags: '', imageUrl: '' });
    setSelectedCharacter(null);
    setIsEditing(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            จัดการตัวละคร
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Character List */}
          <div className="w-1/2 border-r flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาตัวละคร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Character Grid */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Add New Character Card */}
                <Card 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">เพิ่มตัวละครใหม่</span>
                  </CardContent>
                </Card>

                {/* Character Cards */}
                {filteredCharacters.map((character) => (
                  <Card 
                    key={character.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCharacter?.id === character.id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : ''
                    }`}
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 overflow-hidden">
                        {character.imageUrl ? (
                          <img 
                            src={character.imageUrl} 
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate mb-1">{character.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                        {character.description || 'ไม่มีคำอธิบาย'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {character.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {character.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{character.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredCharacters.length === 0 && searchQuery && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>ไม่พบตัวละครที่ค้นหา</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Character Form */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800">
              <h3 className="font-medium flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit className="w-4 h-4" />
                    แก้ไขตัวละคร
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    เพิ่มตัวละครใหม่
                  </>
                )}
              </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Character Image */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">รูปภาพตัวละคร</Label>
                  <div className="space-y-3">
                    {formData.imageUrl && (
                      <div className="relative w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                        <img 
                          src={formData.imageUrl} 
                          alt="Character preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
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
                        className="gap-2"
                      >
                        {isUploading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Character Name */}
                <div>
                  <Label htmlFor="character-name" className="text-sm font-medium">
                    ชื่อตัวละคร *
                  </Label>
                  <Input
                    id="character-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ใส่ชื่อตัวละคร..."
                    required
                  />
                </div>

                {/* Character Description */}
                <div>
                  <Label htmlFor="character-description" className="text-sm font-medium">
                    คำอธิบาย
                  </Label>
                  <Textarea
                    id="character-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="อธิบายลักษณะ บุคลิก หรือบทบาทของตัวละคร..."
                    rows={4}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="character-tags" className="text-sm font-medium">
                    แท็ก (คั่นด้วยจุลภาค)
                  </Label>
                  <Input
                    id="character-tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="เช่น protagonist, hero, magical..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {isEditing ? 'อัปเดตตัวละคร' : 'เพิ่มตัวละคร'}
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

            {/* Character Actions */}
            {selectedCharacter && (
              <div className="p-4 border-t bg-slate-50 dark:bg-slate-800">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(selectedCharacter)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedCharacter)}
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

export default CharacterManagementModal;
