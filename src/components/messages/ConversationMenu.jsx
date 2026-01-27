import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  User,
  MessageSquare,
  Star,
  Copy,
  Search,
  Columns,
  ExternalLink,
  EyeOff,
} from "lucide-react";

export default function ConversationMenu({ selectedUser, onAction }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onAction('view-profile')}>
          <User className="w-4 h-4 mr-2" />
          View full profile
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('star')}>
          <Star className="w-4 h-4 mr-2" />
          Star conversation
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('copy')}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('search')}>
          <Search className="w-4 h-4 mr-2" />
          Search in conversation
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('split-view')}>
          <Columns className="w-4 h-4 mr-2" />
          Open in split view
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('new-window')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in new window
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('hide')} className="text-red-600">
          <EyeOff className="w-4 h-4 mr-2" />
          Hide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}