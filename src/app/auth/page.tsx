'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "next-themes";
import { Eye, EyeOff, BookOpen, Brain } from 'lucide-react';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { resolvedTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name, studentId);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-500 flex items-center justify-center p-4 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent)] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent)] animate-pulse delay-2000"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Drexel Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {/* Official Drexel Logo */}
            <div className="relative">
              <img 
                src="/drexel/College_ComputingInformatics-oneline100height.png"
                alt="Drexel University - College of Computing & Informatics"
                className="h-40 w-auto object-contain drop-shadow-lg"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            AI Teaching Assistant
          </h1>
          <p className="text-blue-100 text-sm">
            Exclusive access for Drexel students
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-yellow-300" />
              <span className="text-white font-semibold">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </span>
            </div>
            <p className="text-blue-100 text-sm">
              {isSignUp 
                ? 'Join your fellow Dragons in AI-powered learning'
                : 'Sign in to access your AI study companion'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="e.g., abc123"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Drexel Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="yourname@drexel.edu"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-200 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3">
                <p className="text-red-100 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold rounded-lg transition-colors"
            >
              {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
                setStudentId('');
              }}
              className="text-blue-200 hover:text-white text-sm transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {/* Drexel Info */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="text-center text-blue-100 text-xs space-y-1">
              <div className="flex items-center justify-center gap-1 mb-2">
                <BookOpen className="h-4 w-4" />
                <span className="font-medium">Exclusive to Drexel Students</span>
              </div>
              <p>Access requires a valid @drexel.edu email address</p>
              <p className="text-blue-200">Powered by Prof. Reza's AI Research</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-200 text-xs">
          <p>© 2025 Drexel University • AI Teaching Assistant</p>
          <p className="mt-1">Built with ❤️ for Dragon students</p>
        </div>
      </div>
    </div>
  );
}
