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
      }
    };

    requestPermission();

    // Get user settings
    const checkSettings = async () => {
      const settings = await base44.entities.UserSettings.filter({ user_id: user.id });
      return settings && settings.length > 0 ? settings[0] : null;
    };

    // Check if in DND mode
    const isInDND = (settings) => {
      if (!settings || !settings.dnd_enabled) return false;
      
      if (!settings.dnd_start_time || !settings.dnd_end_time) return false;
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      return currentTime >= settings.dnd_start_time && currentTime <= settings.dnd_end_time;
    };

    // Subscribe to Message (DM) notifications
    const unsubscribeDM = base44.entities.Message.subscribe(async (event) => {
      if (event.type !== 'create') return;
      
      const message = event.data;
      
      // Don't notify for own messages
      if (message.sender_id === user.id) return;
      
      // Only notify if I'm the receiver
      if (message.receiver_id !== user.id) return;
      
      // Check user settings
      const settings = await checkSettings();
      
      if (!settings || !settings.desktop_notifications_enabled) return;
      if (isInDND(settings)) return;
      
      // Check if conversation is muted
      if (settings.muted_conversations && settings.muted_conversations.includes(message.sender_id)) {
        return;
      }
      
      // Check if user is currently in this chat
      const currentPath = window.location.pathname;
      const currentParams = new URLSearchParams(window.location.search);
      const currentUserId = currentParams.get('userId');
      
      if (currentPath === '/DirectMessages' && currentUserId === message.sender_id) {
        // User is already viewing this conversation
        return;
      }
      
      // Show notification
      if (Notification.permission === 'granted') {
        const notificationBody = message.message_text.length > 50 
          ? message.message_text.substring(0, 50) + '...' 
          : message.message_text;
        
        const desktopNotif = new Notification('AttendEase', {
          body: `${message.sender_name}\n${notificationBody}`,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: `dm-${message.id}`,
          requireInteraction: false,
          silent: false,
          data: {
            type: 'dm',
            senderId: message.sender_id,
            messageId: message.id
          }
        });

        setTimeout(() => desktopNotif.close(), 8000);

        desktopNotif.onclick = () => {
          window.focus();
          window.location.href = `/DirectMessages?userId=${message.sender_id}`;
          desktopNotif.close();
        };
      }
    });

    // Subscribe to GroupMessage notifications
    const unsubscribeGroup = base44.entities.GroupMessage.subscribe(async (event) => {
      if (event.type !== 'create') return;
      
      const message = event.data;
      
      // Don't notify for own messages
      if (message.sender_id === user.id) return;
      
      // Check if user is a member of this group
      const membership = await base44.entities.GroupMember.filter({
        group_id: message.group_id,
        user_id: user.id
      });
      
      if (!membership || membership.length === 0) return;
      
      // Check user settings
      const settings = await checkSettings();
      
      if (!settings || !settings.desktop_notifications_enabled) return;
      if (isInDND(settings)) return;
      
      // Check if group is muted
      if (settings.muted_conversations && settings.muted_conversations.includes(message.group_id)) {
        return;
      }
      
      // Check if user is currently in this group chat
      const currentPath = window.location.pathname;
      const currentParams = new URLSearchParams(window.location.search);
      const currentGroupId = currentParams.get('groupId');
      
      if (currentPath === '/DirectMessages' && currentGroupId === message.group_id) {
        // User is already viewing this group conversation
        return;
      }
      
      // Check if user is @mentioned
      const isMentioned = message.message_text.includes(`@${user.full_name}`) || 
                         message.message_text.includes(`@${user.email}`);
      
      // Show notification
      if (Notification.permission === 'granted') {
        const notificationBody = message.message_text.length > 50 
          ? message.message_text.substring(0, 50) + '...' 
          : message.message_text;
        
        const title = isMentioned ? 'AttendEase - You were mentioned' : 'AttendEase';
        const body = `${message.sender_name} (${message.group_name})\n${notificationBody}`;
        
        const desktopNotif = new Notification(title, {
          body: body,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: `group-${message.id}`,
          requireInteraction: isMentioned, // Keep mentioned notifications until dismissed
          silent: false,
          data: {
            type: 'group',
            groupId: message.group_id,
            messageId: message.id
          }
        });

        if (!isMentioned) {
          setTimeout(() => desktopNotif.close(), 8000);
        }

        desktopNotif.onclick = () => {
          window.focus();
          window.location.href = `/DirectMessages?groupId=${message.group_id}`;
          desktopNotif.close();
        };
      }
    });

    // Subscribe to broadcast notifications (via Notification entity)
    const unsubscribeBroadcast = base44.entities.Notification.subscribe(async (event) => {
      if (event.type !== 'create') return;
      if (event.data?.user_email !== user.email) return;
      
      const notification = event.data;
      
      // Only handle broadcast type
      if (notification.type !== 'broadcast') return;
      
      // Check user settings
      const settings = await checkSettings();
      
      if (!settings || !settings.desktop_notifications_enabled) return;
      if (isInDND(settings)) return;
      
      // Show notification
      if (Notification.permission === 'granted') {
        const desktopNotif = new Notification('AttendEase - Broadcast', {
          body: `${notification.title}\n${notification.message}`,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: `broadcast-${notification.id}`,
          requireInteraction: true, // Broadcast messages stay until dismissed
          silent: false,
          data: {
            type: 'broadcast',
            notificationId: notification.id
          }
        });

        desktopNotif.onclick = () => {
          window.focus();
          desktopNotif.close();
        };
      }
    });

    return () => {
      unsubscribeDM();
      unsubscribeGroup();
      unsubscribeBroadcast();
    };
  }, [user]);
}