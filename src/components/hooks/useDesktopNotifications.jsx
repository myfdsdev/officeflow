import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useDesktopNotifications(user) {
  useEffect(() => {
    if (!user) return;

    // Request notification permission
    const requestPermission = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
    };

    requestPermission();

    // Subscribe to notification changes
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        const notification = event.data;
        
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.png',
            tag: notification.id,
            badge: '/badge.png',
          });
        }
      }
    });

    return unsubscribe;
  }, [user]);
}