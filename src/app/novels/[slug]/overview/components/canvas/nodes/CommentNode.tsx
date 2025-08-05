"use client";

import React, { useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { MessageSquare, Edit2, Check, X } from 'lucide-react';

interface CommentNodeData {
  nodeId: string;
  title: string;
  nodeType: string;
  nodeSpecificData?: {
    commentText: string;
  };
  scenes?: any[];
  characters?: any[];
  onSceneSelect?: (sceneId: string) => void;
  onModeSwitch?: (mode: 'director', sceneId?: string) => void;
}

const CommentNode = ({ data, selected }: { data: CommentNodeData; selected?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.nodeSpecificData?.commentText || '');
  
  const commentText = data.nodeSpecificData?.commentText || 'Add your notes here...';

  const handleSave = () => {
    // Here you would typically update the node data
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(data.nodeSpecificData?.commentText || '');
    setIsEditing(false);
  };

  return (
    <div className={`comment-node bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl shadow-lg transition-all duration-200 ${
      selected ? 'shadow-xl scale-105 border-yellow-400 dark:border-yellow-500' : ''
    }`}>
      <div className="p-4 min-w-[200px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Note
            </span>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
              rows={4}
              placeholder="Enter your notes..."
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
            {commentText}
          </div>
        )}
      </div>

      {/* Post-it note styling */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-200 dark:bg-yellow-800 transform rotate-45 shadow-sm" />
    </div>
  );
};

export default CommentNode;