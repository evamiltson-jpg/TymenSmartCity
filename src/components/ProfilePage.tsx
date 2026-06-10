import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PROFILE_FILE_LIMITS } from '../constants/profileLimits';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import {
  appendCertificate,
  appendLink,
  buildCertificate,
  buildLink,
  createUserProject,
  mergeManualSkills,
  removeCertificate,
  removeLink,
  uploadProfileFile,
} from '../services/profileService';
import {
  cancelProjectApplication,
  APPLICATION_STATUS_LABELS,
  fetchUserApplications,
  type ProjectApplication,
} from '../services/projectApplicationService';
import {
  createProjectTeam,
  deleteProjectTeam,
  fetchMySubmittedProjects,
  fetchMyTeamDetails,
  formatProjectError,
  isProjectPendingPublication,
  isProjectPublishOverdue,
  readSubmittedProjectsCache,
  updateProjectTeam,
  type SubmittedProject,
  type TeamCreatePayload,
  type UserTeamDetail,
} from '../services/projectService';
import { MySubmittedProjectModal } from './profile/MySubmittedProjectModal';
import type { ProfileLink, UserProfile, UserType } from '../types/profile';
import { LINK_TYPE_LABELS, USER_TYPE_LABELS } from '../types/profile';
import { ITQuizModal } from './ITQuizModal';
import { CreateProjectModal, CreateTeamModal, EditTeamModal } from './profile/ProfileCreateModals';
import { ProfileSecuritySettings } from './profile/ProfileSecuritySettings';
import { getQuizMeta, getSkillLevel, parseSkillEntry, type QuizResultPayload } from '../utils/quizStorage';
import { getScoreBarColor } from '../data/itQuiz';

interface Application {
  user_id: string;
  id: string;
  project_id: string | null;
  status: ProjectApplication['status'];
  project_title: string;
  submitted_at: string;
}

interface UserProject {
  user_id: string;
  id: string;
  title: string;
  description: string;
  role: string;
  status: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400';
const labelClass = 'block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider';

export const ProfilePage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const {
    user,
    userProfile,
    updateProfile,
    uploadAvatar,
    signOut,
    loading: authLoading,
  } = useAuth();

  const [tab, setTab] = useState<'profile' | 'applications' | 'projects' | 'teams'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<UserTeamDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [submittedProjects, setSubmittedProjects] = useState<SubmittedProject[]>(() =>
    user ? readSubmittedProjectsCache(user.id) ?? [] : [],
  );
  const [managedProject, setManagedProject] = useState<{ id: string; mode: 'view' | 'edit' } | null>(null);
  const [teams, setTeams] = useState<UserTeamDetail[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSubmitted, setLoadingSubmitted] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const quizMeta = useMemo((): QuizResultPayload | null => {
    const stored = getQuizMeta(user?.id);
    if (stored) return stored;
    if (!userProfile?.quiz_attempts) return null;

    const overallEntry = (userProfile.skills || []).find((s) => s.startsWith('Общий результат'));
    return {
      attempt: userProfile.quiz_attempts,
      completedAt: userProfile.quiz_completed_at || '',
      specialty: userProfile.specialty || '',
      skills: userProfile.skills || [],
      skillScores: [],
      track: '',
      overallScore: overallEntry ? (parseSkillEntry(overallEntry).score ?? 0) : 0,
      verdictTitle: '',
      verdictText: '',
      verdictTone: 'mid',
    };
  }, [user?.id, userProfile]);

  const parsedSkills = useMemo(
    () => (userProfile?.skills || []).map(parseSkillEntry).filter((s) => !s.name.startsWith('Общий результат')),
    [userProfile?.skills],
  );

  const overallQuizScore = useMemo(() => {
    const entry = (userProfile?.skills || []).find((s) => s.startsWith('Общий результат'));
    if (!entry) return quizMeta?.overallScore ?? null;
    return parseSkillEntry(entry).score ?? null;
  }, [userProfile?.skills, quizMeta?.overallScore]);

