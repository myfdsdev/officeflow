import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show prompt if permission is default (not asked yet)
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Show test notification
        new Notification('AttendEase Notifications Enabled! 🎉', {
          body: 'You will now receive desktop notifications for new messages.',
          icon: '/logo.png',
        });
        setShowPrompt(false);
      }
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  // Don't show if already granted
  if (permission === 'granted' && !showPrompt) {
    return null;
  }

  // Don't show if user closed the prompt
  if (!showPrompt && permission === 'default') {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <Card className="shadow-lg border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Enable Desktop Notifications</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Get notified when you receive new messages
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-2 -mr-2"
                  onClick={() => setShowPrompt(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {permission === 'denied' && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <BellOff className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-rose-700">
                      <p className="font-medium mb-1">Notifications Blocked</p>
                      <p className="text-xs">
                        Please enable notifications in your browser settings:
                      </p>
                      <ol className="text-xs mt-2 space-y-1 list-decimal list-inside">
                        <li>Click the lock icon in your browser's address bar</li>
                        <li>Find "Notifications" and change to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {permission === 'default' && (
                <Button 
                  onClick={requestPermission}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setShowPrompt(false)}
                className="w-full text-gray-600"
              >
                Maybe Later
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}