import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const ACTIVITY_INTERVAL = 120000; // Update every 2 minutes (reduced from 30s to avoid rate limits)
const INACTIVITY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours - effectively disabling auto checkout

export function useUserActivity(user) {
  const activityTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const updateOnlineStatus = async (isOnline) => {
    if (!user?.email) return;
    
    try {
      await base44.auth.updateMe({
        is_online: isOnline,
        last_active_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  };

  const autoCheckOut = async () => {
    // Auto check-out disabled - users must manually check out
    return;
  };

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      updateOnlineStatus(false);
      autoCheckOut();
    }, INACTIVITY_THRESHOLD);
  };

  const handleActivity = () => {
    resetInactivityTimer();
  };

  useEffect(() => {
    if (!user?.email) return;

    // Set user as online when component mounts
    updateOnlineStatus(true);

    // Set up periodic activity updates
    activityTimerRef.current = setInterval(() => {
      updateOnlineStatus(true);
    }, ACTIVITY_INTERVAL);

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial inactivity timer
    resetInactivityTimer();

    // Handle page visibility change
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        updateOnlineStatus(false);
        // Don't auto checkout on visibility change, only on prolonged inactivity
      } else {
        updateOnlineStatus(true);
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Beforeunload auto-checkout disabled - users must manually check out

    // Cleanup
    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Set offline when unmounting
      updateOnlineStatus(false);
    };
  }, [user?.email, user?.id]);
}