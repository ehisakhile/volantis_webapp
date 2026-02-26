'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/auth';
import type { VolUserResponse, LoginRequest, SignupRequest, UserSignupRequest, VolSignupResponse, VolTokenResponse } from '@/types/auth';

interface AuthContextType {
  user: VolUserResponse | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<VolSignupResponse>;
  signupUser: (data: UserSignupRequest) => Promise<VolSignupResponse>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VolUserResponse | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          
          // Check email verification status
          try {
            const verificationStatus = await authApi.checkEmailVerification();
            setIsEmailVerified(verificationStatus.is_verified);
          } catch {
            // If check fails, assume not verified
            setIsEmailVerified(false);
          }
        } catch {
          // Token might be invalid, clear auth
          authApi.clearAuth();
          setIsEmailVerified(false);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const fetchUser = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      authApi.clearAuth();
      setUser(null);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: VolTokenResponse = await authApi.login(data);
      
      // Fetch user data after successful login
      const userData = await authApi.getMe();
      setUser(userData);
      
      // Check email verification status
      try {
        const verificationStatus = await authApi.checkEmailVerification();
        setIsEmailVerified(verificationStatus.is_verified);
        
        // If email is not verified, store the info for later
        if (!verificationStatus.is_verified && typeof window !== 'undefined') {
          localStorage.setItem('verification_email', userData.email);
          localStorage.setItem('verification_user_id', String(userData.id));
        } else if (verificationStatus.is_verified && typeof window !== 'undefined') {
          // Clear any stale verification data
          localStorage.removeItem('verification_email');
          localStorage.removeItem('verification_user_id');
        }
      } catch {
        // If check fails, assume not verified
        setIsEmailVerified(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('verification_email', userData.email);
          localStorage.setItem('verification_user_id', String(userData.id));
        }
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? String(err.detail)
        : 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest): Promise<VolSignupResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.signup(data);
      
      // If signup returns tokens, fetch user
      if (response.access_token) {
        await fetchUser();
      }
      
      return response;
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err 
        ? String(err.detail) 
        : 'Signup failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const signupUser = useCallback(async (data: UserSignupRequest): Promise<VolSignupResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.signupUser(data);
      
      // If signup returns tokens, fetch user
      if (response.access_token) {
        await fetchUser();
      }
      
      return response;
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'detail' in err
        ? String(err.detail)
        : 'Signup failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkEmailVerification = useCallback(async (): Promise<boolean> => {
    if (!authApi.isAuthenticated()) {
      setIsEmailVerified(false);
      return false;
    }

    try {
      const result = await authApi.checkEmailVerification();
      setIsEmailVerified(result.is_verified);
      return result.is_verified;
    } catch {
      setIsEmailVerified(false);
      return false;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isEmailVerified,
    isLoading,
    error,
    login,
    signup,
    signupUser,
    logout,
    fetchUser,
    checkEmailVerification,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
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