  const [formData, setFormData] = useState({
    full_name: '',
    work_place: '',
    specialty: '',
    skills: '',
    user_type: 'citizen' as UserType,
    bio: '',
    university: '',
    course_year: '',
    company: '',
    experience_years: '',
    city_interests: '',
  });

  const [newLink, setNewLink] = useState<{ type: ProfileLink['type']; label: string; url: string }>({
    type: 'github',
    label: '',
    url: '',
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        work_place: userProfile.work_place || '',
        specialty: userProfile.specialty || '',
        skills: (userProfile.skills || []).join(', '),
        user_type: userProfile.user_type || 'citizen',
        bio: userProfile.bio || '',
        university: userProfile.university || '',
        course_year: userProfile.course_year || '',
        company: userProfile.company || '',
        experience_years: userProfile.experience_years?.toString() || '',
        city_interests: userProfile.city_interests || '',
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (user && !userProfile?.full_name) {
      setIsEditing(true);
    }
  }, [user, userProfile]);

  const loadSubmittedProjects = async (options?: { background?: boolean }) => {
    if (!user || authLoading) return;

    const hasVisibleProjects =
      submittedProjects.length > 0 || Boolean(readSubmittedProjectsCache(user.id)?.length);

    if (!options?.background && !hasVisibleProjects) {
      setLoadingSubmitted(true);
    }

    setSaveError('');
    try {
      const submittedRes = await fetchMySubmittedProjects(user.id);
      setSubmittedProjects(submittedRes);
    } catch (error) {
      console.error('Error loading submitted projects:', error);
      if (!hasVisibleProjects) {
        setSaveError(formatProjectError(error));
      }
    } finally {
      setLoadingSubmitted(false);
    }
  };

  const loadUserData = async () => {
    if (!user || authLoading) return;
    setLoadingData(true);
    try {
      const [appsRes, projsRes, teamsRes] = await Promise.all([
        fetchUserApplications(user.id).then((data) => ({ data, error: null })).catch((error) => ({
          data: null,
          error,
        })),
        supabase
          .from('user_projects')
          .select('id, user_id, title, description, role, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        fetchMyTeamDetails(user.id).then((data) => ({ data, error: null })).catch((error) => ({
          data: null,
          error,
        })),
      ]);

