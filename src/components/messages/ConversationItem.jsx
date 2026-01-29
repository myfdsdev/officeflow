import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Volume2, VolumeX } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import OnlineStatusIndicator from '../admin/OnlineStatusIndicator';

export default function ConversationItem({ 
  conversation, 
  isActive, 
  onClick, 
  unreadCount = 0,
  isMuted = false 
}) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
        isActive
          ? 'bg-indigo-50 border-l-4 border-indigo-600'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        {conversation.type === 'group' ? (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        ) : (
          <>
            <Avatar className="w-10 h-10">
              {conversation.profile_photo ? (
                <AvatarImage src={conversation.profile_photo} alt={conversation.name} />
              ) : (
                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-semibold">
                  {getInitials(conversation.name)}
                </AvatarFallback>
              )}
            </Avatar>
            {conversation.is_online !== undefined && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineStatusIndicator isOnline={conversation.is_online} size="sm" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`font-medium truncate ${
              isActive ? 'text-indigo-600' : 'text-gray-900'
            }`}>
              {conversation.name}
            </h3>
            {isMuted && (
              <VolumeX className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
          </div>
          {conversation.last_message_time && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatTime(conversation.last_message_time)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${
            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
          }`}>
            {conversation.last_message || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <Badge className="bg-indigo-600 text-white text-xs px-2 py-0.5 flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}