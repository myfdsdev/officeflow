import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const dots = [0, 1, 2];

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user_name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing`;
    } else {
      return `Multiple people are typing`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg"
    >
      <div className="flex items-center gap-1">
        {dots.map((dot) => (
          <motion.div
            key={dot}
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: dot * 0.2,
            }}
          />
        ))}
      </div>
      <span>{getTypingText()}…</span>
    </motion.div>
  );
}