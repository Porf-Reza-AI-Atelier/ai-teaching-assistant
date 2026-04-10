'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  studentId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string, studentId?: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('drexel-ai-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('drexel-ai-user');
      }
    }
    setIsLoading(false);
  }, []);

  const validateDrexelEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@drexel.edu');
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    if (!validateDrexelEmail(email)) {
      throw new Error('Only @drexel.edu email addresses are allowed');
    }

    // For demo purposes, we'll use simple validation
    // In a real app, this would call a backend authentication service
    const savedUsers = JSON.parse(localStorage.getItem('drexel-registered-users') || '{}');
    const userKey = email.toLowerCase();
    
    if (savedUsers[userKey] && savedUsers[userKey].password === password) {
      const userData = savedUsers[userKey];
      const user: User = {
        email: userData.email,
        name: userData.name,
        studentId: userData.studentId
      };
      
      setUser(user);
      localStorage.setItem('drexel-ai-user', JSON.stringify(user));
      return true;
    }
    
    throw new Error('Invalid email or password');
  };

  const signUp = async (email: string, password: string, name: string, studentId?: string): Promise<boolean> => {
    if (!validateDrexelEmail(email)) {
      throw new Error('Only @drexel.edu email addresses are allowed');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Save user data locally (in a real app, this would go to a backend)
    const savedUsers = JSON.parse(localStorage.getItem('drexel-registered-users') || '{}');
    const userKey = email.toLowerCase();
    
    if (savedUsers[userKey]) {
      throw new Error('An account with this email already exists');
    }

    savedUsers[userKey] = {
      email: email.toLowerCase(),
      name,
      studentId,
      password // In a real app, this would be hashed
    };
    
    localStorage.setItem('drexel-registered-users', JSON.stringify(savedUsers));
    
    // Auto sign in after registration
    const user: User = {
      email: email.toLowerCase(),
      name,
      studentId
    };
    
    setUser(user);
    localStorage.setItem('drexel-ai-user', JSON.stringify(user));
    return true;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('drexel-ai-user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
