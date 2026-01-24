import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ACTIVITY_INTERVAL = 30000; // Update every 30 seconds
const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function useUserActivity(user) {
  const activityTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);

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

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      updateOnlineStatus(false);
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
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
        resetInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
  }, [user?.email]);

  // Handle logout
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.email) {
        // Use sendBeacon for reliable offline status on page close
        const data = JSON.stringify({
          is_online: false,
          last_active_time: new Date().toISOString(),
        });
        
        navigator.sendBeacon('/api/user/status', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.email]);
}