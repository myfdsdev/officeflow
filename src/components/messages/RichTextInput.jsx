import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Code,
  Image,
  Smile,
  Mic,
  Video,
  Send,
  Paperclip,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function RichTextInput({ value, onChange, onSend, disabled, placeholder = "Type a message..." }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '💪', '❤️', '🔥', '✨', '🎉', '🎊', '💯'];

  const applyFormatting = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText || 'underlined text'}__`;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText || 'strikethrough text'}~~`;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'code':
        formattedText = `\`${selectedText || 'code'}\``;
        break;
      case 'list':
        formattedText = `\n- ${selectedText || 'list item'}`;
        break;
      case 'ordered-list':
        formattedText = `\n1. ${selectedText || 'list item'}`;
        break;
      default:
        return;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange({ target: { value: newValue } });
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertEmoji = (emoji) => {
    const newValue = value + emoji;
    onChange({ target: { value: newValue } });
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend(e);
      }
    }
  };

  return (
    <div className="border rounded-lg bg-gray-50">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-white rounded-t-lg">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('underline')}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('strikethrough')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('link')}
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('list')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('ordered-list')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => applyFormatting('code')}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      {/* Text Input Area */}
      <div className="px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent border-0 focus:outline-none resize-none min-h-[60px] max-h-[200px] text-gray-900 placeholder:text-gray-400"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-white rounded-b-lg">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Attach File"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Attach Image"
          >
            <Image className="w-4 h-4" />
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

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Voice Message"
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500"
            title="Video Message"
          >
            <Video className="w-4 h-4" />
          </Button>
        </div>

        <Button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="bg-indigo-600 hover:bg-indigo-700 h-8"
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}