      if (appsRes.data) setApplications(appsRes.data as Application[]);
      else if (appsRes.error) console.error('Applications load error:', appsRes.error);
      if (projsRes.data) setProjects(projsRes.data as UserProject[]);
      if (teamsRes.data) setTeams(teamsRes.data);
      else if (teamsRes.error) console.error('Teams load error:', teamsRes.error);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const cached = readSubmittedProjectsCache(user.id);
    if (cached?.length) setSubmittedProjects(cached);
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const cached = readSubmittedProjectsCache(user.id);
    if (cached?.length) {
      setSubmittedProjects(cached);
      void loadSubmittedProjects({ background: true });
    } else {
      void loadSubmittedProjects();
    }
    void loadUserData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || authLoading) return;

    const hasPending = submittedProjects.some(isProjectPendingPublication);
    if (!hasPending) return;

    const hasOverdue = submittedProjects.some(isProjectPublishOverdue);
    const intervalMs = hasOverdue ? 15_000 : 45_000;
    const timerId = window.setInterval(() => {
      void loadSubmittedProjects({ background: true });
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [user, authLoading, submittedProjects]);

  const handleSaveProfile = async () => {
    setSaveMessage('');
    setSaveError('');
    setIsSaving(true);

    const patch: Partial<UserProfile> = {
      full_name: formData.full_name.trim(),
      user_type: formData.user_type,
      bio: formData.bio.trim(),
    };

    if (showStudentFields) {
      patch.university = formData.university.trim();
      patch.course_year = formData.course_year.trim();
      patch.work_place = formData.work_place.trim();
      patch.specialty = formData.specialty.trim();
      patch.skills = mergeManualSkills(userProfile?.skills, formData.skills);
    } else if (showSpecialistFields) {
      patch.company = formData.company.trim();
      patch.experience_years = formData.experience_years ? Number(formData.experience_years) : null;
      patch.specialty = formData.specialty.trim();
      patch.skills = mergeManualSkills(userProfile?.skills, formData.skills);
    } else if (showCitizenFields) {
      patch.city_interests = formData.city_interests.trim();
    }

    const result = await updateProfile(patch);

    setIsSaving(false);

    if (result.success) {
      setIsEditing(false);
      setSaveMessage('Профиль сохранён');
    } else {
      setSaveError(result.error || 'Не удалось сохранить профиль');
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setSaveError('');
    const result = await uploadAvatar(file);
    setUploadingAvatar(false);
    if (result.success) {
      setSaveMessage('Аватар обновлён');
    } else {
      setSaveError(result.error || 'Не удалось загрузить аватар');
    }
    event.target.value = '';
  };

  const handleAddLink = async () => {
    if (!userProfile || !newLink.url.trim()) return;
    const label = newLink.label.trim() || LINK_TYPE_LABELS[newLink.type];
    const links = appendLink(userProfile, buildLink(newLink.type, label, newLink.url.trim()));
    const result = await updateProfile({ links });
    if (result.success) {
      setNewLink({ type: 'github', label: '', url: '' });
      setSaveMessage('Ссылка добавлена');
    } else {
      setSaveError(result.error || 'Не удалось добавить ссылку');
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!userProfile || !confirm('Удалить ссылку?')) return;
    const result = await updateProfile({ links: removeLink(userProfile, linkId) });
    if (!result.success) setSaveError(result.error || 'Не удалось удалить ссылку');
  };

  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !userProfile) return;

    setUploadingCert(true);
    setSaveError('');
    try {
      const url = await uploadProfileFile('certificates', user.id, file, 'cert');
      const name = file.name.replace(/\.[^.]+$/, '');
      const certificates = appendCertificate(
        userProfile,
        buildCertificate(name, url, file.type),
      );
      const result = await updateProfile({ certificates });
      if (result.success) setSaveMessage('Сертификат загружен');
      else setSaveError(result.error || 'Не удалось сохранить сертификат');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setUploadingCert(false);
      event.target.value = '';
    }
  };

  const handleRemoveCertificate = async (certificateId: string) => {
    if (!userProfile || !confirm('Удалить сертификат из профиля?')) return;
    const result = await updateProfile({ certificates: removeCertificate(userProfile, certificateId) });
    if (!result.success) setSaveError(result.error || 'Не удалось удалить сертификат');
  };

  const handleCreateProject = async (payload: { title: string; description: string; role: string }) => {
    if (!user) return;
    await createUserProject(user.id, payload);
    await loadUserData();
    setSaveMessage('Проект создан');
  };

  const handleCancelApplication = async (applicationId: string) => {
    if (!user || !confirm('Отменить заявку?')) return;
    const result = await cancelProjectApplication(user.id, applicationId);
    if (result.ok) {
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      setSaveMessage(result.message);
    } else {
      setSaveError(result.message);
    }
  };

  const handleCreateTeam = async (payload: TeamCreatePayload) => {
    if (!user) return;
    await createProjectTeam(user.id, payload);
    await loadUserData();
    setSaveMessage('Команда создана');
  };

  const handleUpdateTeam = async (teamId: string, payload: TeamCreatePayload) => {
    if (!user) return;
    await updateProjectTeam(user.id, teamId, payload);
    await loadUserData();
    setSaveMessage('Команда обновлена');
  };

  const handleDeleteTeam = async (team: UserTeamDetail) => {
    if (!user || !team.is_owner) return;
    if (!confirm(`Удалить команду «${team.team_name}»? Это действие нельзя отменить.`)) return;

    try {
      await deleteProjectTeam(user.id, team.team_id);
      await loadUserData();
      setSaveMessage('Команда удалена');
    } catch (error) {
      setSaveError(formatProjectError(error));
    }
  };

  const handleSignOut = async () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      await signOut();
      onNavigate('home');
    }
  };

  const activeUserType = isEditing ? formData.user_type : (userProfile?.user_type || 'citizen');
  const showItFields = activeUserType === 'it_specialist' || activeUserType === 'student';
  const showStudentFields = activeUserType === 'student';
  const showSpecialistFields = activeUserType === 'it_specialist';
  const showCitizenFields = activeUserType === 'citizen';

  const renderAvatar = (profile?: UserProfile | null) => {
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt=""
          className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-yellow-400/30"
        />
      );
    }
    return (
      <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-black font-black uppercase">
        {profile?.full_name
          ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
          : 'U'}
      </div>
    );
  };

  if (authLoading) {
    return <div className="py-20 text-center text-gray-400 font-bold">Загрузка профиля...</div>;
  }

  if (!user) {
    return (
      <div className="py-20 text-center text-white space-y-4">
        <p>Вы не авторизованы</p>
        <button onClick={() => onNavigate('home')} className="px-6 py-2 bg-yellow-400 text-black font-bold rounded-xl">
          На главную
        </button>
      </div>
    );
  }

  return (
    <main className="py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Личный кабинет</h1>
        <button onClick={handleSignOut} className="px-5 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold text-xs uppercase">
          Выход
        </button>
      </div>

      {(saveMessage || saveError) && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-bold ${saveError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
          {saveError || saveMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-12 border-b border-white/10 pb-6">
        {(['profile', 'applications', 'projects', 'teams'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-2 font-bold text-sm uppercase tracking-widest rounded-t-xl ${
              tab === t ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'profile' ? 'Профиль' : t === 'applications' ? 'Заявки' : t === 'projects' ? 'Мои проекты' : 'Мои команды'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 text-center">
              {renderAvatar(userProfile)}
              <input ref={avatarInputRef} type="file" accept={PROFILE_FILE_LIMITS.avatar.accept} className="hidden" onChange={handleAvatarChange} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="mb-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {uploadingAvatar ? 'Загрузка...' : 'Сменить аватар'}
              </button>
              <p className="text-[10px] text-gray-500 mb-4">До {PROFILE_FILE_LIMITS.avatar.label}, JPG/PNG/WebP</p>

              <h3 className="text-xl font-bold mb-1 text-white truncate">{userProfile?.full_name || 'Не указано'}</h3>
              <p className="text-gray-400 text-xs mb-2 truncate">{userProfile?.email}</p>
              <span className="inline-block px-3 py-1 mb-4 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-black uppercase tracking-widest">
                {USER_TYPE_LABELS[userProfile?.user_type || 'citizen']}
              </span>

              {(showItFields || userProfile?.specialty) && (
                <div className="mb-6 p-4 bg-[#0d2231] border border-white/5 rounded-2xl text-center">
                  <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest block mb-1">ИТ-Специализация</span>
                  <p className="text-white font-extrabold text-sm mb-3">{userProfile?.specialty || 'Не определена'}</p>
                {(quizMeta || userProfile?.quiz_attempts) && (
                  <p className="text-[10px] text-green-400/90 mb-3">
                    ✓ Тест пройден {quizMeta?.attempt || userProfile?.quiz_attempts} раз(а)
                    {overallQuizScore != null && (
                      <span className={`block mt-1 font-black ${overallQuizScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        Общий балл: {overallQuizScore}%
                      </span>
                    )}
                  </p>
                )}
                  <button onClick={() => setShowQuiz(true)} className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-[11px] uppercase">
                    {userProfile?.specialty ? 'Перепройти тест' : 'Пройти тест'}
                  </button>
                </div>
              )}

              {parsedSkills.length > 0 && (
                <div className="text-left space-y-3 mb-4">
                  <h4 className="font-bold text-gray-300 text-xs uppercase tracking-wider text-center">Навыки</h4>
                  {parsedSkills.map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-white">{skill.name}</span>
                        {skill.score !== undefined && (
                          <span className={`text-[10px] font-black ${skill.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {skill.score}% · {getSkillLevel(skill.score)}
                          </span>
                        )}
                      </div>
                      {skill.score !== undefined && (
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${getScoreBarColor(skill.score)}`} style={{ width: `${skill.score}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setIsEditing(!isEditing)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs">
                {isEditing ? 'Отмена редактирования' : 'Редактировать профиль'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 space-y-6">
                <h2 className="text-2xl font-bold text-white">Редактирование профиля</h2>

                <div>
                  <label className={labelClass}>Кто вы?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(USER_TYPE_LABELS) as UserType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, user_type: type })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          formData.user_type === type
                            ? 'border-yellow-400 bg-yellow-400/10 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm font-bold block">{USER_TYPE_LABELS[type]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>ФИО</label>
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>О себе</label>
                  <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={5} placeholder="Расскажите о себе, интересах и целях..." className={`${inputClass} resize-none`} />
                </div>

                {showStudentFields && (
                  <>
                    <div>
                      <label className={labelClass}>Учебное заведение</label>
                      <input type="text" value={formData.university} onChange={(e) => setFormData({ ...formData, university: e.target.value })} placeholder="например, ТИУ" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Курс / год обучения</label>
                      <input type="text" value={formData.course_year} onChange={(e) => setFormData({ ...formData, course_year: e.target.value })} placeholder="например, 3 курс" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Факультет / направление</label>
                      <input type="text" value={formData.work_place} onChange={(e) => setFormData({ ...formData, work_place: e.target.value })} className={inputClass} />
                    </div>
                  </>
                )}

                {showSpecialistFields && (
                  <>
                    <div>
                      <label className={labelClass}>Компания / место работы</label>
                      <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Опыт (лет)</label>
                      <input type="number" min={0} value={formData.experience_years} onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Специализация</label>
                      <input type="text" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Навыки (через запятую)</label>
                      <textarea value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
                    </div>
                  </>
                )}

                {showCitizenFields && (
                  <div>
                    <label className={labelClass}>Интересы в городе</label>
                    <textarea value={formData.city_interests} onChange={(e) => setFormData({ ...formData, city_interests: e.target.value })} rows={3} placeholder="Сервисы, события, волонтёрство..." className={`${inputClass} resize-none`} />
                  </div>
                )}

                {showStudentFields && (
                  <>
                    <div>
                      <label className={labelClass}>Специализация (из теста или вручную)</label>
                      <input type="text" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Навыки (через запятую)</label>
                      <textarea value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
                    </div>
                  </>
                )}

                <button onClick={handleSaveProfile} disabled={isSaving} className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-bold rounded-xl uppercase text-xs tracking-widest">
                  {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
                </button>
              </div>
            ) : (
              <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 space-y-6">
                <h2 className="text-2xl font-bold text-white">Профиль</h2>
                {userProfile?.bio ? (
                  <div>
                    <p className={labelClass}>О себе</p>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{userProfile.bio}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Заполните информацию о себе в режиме редактирования</p>
                )}
                {showStudentFields && (
                  <>
                    {userProfile?.university && <div><p className={labelClass}>Учебное заведение</p><p className="text-white">{userProfile.university}</p></div>}
                    {userProfile?.course_year && <div><p className={labelClass}>Курс</p><p className="text-white">{userProfile.course_year}</p></div>}
                    {userProfile?.work_place && <div><p className={labelClass}>Направление</p><p className="text-white">{userProfile.work_place}</p></div>}
                  </>
                )}
                {showSpecialistFields && (
                  <>
                    {userProfile?.company && <div><p className={labelClass}>Компания</p><p className="text-white">{userProfile.company}</p></div>}
                    {userProfile?.experience_years != null && <div><p className={labelClass}>Опыт</p><p className="text-white">{userProfile.experience_years} лет</p></div>}
                  </>
                )}
                {showCitizenFields && userProfile?.city_interests && (
                  <div><p className={labelClass}>Интересы</p><p className="text-white">{userProfile.city_interests}</p></div>
                )}
              </div>
            )}

            {/* Links */}
            <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 space-y-5">
              <h2 className="text-xl font-bold text-white">Работы и ссылки</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={newLink.type} onChange={(e) => setNewLink({ ...newLink, type: e.target.value as ProfileLink['type'] })} className={inputClass}>
                  {(Object.keys(LINK_TYPE_LABELS) as ProfileLink['type'][]).map((type) => (
                    <option key={type} value={type}>{LINK_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <input value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} placeholder="Подпись (необязательно)" className={inputClass} />
                <input value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://github.com/..." className={inputClass} />
              </div>
              <button onClick={handleAddLink} className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-xs uppercase">
                Добавить ссылку
              </button>
              <div className="space-y-2">
                {(userProfile?.links || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">Ссылки не добавлены</p>
                ) : (
                  userProfile?.links?.map((link) => (
                    <div key={link.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#0d2231] border border-white/5">
                      <div className="min-w-0">
                        <p className="text-yellow-400 text-xs font-black uppercase">{LINK_TYPE_LABELS[link.type]}</p>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-white text-sm hover:text-yellow-400 truncate block">{link.label || link.url}</a>
                      </div>
                      <button onClick={() => handleRemoveLink(link.id)} className="text-red-400 text-xs font-bold shrink-0">Удалить</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Certificates gallery */}
            <div className="bg-[#122e41] p-8 rounded-[32px] border border-white/5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Сертификаты и файлы</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WebP или PDF · до {PROFILE_FILE_LIMITS.certificate.label}
                  </p>
                </div>
                <div>
                  <input ref={certInputRef} type="file" accept={PROFILE_FILE_LIMITS.certificate.accept} className="hidden" onChange={handleCertificateUpload} />
                  <button onClick={() => certInputRef.current?.click()} disabled={uploadingCert} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase">
                    {uploadingCert ? 'Загрузка...' : '+ Прикрепить'}
                  </button>
                </div>
              </div>
              {(userProfile?.certificates || []).length === 0 ? (
                <p className="text-gray-500 text-sm">Прикрепите сертификаты, дипломы или PDF-файлы</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userProfile?.certificates?.map((cert) => (
                    <div key={cert.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d2231]">
                      {cert.mime_type?.includes('pdf') ? (
                        <a href={cert.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-32 p-4 text-center">
                          <span className="text-3xl mb-2">📄</span>
                          <span className="text-xs text-white font-bold line-clamp-2">{cert.name}</span>
                        </a>
                      ) : (
                        <a href={cert.url} target="_blank" rel="noreferrer">
                          <img src={cert.url} alt={cert.name} className="w-full h-32 object-cover" />
                        </a>
                      )}
                      <div className="p-2">
                        <p className="text-[10px] text-gray-300 font-bold truncate">{cert.name}</p>
                      </div>
                      <button onClick={() => handleRemoveCertificate(cert.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ProfileSecuritySettings />
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Статус заявок</h2>
          {loadingData ? <p className="text-gray-400">Загрузка...</p> : applications.length === 0 ? (
            <div className="bg-[#122e41] p-12 rounded-[32px] border border-white/5 text-center text-gray-400">У вас пока нет заявок</div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-[#122e41] p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1">{app.project_title}</h3>
                    <p className="text-gray-400 text-xs">Подана: {new Date(app.submitted_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-4 py-2 rounded-xl font-bold uppercase text-xs ${
                        app.status === 'accepted'
                          ? 'text-green-400 bg-green-500/10'
                          : app.status === 'rejected'
                            ? 'text-red-400 bg-red-500/10'
                            : 'text-yellow-400 bg-yellow-400/10'
                      }`}
                    >
                      {APPLICATION_STATUS_LABELS[app.status]}
                    </span>
                    {app.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void handleCancelApplication(app.id)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Мои проекты</h2>
            <button
              onClick={() => onNavigate('projects')}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-xs uppercase"
            >
              + Создать проект
            </button>
          </div>

          {loadingData && loadingSubmitted ? (
            <p className="text-gray-400">Загрузка...</p>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Поданные идеи</h3>
                {saveError && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100 flex flex-wrap items-center justify-between gap-3">
                    <span>{saveError}</span>
                    <button
                      type="button"
                      onClick={() => void loadSubmittedProjects()}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase"
                    >
                      Повторить
                    </button>
                  </div>
                )}
                {loadingSubmitted && submittedProjects.length === 0 ? (
                  <p className="text-gray-500 text-sm">Загрузка проектов...</p>
                ) : submittedProjects.length === 0 && !saveError ? (
                  <div className="bg-[#122e41] p-8 rounded-[24px] border border-white/5 text-center text-gray-400 text-sm space-y-3">
                    <p>Вы ещё не подавали проекты на платформу.</p>
                    <p className="text-xs text-gray-500">
                      Создайте идею в разделе «Проекты» — она появится здесь сразу после сохранения.
                    </p>
                  </div>
                ) : submittedProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submittedProjects.map((proj) => (
                      <div key={proj.id} className="bg-[#122e41] p-5 rounded-[24px] border border-white/5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-white">{proj.title}</h3>
                          <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${proj.isOnSite ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-300 bg-amber-500/10 border-amber-500/30'}`}>
                            {proj.moderationLabel}
                          </span>
                        </div>
                        <p className="text-yellow-400 text-xs font-bold mb-2">{proj.category}</p>
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{proj.description}</p>
                        <p className="text-[11px] text-gray-500 mb-4">{proj.moderationHint}</p>
                        <p className="text-[10px] text-gray-600 mb-4">Статус проекта: {proj.status}</p>
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setManagedProject({ id: proj.id, mode: 'view' })}
                            className="flex-1 min-w-[120px] inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            Просмотр
                          </button>
                          <button
                            type="button"
                            onClick={() => setManagedProject({ id: proj.id, mode: 'edit' })}
                            className="flex-1 min-w-[120px] inline-flex justify-center bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-black py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            Редактировать
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {projects.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Участие в проектах</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((proj) => (
                      <div key={proj.id} className="bg-[#122e41] p-5 rounded-[24px] border border-white/5">
                        <h3 className="font-bold text-lg text-white mb-2">{proj.title}</h3>
                        <p className="text-gray-400 text-xs mb-4 line-clamp-3">{proj.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-yellow-400 text-xs font-bold">{proj.role || 'Участник'}</span>
                          <span className="text-[10px] font-bold text-green-400">
                            {proj.status === 'active' ? 'Активный' : 'Завершён'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Мои команды</h2>
            <button onClick={() => setShowCreateTeam(true)} className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl text-xs uppercase">
              + Создать команду
            </button>
          </div>
          {loadingData ? <p className="text-gray-400">Загрузка...</p> : teams.length === 0 ? (
            <div className="bg-[#122e41] p-12 rounded-[32px] border border-white/5 text-center text-gray-400">Вы не состоите ни в одной команде</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div key={team.membership_id} className="bg-[#122e41] p-6 rounded-[32px] border border-white/5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white mb-1">{team.team_name}</h3>
                      <p className="text-gray-400 text-xs">Членов: {team.member_count || 1}</p>
                    </div>
                    {team.is_owner && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTeam(team)}
                          className="px-3 py-1.5 text-xs font-bold text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-400/10"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => void handleDeleteTeam(team)}
                          className="px-3 py-1.5 text-xs font-bold text-rose-300 border border-rose-500/30 rounded-lg hover:bg-rose-500/10"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>

                  {team.mission && (
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{team.mission}</p>
                  )}

                  {team.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {team.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {team.looking_for && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-sky-300 font-bold mb-1">Вакансии</p>
                      <p className="text-sm text-gray-300">{team.looking_for}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ITQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} onNavigate={onNavigate} />
      <CreateProjectModal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} onSubmit={handleCreateProject} />
      <CreateTeamModal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        userId={user?.id}
        onSubmit={handleCreateTeam}
      />
      <EditTeamModal
        team={editingTeam}
        userId={user?.id}
        onClose={() => setEditingTeam(null)}
        onSubmit={handleUpdateTeam}
      />
      {managedProject && user && (
        <MySubmittedProjectModal
          projectId={managedProject.id}
          userId={user.id}
          mode={managedProject.mode}
          onClose={() => setManagedProject(null)}
          onUpdated={() => {
            setSaveMessage('Проект обновлён');
            void loadSubmittedProjects();
          }}
          onDeleted={() => {
            setSaveMessage('Проект удалён');
            void loadSubmittedProjects();
          }}
        />
      )}
    </main>
  );
};
