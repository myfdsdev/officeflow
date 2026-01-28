import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function RichTextInput({ onSend, disabled, placeholder = "Type a message..." }) {
  const [value, setValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '💪', '❤️', '🔥', '✨', '🎉', '🎊', '💯'];

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'blockquote', 'code-block',
    'list', 'bullet',
    'link'
  ];

  const insertEmoji = (emoji) => {
    const newValue = value + emoji;
    setValue(newValue);
    setShowEmojiPicker(false);
  };

  const handleSend = () => {
    const plainText = value.replace(/<[^>]*>/g, '').trim();
    if (plainText) {
      onSend(plainText);
      setValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border rounded-lg bg-gray-50 overflow-hidden">
      <ReactQuill
        value={value}
        onChange={setValue}
        modules={modules}
        formats={formats}
        theme="snow"
        placeholder={placeholder}
        readOnly={disabled}
        onKeyDown={handleKeyDown}
        className="bg-white"
        style={{ height: '120px' }}
      />

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-white">
        <div className="flex items-center gap-1">
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
          onClick={handleSend}
          disabled={!value.replace(/<[^>]*>/g, '').trim() || disabled}
          className="bg-indigo-600 hover:bg-indigo-700 h-9 px-4"
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  );
}