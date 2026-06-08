import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { uploadProfileFile, buildProfilePatch, buildProfileRow } from '../services/profileService';
import type { UserProfile } from '../types/profile';
import {
  clearPendingQuizResult,
  readPendingQuizResult,
} from '../utils/quizStorage';

export type { UserProfile } from '../types/profile';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  passwordRecoveryMode: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updatePasswordWithConfirm: (
    newPassword: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (
    newEmail: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string; url?: string }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<UserProfile | null>;
  ensureProfile: () => Promise<UserProfile | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mapSupabaseUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email ?? '',
});

const translateAuthError = (message: string): string => {
  const normalized = message.toLowerCase();
  if (normalized.includes('permission denied for table user_profiles')) {
    return 'Нет прав на сохранение профиля. Обратитесь к администратору или перезапустите SQL-скрипт SUPABASE_SETUP.sql.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Не удалось связаться с сервером. Проверьте интернет и переменные VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в .env.local.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Неверный email или пароль.';
  }
  if (normalized.includes('user already registered')) {
    return 'Пользователь с таким email уже существует.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Пароль должен содержать минимум 6 символов.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Подтвердите email перед входом (проверьте почту).';
  }
  if (normalized.includes('rate limit')) {
    return 'Слишком много попыток. Попробуйте позже.';
  }
  if (normalized.includes('same password')) {
    return 'Новый пароль совпадает с текущим.';
  }
  if (normalized.includes('email address invalid')) {
    return 'Некорректный email.';
  }
  return message;
};

const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading profile:', error);
    return null;
  }
  return data as UserProfile | null;
};

const applyPendingTestResult = async (
  userId: string,
  email: string,
  existing?: UserProfile | null,
): Promise<UserProfile | null> => {
  const pending = readPendingQuizResult();
  if (!pending) return existing ?? fetchUserProfile(userId);

  clearPendingQuizResult();

  const payload = {
    specialty: pending.specialty,
    skills: [`Общий результат — ${pending.overallScore ?? 0}%`, ...pending.skills],
    quiz_completed_at: pending.completedAt,
    quiz_attempts: pending.attempt || 1,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Ошибка переноса результатов теста в профиль:', error);
      return existing;
    }
    return data as UserProfile;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    console.error('Ошибка переноса результатов теста в профиль:', error);
    return fetchUserProfile(userId);
  }

  return data as UserProfile;
};

