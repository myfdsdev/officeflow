import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, Moon } from "lucide-react";

export default function NotificationSettings({ user, open, onClose }) {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const result = await base44.entities.UserSettings.filter({ user_id: user.id });
      return result && result.length > 0 ? result[0] : null;
    },
    enabled: !!user && open
  });

  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStartTime, setDndStartTime] = useState('22:00');
  const [dndEndTime, setDndEndTime] = useState('08:00');

  useEffect(() => {
    if (settings) {
      setDesktopEnabled(settings.desktop_notifications_enabled ?? true);
      setDndEnabled(settings.dnd_enabled ?? false);
      setDndStartTime(settings.dnd_start_time || '22:00');
      setDndEndTime(settings.dnd_end_time || '08:00');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return await base44.entities.UserSettings.update(settings.id, data);
      } else {
        return await base44.entities.UserSettings.create({
          user_id: user.id,
          user_email: user.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSettings', user.id]);
      onClose();
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      desktop_notifications_enabled: desktopEnabled,
      dnd_enabled: dndEnabled,
      dnd_start_time: dndStartTime,
      dnd_end_time: dndEndTime
    });
  };

  if (isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Desktop Notifications</Label>
                <p className="text-xs text-gray-500">Show system notifications</p>
              </div>
            </div>
            <Switch
              checked={desktopEnabled}
              onCheckedChange={setDesktopEnabled}
            />
          </div>

          {/* Do Not Disturb */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-500" />
                <div>
                  <Label className="text-sm font-medium">Do Not Disturb</Label>
                  <p className="text-xs text-gray-500">Silence notifications during set hours</p>
                </div>
              </div>
              <Switch
                checked={dndEnabled}
                onCheckedChange={setDndEnabled}
              />
            </div>

            {dndEnabled && (
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="time"
                    value={dndStartTime}
                    onChange={(e) => setDndStartTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Label className="text-xs">To</Label>
                  <Input
                    type="time"
                    value={dndEndTime}
                    onChange={(e) => setDndEndTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}