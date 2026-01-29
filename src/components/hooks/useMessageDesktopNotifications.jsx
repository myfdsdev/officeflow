import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useMessageDesktopNotifications(user) {
  useEffect(() => {
    if (!user) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    // Request notification permission immediately
    const requestPermission = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission requested:', permission);
      } else {
        console.log('Notification permission status:', Notification.permission);
      }
    };

    requestPermission();

    // Helper to check if user is in active chat
    const isInActiveChat = (senderId, groupId) => {
      const currentPath = window.location.pathname;
      const currentUrl = window.location.href;
      
      // Check if in Direct Messages page with this sender
      if (currentPath.includes('DirectMessages') && senderId) {
        const urlParams = new URLSearchParams(window.location.search);
        const activeUserId = urlParams.get('userId');
        return activeUserId === senderId;
      }
      
      // Check if in Groups page with this group
      if (currentPath.includes('Groups') && groupId) {
        return currentUrl.includes(groupId);
      }
      
      return false;
    };

    // Subscribe to Direct Messages
    const unsubscribeDM = base44.entities.Message.subscribe((event) => {
      console.log('Message event received:', event.type);
      
      if (event.type === 'create' && event.data) {
        const message = event.data;
        console.log('New message for notification check:', {
          receiver: message.receiver_id,
          sender: message.sender_id,
          currentUser: user.id,
          permission: Notification.permission
        });
        
        // Only show notification if message is for this user and not sent by them
        if (message.receiver_id === user.id && message.sender_id !== user.id) {
          console.log('Message is for current user');
          
          // Don't show if user is in active chat with sender
          if (isInActiveChat(message.sender_id, null)) {
            console.log('User is in active chat, skipping notification');
            return;
          }
          
          // Don't show if document is focused on that chat
          if (document.hasFocus() && isInActiveChat(message.sender_id, null)) {
            console.log('Document is focused on chat, skipping notification');
            return;
          }

          console.log('Attempting to show notification, permission:', Notification.permission);

          if (Notification.permission === 'granted') {
            console.log('Creating notification...');
            try {
              const notif = new Notification('AttendEase - New Message', {
                body: `${message.sender_name}: ${message.message_text.substring(0, 100)}`,
                icon: '/logo.png',
                badge: '/badge.png',
                tag: `dm-${message.id}`,
                requireInteraction: false,
                silent: false,
                data: {
                  type: 'direct_message',
                  senderId: message.sender_id,
                  messageId: message.id
                }
              });

              console.log('Notification created successfully');

              // Auto close after 8 seconds
              setTimeout(() => notif.close(), 8000);

              // Handle click
              notif.onclick = () => {
                window.focus();
                window.location.href = `/DirectMessages?userId=${message.sender_id}`;
                notif.close();
              };
            } catch (error) {
              console.error('Error creating notification:', error);
            }
          } else {
            console.log('Notification permission not granted:', Notification.permission);
          }
        }
      }
    });

    // Subscribe to Group Messages
    const unsubscribeGM = base44.entities.GroupMessage.subscribe((event) => {
      console.log('Group message event received:', event.type);
      
      if (event.type === 'create' && event.data) {
        const message = event.data;
        console.log('New group message for notification check:', {
          sender: message.sender_id,
          currentUser: user.id,
          groupId: message.group_id,
          permission: Notification.permission
        });
        
        // Only show notification if not sent by this user
        if (message.sender_id !== user.id) {
          console.log('Group message not sent by current user');
          
          // Don't show if user is in active group chat
          if (isInActiveChat(null, message.group_id)) {
            console.log('User is in active group chat, skipping notification');
            return;
          }
          
          // Don't show if document is focused on that group
          if (document.hasFocus() && isInActiveChat(null, message.group_id)) {
            console.log('Document is focused on group, skipping notification');
            return;
          }

          // Check if user is member of this group
          base44.entities.GroupMember.filter({
            group_id: message.group_id,
            user_id: user.id
          }).then(members => {
            console.log('Group membership check:', members?.length || 0);
            if (members && members.length > 0) {
              if (Notification.permission === 'granted') {
                console.log('Creating group notification...');
                try {
                  const notif = new Notification('AttendEase - Group Message', {
                    body: `${message.group_name}\n${message.sender_name}: ${message.message_text.substring(0, 100)}`,
                    icon: '/logo.png',
                    badge: '/badge.png',
                    tag: `group-${message.id}`,
                    requireInteraction: false,
                    silent: false,
                    data: {
                      type: 'group_message',
                      groupId: message.group_id,
                      messageId: message.id
                    }
                  });

                  console.log('Group notification created successfully');

                  // Auto close after 8 seconds
                  setTimeout(() => notif.close(), 8000);

                  // Handle click
                  notif.onclick = () => {
                    window.focus();
                    window.location.href = `/Groups?groupId=${message.group_id}`;
                    notif.close();
                  };
                } catch (error) {
                  console.error('Error creating group notification:', error);
                }
              } else {
                console.log('Notification permission not granted for group:', Notification.permission);
              }
            }
          }).catch(err => {
            console.error('Error checking group membership:', err);
          });
        }
      }
    });

    // Cleanup
    return () => {
      unsubscribeDM();
      unsubscribeGM();
    };
  }, [user]);
}