import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useDesktopNotifications(user) {
  useEffect(() => {
    if (!user) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    // Request notification permission
    const requestPermission = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } else {
        console.log('Notification permission status:', Notification.permission);
      }
    };

    requestPermission();

    // Subscribe to notification changes
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        const notification = event.data;
        
        console.log('New notification received:', notification.title);
        
        if (Notification.permission === 'granted') {
          const desktopNotif = new Notification(notification.title, {
            body: notification.message,
            requireInteraction: false,
            silent: false,
          });

          // Auto close after 5 seconds
          setTimeout(() => desktopNotif.close(), 5000);

          // Optional: Handle notification click
          desktopNotif.onclick = () => {
            window.focus();
            desktopNotif.close();
          };
        } else {
          console.log('Notification permission not granted. Current status:', Notification.permission);
        }
      }
    });

    return unsubscribe;
  }, [user]);
}