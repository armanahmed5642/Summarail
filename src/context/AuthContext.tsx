import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserPreferences } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateUserProfile: (name: string, profileImage?: string) => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success, error } = useToast();

  const fetchCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setAuthToken(res.token);
      setUser(res.user);
      success(`Welcome back, ${res.user.name}!`);
    } catch (err: any) {
      error(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.register({ name, email, password });
      setAuthToken(res.token);
      setUser(res.user);
      success(`Account created! Welcome to SummarAI, ${res.user.name}.`);
    } catch (err: any) {
      error(err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await api.googleLogin({
        email: 'alex.rivera@gmail.com',
        name: 'Alex Rivera',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      });
      setAuthToken(res.token);
      setUser(res.user);
      success('Signed in with Google successfully!');
    } catch (err: any) {
      error(err.message || 'Google sign-in failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    setIsLoading(true);
    try {
      const res = await api.login({ email: 'demo@summarai.com', password: 'demo123' });
      setAuthToken(res.token);
      setUser(res.user);
      success('Logged in to demo workspace.');
    } catch (err: any) {
      // Fallback: create demo
      const googleRes = await api.googleLogin({
        email: 'demo@summarai.com',
        name: 'Alex Rivera',
      });
      setAuthToken(googleRes.token);
      setUser(googleRes.user);
      success('Logged in to demo workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    success('Logged out successfully.');
  };

  const deleteAccount = async () => {
    try {
      await api.deleteAccount();
      removeAuthToken();
      setUser(null);
      success('Your account and saved data have been permanently deleted.');
    } catch (err: any) {
      error(err.message || 'Failed to delete account.');
      throw err;
    }
  };

  const updateUserProfile = async (name: string, profileImage?: string) => {
    try {
      const updated = await api.updateProfile({ name, profile_image: profileImage });
      setUser(prev => (prev ? { ...prev, name: updated.name, profile_image: updated.profile_image } : updated));
      success('Profile updated successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
      throw err;
    }
  };

  const updateUserPreferences = async (prefs: Partial<UserPreferences>) => {
    try {
      const updatedPrefs = await api.updatePreferences(prefs);
      setUser(prev => (prev ? { ...prev, preferences: updatedPrefs } : prev));
      success('Preferences saved.');
    } catch (err: any) {
      error(err.message || 'Failed to save preferences.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        googleLogin,
        demoLogin,
        logout,
        deleteAccount,
        updateUserProfile,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
