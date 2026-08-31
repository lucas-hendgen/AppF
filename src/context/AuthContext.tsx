import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserAddress } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ message: string }>;
  register: (data: {
    name: string;
    email: string;
    cpf?: string;
    phone: string;
    password: string;
    address?: Partial<UserAddress>;
    healthNotes?: string;
  }) => Promise<{ message: string }>;
  forgotPassword: (email: string) => Promise<{ message: string; recoveryCode?: string }>;
  resetPassword: (email: string, newPass: string, code: string) => Promise<{ message: string }>;
  googleAuth: (data: { email: string; name?: string; googleId?: string }) => Promise<{ message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  
  // Modal states
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot_password';
  authModalReason: string | null;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot_password', reason?: string) => void;
  closeAuthModal: () => void;
  
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;


}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fsp_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);


  const refreshUser = async () => {
    const savedToken = localStorage.getItem('fsp_auth_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
      setToken(savedToken);
    } catch (err) {
      console.warn('Token expirado ou inválido:', err);
      localStorage.removeItem('fsp_auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const result = await api.login(identifier, pass);
    setUser(result.user);
    setToken(result.token);
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
    return { message: result.message };
  };

  const register = async (data: any) => {
    const result = await api.register(data);
    setUser(result.user);
    setToken(result.token);
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
    return { message: result.message };
  };

  const forgotPassword = async (email: string) => {
    const result = await api.forgotPassword(email);
    return result;
  };

  const resetPassword = async (email: string, newPass: string, code: string) => {
    const result = await api.resetPassword(email, newPass, code);
    setUser(result.user);
    setToken(result.token);
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
    return { message: result.message };
  };

  const googleAuth = async (data: { email: string; name?: string; googleId?: string }) => {
    const result = await api.googleAuth(data);
    setUser(result.user);
    setToken(result.token);
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
    return { message: result.message };
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    setIsProfileModalOpen(false);

  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = await api.updateProfile(updates);
    setUser(updated);
  };

  const addAddress = async (address: Omit<UserAddress, 'id'>) => {
    const res = await api.addAddress(address);
    if (res.user) {
      setUser(res.user);
    } else if (user) {
      setUser({ ...user, addresses: res.addresses });
    }
  };

  const deleteAddress = async (addressId: string) => {
    const res = await api.deleteAddress(addressId);
    if (res.user) {
      setUser(res.user);
    } else if (user) {
      setUser({ ...user, addresses: res.addresses });
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot_password' = 'login', reason?: string) => {
    setAuthModalMode(mode);
    setAuthModalReason(reason || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };



  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        forgotPassword,
        resetPassword,
        googleAuth,
        logout,
        refreshUser,
        updateProfile,
        addAddress,
        deleteAddress,
        isAuthModalOpen,
        authModalMode,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,

      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
