import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

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

    // Helper function to check if user is viewing a specific conversation
    const isViewingConversation = (type, id) => {
      const currentPath = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      if (type === 'direct' && currentPath.includes('DirectMessages')) {
        const activeUserId = params.get('userId');
        return activeUserId === id && document.hasFocus();
      }
      
      if (type === 'group' && currentPath.includes('Groups')) {
        const activeGroupId = params.get('groupId');
        return activeGroupId === id && document.hasFocus();
      }
      
      return false;
    };

    // Helper function to show desktop notification
    const showNotification = (title, body, icon, data) => {
      if (Notification.permission !== 'granted') return;
      
      const options = {
        body,
        icon: icon || '/logo.png',
        badge: '/badge.png',
        requireInteraction: false,
        silent: false,
        tag: data.tag,
        data
      };

      const desktopNotif = new Notification(title, options);

      // Auto close after 8 seconds
      setTimeout(() => desktopNotif.close(), 8000);

      // Handle notification click
      desktopNotif.onclick = () => {
        window.focus();
        
        if (data.navigateUrl) {
          window.location.href = data.navigateUrl;
        }
        
        desktopNotif.close();
      };
    };

    // Subscribe to Direct Messages
    const unsubscribeMessages = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const message = event.data;
        
        // Don't notify if message is from current user
        if (message.sender_id === user.id) return;
        
        // Check if user is the recipient
        if (message.receiver_id !== user.id) return;
        
        // Don't notify if user is viewing this conversation
        if (isViewingConversation('direct', message.sender_id)) return;
        
        // Show desktop notification
        showNotification(
          'AttendEase',
          `${message.sender_name}\n${message.message_text}`,
          null,
          {
            tag: `dm-${message.id}`,
            messageId: message.id,
            senderId: message.sender_id,
            navigateUrl: `${createPageUrl('DirectMessages')}?userId=${message.sender_id}`
          }
        );
      }
    });

    // Subscribe to Group Messages
    const unsubscribeGroupMessages = base44.entities.GroupMessage.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        const message = event.data;
        
        // Don't notify if message is from current user
        if (message.sender_id === user.id) return;
        
        // Don't notify if user is viewing this group chat
        if (isViewingConversation('group', message.group_id)) return;
        
        // Check if user is member of this group
        base44.entities.GroupMember.filter({
          group_id: message.group_id,
          user_id: user.id
        }).then(members => {
          if (members && members.length > 0) {
            // Show desktop notification
            showNotification(
              'AttendEase',
              `${message.sender_name} in ${message.group_name}\n${message.message_text}`,
              null,
              {
                tag: `group-${message.id}`,
                messageId: message.id,
                groupId: message.group_id,
                navigateUrl: `${createPageUrl('Groups')}?groupId=${message.group_id}`
              }
            );
          }
        });
      }
    });

    // Subscribe to System Notifications (Leave approvals, reminders, etc.)
    const unsubscribeNotifications = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === user.email) {
        const notification = event.data;
        
        // Show desktop notification for system notifications
        showNotification(
          notification.title,
          notification.message,
          null,
          {
            tag: `notif-${notification.id}`,
            notificationId: notification.id,
            notificationType: notification.type,
            navigateUrl: notification.type === 'leave_approved' || notification.type === 'leave_rejected' 
              ? createPageUrl('LeaveRequests')
              : createPageUrl('Dashboard')
          }
        );
      }
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeMessages();
      unsubscribeGroupMessages();
      unsubscribeNotifications();
    };
  }, [user]);
}