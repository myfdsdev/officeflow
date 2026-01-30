import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Save, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    office_start_time: '09:00',
    office_end_time: '18:00',
    late_threshold_minutes: 15,
    half_day_hours: 4,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Fetch company settings
        if (userData && userData.role === 'admin') {
          const companies = await base44.entities.Company.filter({ owner_id: userData.id });
          if (companies && companies.length > 0) {
            const companyData = companies[0];
            setCompany(companyData);
            setSettings({
              office_start_time: companyData.office_start_time || '09:00',
              office_end_time: companyData.office_end_time || '18:00',
              late_threshold_minutes: companyData.late_threshold_minutes || 15,
              half_day_hours: companyData.half_day_hours || 4,
              working_days: companyData.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSettings();
  }, []);

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, {
        office_start_time: settings.office_start_time,
        office_end_time: settings.office_end_time,
        late_threshold_minutes: settings.late_threshold_minutes,
        half_day_hours: settings.half_day_hours,
        working_days: settings.working_days,
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure office hours, attendance rules, and holidays</p>
        </motion.div>

        <div className="space-y-6">
          {/* Office Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Office Hours
                </CardTitle>
                <CardDescription>Set standard office working hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={settings.office_start_time}
                      onChange={(e) => setSettings({ ...settings, office_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={settings.office_end_time}
                      onChange={(e) => setSettings({ ...settings, office_end_time: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-indigo-600" />
                  Attendance Rules
                </CardTitle>
                <CardDescription>Configure late arrival and half-day rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Late Threshold (minutes after start time)</Label>
                  <Input
                    type="number"
                    value={settings.late_threshold_minutes}
                    onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) })}
                    min="1"
                    max="60"
                  />
                  <p className="text-xs text-gray-500">
                    Employees checking in after this time will be marked as late
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Half Day Hours</Label>
                  <Input
                    type="number"
                    value={settings.half_day_hours}
                    onChange={(e) => setSettings({ ...settings, half_day_hours: parseInt(e.target.value) })}
                    min="1"
                    max="8"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500">
                    Working less than this many hours will be marked as half day
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Working Days */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Working Days
                </CardTitle>
                <CardDescription>Select which days of the week are working days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const dayLower = day.toLowerCase();
                    const isSelected = settings.working_days.includes(dayLower);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            setSettings({
                              ...settings,
                              working_days: settings.working_days.filter(d => d !== dayLower)
                            });
                          } else {
                            setSettings({
                              ...settings,
                              working_days: [...settings.working_days, dayLower]
                            });
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600 font-semibold'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end"
          >
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}