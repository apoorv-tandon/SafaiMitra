import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, Target, ShieldCheck, ArrowLeft, Award, Sparkles } from 'lucide-react';

const TEAM_MEMBERS = [
  {
    name: "Apoorva Tandon",
    role: "MSc Economics + BE Computer Science",
    image: "/apoorva.png"
  },
  {
    name: "Abhigyan Krishna Tiwari",
    role: "MSc Physics + BE Computer Science",
    image: "/abhigyan.jpeg"
  },
  {
    name: "Aman Kumar Singh",
    role: "MSc Physics + BE Computer Science",
    image: "/aman.jpeg"
  }
];

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="font-semibold">Back to Home</span>
          </Link>
          <div className="flex items-center">
            <img src="/logo.png" alt="SafaiMitra" className="h-10 w-10 object-contain mr-2" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">SafaiMitra</span>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-white overflow-hidden relative">
          <div className="absolute inset-0 bg-primary-50/50 skew-y-3 origin-top-left -z-10" />
          <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img src="/logo.png" alt="SafaiMitra Large Logo" className="h-32 w-32 mx-auto mb-8 rounded-full shadow-lg" />
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                Revolutionizing <span className="text-primary-600">Sanitation Management</span>
              </h1>
              <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
                SafaiMitra is an intelligent, QR-based feedback platform designed to maintain impeccable hygiene standards through real-time issue tracking and dynamic cleaner routing.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Achievement Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto px-6 -mt-8 relative z-20"
        >
          <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 rounded-2xl shadow-xl p-8 text-white text-center transform transition-all hover:scale-[1.02]">
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-100" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center">
              <Sparkles className="h-6 w-6 mr-2 text-yellow-200" />
              1st Place Winners
              <Sparkles className="h-6 w-6 ml-2 text-yellow-200" />
            </h2>
            <p className="text-lg sm:text-xl font-medium text-yellow-50">
              All India AMIEE National Innovation Hackathon
            </p>
          </div>
        </motion.div>

        {/* Mission Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Do</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We bridge the gap between facility users and maintenance staff, ensuring clean and hygienic washrooms through a seamless, tech-driven approach.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Reporting</h3>
              <p className="text-gray-600">Users simply scan a QR code to report issues in seconds, without needing to download any app.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Routing</h3>
              <p className="text-gray-600">Issues are automatically routed to the nearest available cleaner, minimizing downtime and maximizing efficiency.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Accountability</h3>
              <p className="text-gray-600">Cleaners submit photographic proof of resolved issues, providing complete transparency to administrators.</p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-gray-100 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet The Team</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                The innovators behind SafaiMitra who built the winning solution at the AMIEE Hackathon.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {TEAM_MEMBERS.map((member, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200 text-center hover:shadow-md transition-shadow"
                >
                  <div className="p-8">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-32 h-32 rounded-full mx-auto mb-6 ring-4 ring-primary-50 object-cover"
                    />
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-sm font-medium text-primary-600 px-4">{member.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center">
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} SafaiMitra. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
