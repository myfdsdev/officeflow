import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Calendar, TrendingUp, ArrowRight, Shield, Users } from "lucide-react";
import { createPageUrl } from "@/utils";
import OnboardingScreen from '../components/onboarding/OnboardingScreen';

export default function Welcome() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // If user has basic profile info, redirect to dashboard
        if (userData.mobile_number && userData.employee_id) {
          window.location.href = userData.role === 'admin' 
            ? createPageUrl('AdminDashboard') 
            : createPageUrl('Dashboard');
        }
      } catch (error) {
        // User not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      // User logged in but profile incomplete
      window.location.href = createPageUrl('CompleteProfile');
    } else {
      // Show onboarding first
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // User not logged in, redirect to login
    base44.auth.redirectToLogin(createPageUrl('Welcome'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl mb-6 shadow-2xl">
            <Clock className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            AttendEase
          </h1>
          <p className="text-xl md:text-2xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Modern attendance management made simple for your entire team
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50 text-lg px-8 py-6 rounded-xl shadow-2xl"
          >
            {user ? 'Complete Your Profile' : 'Get Started'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quick Clock In/Out</h3>
              <p className="text-indigo-100">
                Mark your attendance with a single tap. Track your work hours automatically.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Leave Management</h3>
              <p className="text-indigo-100">
                Apply for leave and get instant approvals. Stay updated on your leave balance.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Reports</h3>
              <p className="text-indigo-100">
                View attendance history, work hours, and performance insights at a glance.
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Admin Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-lg border-white/20">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h3>
                <p className="text-indigo-100">
                  Manage your entire team, approve leave requests, edit attendance records, and generate comprehensive reports - all from one powerful dashboard.
                </p>
              </div>
              <Users className="w-24 h-24 text-white/20" />
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16 text-indigo-100"
        >
          <p className="text-sm">
            Fast • Secure • Mobile-friendly
          </p>
        </motion.div>
      </div>
    </div>
  );
}