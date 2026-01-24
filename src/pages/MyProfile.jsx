import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { User, Mail, Phone, Building, IdCard, Shield, Upload, Save } from "lucide-react";

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

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
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
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setIsEditing(false);
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
    updateProfileMutation.mutate(formData);
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your personal information</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm md:col-span-1">
            <CardContent className="p-6 text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-indigo-100">
                {user.profile_photo ? (
                  <AvatarImage src={user.profile_photo} alt={user.full_name} />
                ) : (
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-3xl font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{user.full_name}</h2>
              <p className="text-gray-500 text-sm mb-3">{user.email}</p>
              <Badge className={user.role === 'admin' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"}>
                {user.role === 'admin' ? (
                  <><Shield className="w-3 h-3 mr-1" /> Admin</>
                ) : (
                  <><User className="w-3 h-3 mr-1" /> Employee</>
                )}
              </Badge>

              <div className="mt-6 space-y-3 text-left">
                {user.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{user.department}</span>
                  </div>
                )}
                {user.employee_id && (
                  <div className="flex items-center gap-3 text-sm">
                    <IdCard className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{user.employee_id}</span>
                  </div>
                )}
                {user.mobile_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{user.mobile_number}</span>
                  </div>
                )}
              </div>

              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700"
                >
                  Edit Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="border-0 shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-col items-center gap-3 pb-4 border-b">
                    <Avatar className="w-20 h-20 border-4 border-indigo-100">
                      {formData.profile_photo ? (
                        <AvatarImage src={formData.profile_photo} alt={user.full_name} />
                      ) : (
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xl font-semibold">
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
                        id="photo-upload-edit"
                      />
                      <label htmlFor="photo-upload-edit">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={() => document.getElementById('photo-upload-edit').click()}
                          className="cursor-pointer"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Change Photo'}
                        </Button>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={user.full_name} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">Contact admin to change your name</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user.email} disabled className="bg-gray-50" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input
                        type="tel"
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
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

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          mobile_number: user.mobile_number || '',
                          employee_id: user.employee_id || '',
                          department: user.department || '',
                          profile_photo: user.profile_photo || '',
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <Label className="text-gray-500">Full Name</Label>
                    <p className="text-gray-900 font-medium mt-1">{user.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email Address</Label>
                    <p className="text-gray-900 font-medium mt-1">{user.email}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-gray-500">Mobile Number</Label>
                      <p className="text-gray-900 font-medium mt-1">{user.mobile_number || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Employee ID</Label>
                      <p className="text-gray-900 font-medium mt-1">{user.employee_id || 'Not set'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500">Department</Label>
                    <p className="text-gray-900 font-medium mt-1">{user.department || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Role</Label>
                    <p className="text-gray-900 font-medium mt-1 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}