const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
  const existing = await fetchUserProfile(user.id);
  if (existing) {
    return applyPendingTestResult(user.id, user.email ?? '', existing);
  }

  const pending = readPendingQuizResult();
  if (pending) clearPendingQuizResult();

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      full_name: '',
      work_place: '',
      specialty: pending?.specialty || '',
      skills: pending?.skills || [],
      avatar_url: '',
      quiz_completed_at: pending?.completedAt || null,
      quiz_attempts: pending?.attempt || 0,
      links: [],
      certificates: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }
  return data as UserProfile;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const saveInFlightRef = useRef(0);

  const syncUser = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      setUserProfile(null);
      return;
    }

    if (saveInFlightRef.current > 0) return;

    const mapped = mapSupabaseUser(authUser);
    setUser(mapped);

    try {
      const profile = await fetchUserProfile(authUser.id);
      if (!profile) {
        const newProfile = await ensureUserProfile(authUser);
        setUserProfile(newProfile);
        return;
      }

      const pending = readPendingQuizResult();
      if (pending) {
        const updatedProfile = await applyPendingTestResult(
          authUser.id,
          authUser.email ?? '',
          profile,
        );
        setUserProfile(updatedProfile || profile);
        return;
      }

      setUserProfile(profile);
    } catch (err) {
      console.error('Ошибка фоновой синхронизации профиля:', err);
      setUserProfile({
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: '',
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
        }
        setLoading(false);
        await syncUser(session?.user ?? null);
      } catch (err) {
        console.error('Ошибка инициализации сессии:', err);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      setTimeout(async () => {
        try {
          if (event === 'PASSWORD_RECOVERY') {
            setPasswordRecoveryMode(true);
          }
          if (event === 'SIGNED_OUT') {
            setPasswordRecoveryMode(false);
          }
          await syncUser(session?.user ?? null);
        } catch (err) {
          console.error('Ошибка смены состояния авторизации:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) return { success: false, error: translateAuthError(error.message) };

      if (data.user) {
        const profile = await ensureUserProfile(data.user);
        if (profile) setUserProfile(profile);
        if (data.session) {
          setUser(mapSupabaseUser(data.user));
        }
      }

      if (!data.session) {
        return { success: true, needsEmailConfirmation: true };
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: translateAuthError(error.message) };

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    }
  };

  const signOut = async () => {
    setUser(null);
    setUserProfile(null);
    setPasswordRecoveryMode(false);

    try {
      supabase.auth.signOut().catch((err) => {
        console.error('Ошибка закрытия сессии на сервере:', err);
      });
    } catch {
      // ignore
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { success: false, error: translateAuthError(error.message) };
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { success: false, error: translateAuthError(error.message) };
      setPasswordRecoveryMode(false);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    }
  };

  const updatePasswordWithConfirm = async (newPassword: string, confirmPassword: string) => {
    if (newPassword.length < 6) {
      return { success: false, error: 'Пароль должен содержать минимум 6 символов.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, error: 'Пароли не совпадают.' };
    }
    return updatePassword(newPassword);
  };

  const updateEmail = async (newEmail: string, password: string) => {
    if (!user) return { success: false, error: 'Не авторизован' };
    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      return { success: false, error: 'Укажите новый email.' };
    }

    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (reauthError) {
        return { success: false, error: 'Неверный пароль для подтверждения смены email.' };
      }

      const { data, error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) return { success: false, error: translateAuthError(error.message) };

      if (data.user?.email) {
        setUser({ id: user.id, email: data.user.email });
        await updateProfile({ email: data.user.email });
      }

      return {
        success: true,
        needsEmailConfirmation: data.user?.email !== newEmail.trim(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { success: false, error: 'Не авторизован' };

    const previousProfile = userProfile;

    try {
      const previewUrl = URL.createObjectURL(file);
      if (userProfile) {
        setUserProfile({ ...userProfile, avatar_url: previewUrl });
      }

      const url = await uploadProfileFile('avatars', user.id, file, 'avatar');
      URL.revokeObjectURL(previewUrl);
      const result = await updateProfile({ avatar_url: url });
      if (!result.success) {
        setUserProfile(previousProfile);
        return result;
      }
      return { success: true, url };
    } catch (error: unknown) {
      setUserProfile(previousProfile);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  };

  const refreshProfile = async () => {
    if (!user) return null;
    const profile = await fetchUserProfile(user.id);
    setUserProfile(profile);
    return profile;
  };

  const ensureProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;

    const existing = await fetchUserProfile(user.id);
    if (existing) return existing;

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser) return null;

    return ensureUserProfile(authUser);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    saveInFlightRef.current += 1;

    try {
      if (!user) return { success: false, error: 'Не авторизован' };
      if (!isSupabaseConfigured) {
        return {
          success: false,
          error: 'Supabase не настроен. Создайте .env.local с VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
        };
      }

      const previousProfile = userProfile;
      const nextProfile = {
        ...(userProfile ?? { id: user.id, email: user.email }),
        ...data,
        updated_at: new Date().toISOString(),
      } as UserProfile;

      setUserProfile(nextProfile);

      const dbPatch = buildProfilePatch(data);

      if (previousProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update(dbPatch)
          .eq('id', user.id);

        if (error) {
          setUserProfile(previousProfile);
          return { success: false, error: translateAuthError(error.message) };
        }

        return { success: true };
      }

      const payload = buildProfileRow(user.id, user.email, null, data);
      const { data: saved, error } = await supabase
        .from('user_profiles')
        .insert(payload)
        .select()
        .single();

      if (error) {
        setUserProfile(previousProfile);
        return { success: false, error: translateAuthError(error.message) };
      }

      setUserProfile(saved as UserProfile);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: translateAuthError(message) };
    } finally {
      saveInFlightRef.current -= 1;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        passwordRecoveryMode,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updatePasswordWithConfirm,
        updateEmail,
        uploadAvatar,
        updateProfile,
        refreshProfile,
        ensureProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
