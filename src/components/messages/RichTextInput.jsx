import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Smile,
  Send,
  Paperclip,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function RichTextInput({ value, onChange, onSend, disabled, placeholder = "Type a message..." }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '💪', '❤️', '🔥', '✨', '🎉', '🎊', '💯'];

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['link'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'link', 'list', 'bullet'
  ];

  const insertEmoji = (emoji) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, emoji);
      quill.setSelection(range.index + emoji.length);
    }
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        if (type === 'image') {
          quill.insertEmbed(range.index, 'image', file_url);
        } else {
          quill.insertText(range.index, `📎 ${file.name}`, 'link', file_url);
        }
        quill.setSelection(range.index + 1);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const quill = quillRef.current?.getEditor();
      const text = quill?.getText().trim();
      if (text) {
        onSend(e);
      }
    }
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="rich-text-editor">
        <ReactQuill
          ref={quillRef}
          value={value}
          onChange={(content) => onChange({ target: { value: content } })}
          onKeyDown={handleKeyDown}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
          theme="snow"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-gray-50">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files[0], 'file')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Attach File"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Attach Image"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500"
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2">
              <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                {emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Button
          type="button"
          onClick={onSend}
          disabled={disabled || uploading}
          className="bg-indigo-600 hover:bg-indigo-700"
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>

      <style jsx global>{`
        .rich-text-editor .ql-container {
          border: none;
          font-size: 14px;
          min-height: 80px;
          max-height: 200px;
          overflow-y: auto;
        }
        .rich-text-editor .ql-editor {
          padding: 12px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: #fafafa;
        }
      `}</style>
    </div>
  );
}