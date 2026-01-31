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

    console.log('🔔 Message notifications hook initialized for user:', user.email);
    console.log('🔔 Current notification permission:', Notification.permission);

    // Helper to check if user is in active chat
    const isInActiveChat = (senderId, groupId) => {
      const currentPath = window.location.pathname;
      
      // Check if in Direct Messages page - users select from sidebar, no URL params
      // If on DirectMessages page, we can't easily detect active user without state
      // So we'll check if window is focused - if focused on DM page, likely reading
      if (currentPath.includes('DirectMessages') && senderId && document.hasFocus()) {
        // User is on DM page and window is focused, likely in active conversation
        return true;
      }
      
      // Check if in Groups page with this group
      if (currentPath.includes('Groups') && groupId && document.hasFocus()) {
        // User is on Groups page and window is focused, likely in active conversation
        return true;
      }
      
      return false;
    };

    // Subscribe to Direct Messages
    const unsubscribeDM = base44.entities.Message.subscribe((event) => {
      console.log('🔔 DM Event:', event.type, event.data);
      
      if (event.type === 'create' && event.data) {
        const message = event.data;
        
        // Only show notification if message is for this user and not sent by them
        if (message.receiver_id === user.id && message.sender_id !== user.id) {
          console.log('✅ Message for me! Checking conditions...');
          
          // Don't show if user is in active chat with sender
          if (isInActiveChat(message.sender_id, null)) {
            console.log('⏭️ Skip: In active chat');
            return;
          }

          console.log('🔔 Permission:', Notification.permission);

          if (Notification.permission === 'granted') {
            console.log('✅ Creating notification NOW...');
            try {
              const notif = new Notification('💬 New Message', {
                body: `${message.sender_name}: ${message.message_text.substring(0, 100)}`,
                icon: '/logo.png',
                tag: `dm-${message.id}`,
                requireInteraction: false
              });

              console.log('✅ Notification created!');

              setTimeout(() => notif.close(), 8000);

              notif.onclick = async () => {
                window.focus();
                
                // Mark notification as read
                await base44.entities.Notification.filter({
                  user_email: user.email,
                  type: 'new_message',
                  is_read: false
                }).then(notifs => {
                  const relatedNotif = notifs.find(n => n.related_id === message.id);
                  if (relatedNotif) {
                    base44.entities.Notification.update(relatedNotif.id, { is_read: true });
                  }
                });
                
                // Mark message as read
                await base44.entities.Message.update(message.id, { is_read: true });
                
                // Store sender info in localStorage for DirectMessages page to auto-select
                localStorage.setItem('dm_auto_select', JSON.stringify({
                  userId: message.sender_id,
                  userName: message.sender_name,
                  userEmail: message.sender_email,
                  timestamp: Date.now()
                }));
                
                // Navigate to DirectMessages page
                window.location.href = '/DirectMessages';
                notif.close();
              };
              
              notif.onerror = (err) => {
                console.error('❌ Notification error:', err);
              };
            } catch (error) {
              console.error('❌ Notification creation failed:', error);
            }
          } else {
            console.log('❌ Permission NOT granted:', Notification.permission);
          }
        } else {
          console.log('⏭️ Skip: Not for me or sent by me');
        }
      }
    });

    // Subscribe to Group Messages
    const unsubscribeGM = base44.entities.GroupMessage.subscribe((event) => {
      console.log('🔔 Group Event:', event.type, event.data);
      
      if (event.type === 'create' && event.data) {
        const message = event.data;
        
        // Only show notification if not sent by this user
        if (message.sender_id !== user.id) {
          console.log('✅ Group message not by me!');
          
          // Don't show if user is in active group chat
          if (isInActiveChat(null, message.group_id)) {
            console.log('⏭️ Skip: In active group');
            return;
          }

          // Check if user is member of this group
          base44.entities.GroupMember.filter({
            group_id: message.group_id,
            user_id: user.id
          }).then(members => {
            if (members && members.length > 0 && Notification.permission === 'granted') {
              console.log('✅ Creating group notification NOW...');
              
              // Check if it's a broadcast message
              const isBroadcast = message.message_text.startsWith('📢 BROADCAST:');
              const title = isBroadcast ? '📢 Admin Broadcast' : '👥 Group Message';
              
              try {
                const notif = new Notification(title, {
                  body: `${message.group_name}\n${message.sender_name}: ${message.message_text.substring(0, 100)}`,
                  icon: '/logo.png',
                  tag: `group-${message.id}`,
                  requireInteraction: false
                });

                console.log('✅ Group notification created!');

                setTimeout(() => notif.close(), 8000);

                notif.onclick = async () => {
                  window.focus();
                  
                  // Mark notification as read
                  await base44.entities.Notification.filter({
                    user_email: user.email,
                    type: 'new_message',
                    is_read: false
                  }).then(notifs => {
                    const relatedNotif = notifs.find(n => n.related_id === message.id);
                    if (relatedNotif) {
                      base44.entities.Notification.update(relatedNotif.id, { is_read: true });
                    }
                  });
                  
                  // Store group info in localStorage for DirectMessages page to auto-select
                  localStorage.setItem('dm_auto_select_group', JSON.stringify({
                    groupId: message.group_id,
                    groupName: message.group_name,
                    timestamp: Date.now()
                  }));
                  
                  // Navigate to DirectMessages page
                  window.location.href = '/DirectMessages';
                  notif.close();
                };
                
                notif.onerror = (err) => {
                  console.error('❌ Group notification error:', err);
                };
              } catch (error) {
                console.error('❌ Group notification failed:', error);
              }
            }
          }).catch(err => {
            console.error('❌ Group membership check failed:', err);
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