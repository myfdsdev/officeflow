import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useTypingIndicator(user, conversationId, conversationType) {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!user || !conversationId) return;

    const unsubscribe = base44.entities.TypingIndicator.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const indicator = event.data;
        
        // Only show typing indicators for this conversation
        if (indicator.conversation_id !== conversationId) return;
        
        // Don't show own typing
        if (indicator.user_id === user.id) return;
        
        if (indicator.is_typing) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.user_id === indicator.user_id);
            if (existing) return prev;
            return [...prev, indicator];
          });

          // Auto-remove after 3 seconds of no update
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== indicator.user_id));
          }, 3000);
        } else {
          setTypingUsers(prev => prev.filter(u => u.user_id !== indicator.user_id));
        }
      }
    });

    return unsubscribe;
  }, [user, conversationId]);

  // Send typing indicator
  const sendTypingIndicator = async (isTyping = true) => {
    if (!user || !conversationId) return;

    // Throttle to max once per second
    const now = Date.now();
    if (now - lastTypingTimeRef.current < 1000) return;
    lastTypingTimeRef.current = now;

    try {
      // Check if indicator exists
      const existing = await base44.entities.TypingIndicator.filter({
        user_id: user.id,
        conversation_id: conversationId
      });

      const data = {
        user_id: user.id,
        user_name: user.full_name,
        conversation_id: conversationId,
        conversation_type: conversationType,
        is_typing: isTyping,
        last_typing_time: new Date().toISOString()
      };

      if (existing && existing.length > 0) {
        await base44.entities.TypingIndicator.update(existing[0].id, data);
      } else {
        await base44.entities.TypingIndicator.create(data);
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  };

  const stopTyping = async () => {
    if (!user || !conversationId) return;

    try {
      const existing = await base44.entities.TypingIndicator.filter({
        user_id: user.id,
        conversation_id: conversationId
      });

      if (existing && existing.length > 0) {
        await base44.entities.TypingIndicator.update(existing[0].id, {
          is_typing: false
        });
      }
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  };

  return {
    typingUsers,
    sendTypingIndicator,
    stopTyping
  };
}