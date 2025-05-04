// src/components/layouts/FormSuccess.tsx
"use client";

import { Check } from "lucide-react";

interface FormSuccessProps {
  message?: string;
}

export default function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 
                  rounded-lg p-3 flex items-start gap-2 text-green-600 dark:text-green-400 mb-4">
      <Check size={18} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}