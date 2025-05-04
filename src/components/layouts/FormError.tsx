// src/components/layouts/FormError.tsx
"use client";

import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                  rounded-lg p-3 flex items-start gap-2 text-red-600 dark:text-red-400 mb-4">
      <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}