import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useTypingIndicator(user, conversationId, conversationType = 'direct', isActive = true) {
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  // Clear typing status
  const clearTypingStatus = useCallback(async () => {
    if (!user || !conversationId || !isTyping) return;

    try {
      const typingRecords = await base44.asServiceRole.entities.Typing.filter({
        user_id: user.id,
        conversation_id: conversationId,
        conversation_type: conversationType,
      });

      if (typingRecords && typingRecords.length > 0) {
        for (const record of typingRecords) {
          await base44.asServiceRole.entities.Typing.delete(record.id);
        }
      }
      setIsTyping(false);
    } catch (error) {
      console.error('Error clearing typing status:', error);
    }
  }, [user, conversationId, conversationType, isTyping]);

  // Set typing status with debounce
  const setTyping = useCallback(async () => {
    if (!user || !conversationId || !isActive) return;

    try {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Check if typing record exists
      const existingRecords = await base44.asServiceRole.entities.Typing.filter({
        user_id: user.id,
        conversation_id: conversationId,
        conversation_type: conversationType,
      });

      if (existingRecords && existingRecords.length > 0) {
        // Update existing record
        await base44.asServiceRole.entities.Typing.update(existingRecords[0].id, {
          last_activity: new Date().toISOString(),
        });
      } else {
        // Create new typing record
        await base44.asServiceRole.entities.Typing.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          conversation_type: conversationType,
          conversation_id: conversationId,
          group_id: conversationType === 'group' ? conversationId : undefined,
          receiver_id: conversationType === 'direct' ? conversationId : undefined,
          last_activity: new Date().toISOString(),
        });
      }

      setIsTyping(true);

      // Set timeout to clear typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        clearTypingStatus();
      }, 2000);
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [user, conversationId, conversationType, isActive, clearTypingStatus]);

  // Clean up on unmount or when conversation changes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      clearTypingStatus();
    };
  }, [conversationId, clearTypingStatus]);

  // Clear typing when user goes offline
  useEffect(() => {
    if (!user?.is_online && isTyping) {
      clearTypingStatus();
    }
  }, [user?.is_online, isTyping, clearTypingStatus]);

  return { setTyping, clearTypingStatus, isTyping };
}

// Hook to fetch typing indicators
export function useTypingStatus(conversationId, conversationType = 'direct', currentUserId) {
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch typing users
    const fetchTypingUsers = async () => {
      try {
        const records = await base44.entities.Typing.filter({
          conversation_id: conversationId,
          conversation_type: conversationType,
        });

        // Filter out current user and expired records (older than 3 seconds)
        const now = new Date();
        const activeRecords = (records || []).filter(r => {
          const lastActivity = new Date(r.last_activity);
          const age = now - lastActivity;
          return r.user_id !== currentUserId && age < 3000;
        });

        setTypingUsers(activeRecords);
      } catch (error) {
        console.error('Error fetching typing status:', error);
      }
    };

    // Fetch immediately and then subscribe
    fetchTypingUsers();

    const unsubscribe = base44.entities.Typing.subscribe((event) => {
      if (event.data?.conversation_id === conversationId && 
          event.data?.conversation_type === conversationType) {
        fetchTypingUsers();
      }
    });

    // Poll every 1 second to check for expired records
    const interval = setInterval(fetchTypingUsers, 1000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [conversationId, conversationType, currentUserId]);

  return typingUsers;
}