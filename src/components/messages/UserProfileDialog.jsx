import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, User, Shield } from "lucide-react";
import { format } from "date-fns";

export default function UserProfileDialog({ open, onClose, user }) {
  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar className="w-24 h-24 bg-indigo-100 text-indigo-600">
                {user.profile_photo ? (
                  <AvatarImage src={user.profile_photo} alt={user.full_name} />
                ) : (
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${user.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900">{user.full_name}</h3>
            <p className="text-sm text-gray-500 mb-2">{user.email}</p>
            
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <Badge className="bg-indigo-100 text-indigo-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              <Badge variant={user.is_online ? "default" : "secondary"}>
                {user.is_online ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{user.phone}</p>
                </div>
              </div>
            )}

            {user.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{user.location}</p>
                </div>
              </div>
            )}

            {user.created_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(user.created_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {user.last_active_time && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Last Active</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(user.last_active_time), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}