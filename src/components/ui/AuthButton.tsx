// src/components/ui/AuthButton.tsx
"use client";

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import AuthModal from '@/components/layouts/AuthModal';

export default function AuthButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 px-8 py-3 font-medium text-primary-foreground 
                  bg-primary rounded-full shadow-lg hover:bg-primary/90 transform hover:scale-105 
                  transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 
                  focus:ring-offset-2 focus:ring-offset-background"
      >
        <LogIn size={20} />
        <span>Sign In</span>
      </button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}