import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { UserCircle, Upload, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";

const departments = [
  "Engineering",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "IT",
  "Customer Support",
  "Other"
];

export default function CompleteProfile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    mobile_number: '',
    employee_id: '',
    department: '',
    profile_photo: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setFormData({
        mobile_number: userData.mobile_number || '',
        employee_id: userData.employee_id || '',
        department: userData.department || '',
        profile_photo: userData.profile_photo || '',
      });
    });
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      window.location.href = createPageUrl('Dashboard');
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_photo: file_url });
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.mobile_number || !formData.employee_id) {
      alert('Please fill in mobile number and employee ID');
      return;
    }

    if (!formData.department) {
      alert('Please select your department');
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const isProfileComplete = user?.mobile_number && user?.employee_id && user?.department;
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
              {isProfileComplete ? 'Update Your Profile' : 'Complete Your Profile'}
            </CardTitle>
            <p className="text-gray-500 mt-2">
              {isProfileComplete 
                ? 'Keep your information up to date' 
                : 'Please provide your details to get started'
              }
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 border-4 border-indigo-100">
                  {formData.profile_photo ? (
                    <AvatarImage src={formData.profile_photo} alt={user.full_name} />
                  ) : (
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl font-semibold">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('photo-upload').click()}
                      className="cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  </label>
                </div>
              </div>

              {/* Full Name (Read-only) */}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={user.full_name}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Contact admin to change your name</p>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    required
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <Label>Employee ID *</Label>
                  <Input
                    placeholder="EMP001"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-base py-6"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : isProfileComplete ? 'Update Profile' : 'Complete Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}