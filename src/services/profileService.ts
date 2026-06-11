import { supabase } from './supabase';
import { PROFILE_FILE_LIMITS, validateProfileFile } from '../constants/profileLimits';
import type { ProfileCertificate, ProfileLink, UserProfile } from '../types/profile';

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const uploadProfileFile = async (
  bucket: 'avatars' | 'certificates',
  userId: string,
  file: File,
  prefix = 'file',
) => {
  const kind = bucket === 'avatars' ? 'avatar' : 'certificate';
  const validation = validateProfileFile(file, kind);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const extension = file.name.split('.').pop() || 'bin';
  const path = `${userId}/${prefix}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: bucket === 'avatars',
    contentType: file.type,
    cacheControl: '3600',
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const buildProfilePatch = (patch: Partial<UserProfile>) => {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      row[key] = value;
    }
  }

  return row;
};

export const buildProfileRow = (
  userId: string,
  email: string,
  profile: UserProfile | null,
  patch: Partial<UserProfile>,
) => {
  const merged = { ...(profile ?? {}), ...patch };
  return {
    id: userId,
    email: merged.email ?? email,
    full_name: merged.full_name ?? '',
    work_place: merged.work_place ?? '',
    specialty: merged.specialty ?? '',
    skills: merged.skills ?? [],
    avatar_url: merged.avatar_url ?? '',
    user_type: merged.user_type ?? 'citizen',
    bio: merged.bio ?? '',
    university: merged.university ?? '',
    course_year: merged.course_year ?? '',
    company: merged.company ?? '',
    experience_years: merged.experience_years ?? null,
    city_interests: merged.city_interests ?? '',
    contact_info: merged.contact_info ?? '',
    links: merged.links ?? [],
    certificates: merged.certificates ?? [],
    quiz_completed_at: merged.quiz_completed_at ?? null,
    quiz_attempts: merged.quiz_attempts ?? 0,
    updated_at: new Date().toISOString(),
  };
};

export const isQuizSkillEntry = (entry: string) =>
  entry.startsWith('Общий результат') || / — \d{1,3}%$/.test(entry);

export const mergeManualSkills = (existingSkills: string[] | undefined, manualInput: string) => {
  const quizSkills = (existingSkills || []).filter(isQuizSkillEntry);
  const manualSkills = manualInput
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isQuizSkillEntry(item));

  return [...quizSkills, ...manualSkills];
};

export { PROFILE_FILE_LIMITS };

export const createUserProject = async (
  userId: string,
  payload: { title: string; description: string; role: string },
) => {
  const { data, error } = await supabase
    .from('user_projects')
    .insert({
      user_id: userId,
      title: payload.title,
      description: payload.description,
      role: payload.role,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createUserTeam = async (
  userId: string,
  payload: { team_name: string; description: string },
) => {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      team_name: payload.team_name,
      description: payload.description,
      created_by: userId,
    })
    .select()
    .single();

  if (teamError) throw teamError;

  const { data: membership, error: memberError } = await supabase
    .from('user_teams')
    .insert({
      user_id: userId,
      team_id: team.id,
      team_name: payload.team_name,
      member_count: 1,
    })
    .select()
    .single();

  if (memberError) throw memberError;
  return { team, membership };
};

export const appendCertificate = (
  profile: UserProfile,
  certificate: ProfileCertificate,
): ProfileCertificate[] => [...(profile.certificates || []), certificate];

export const removeCertificate = (profile: UserProfile, certificateId: string) =>
  (profile.certificates || []).filter((item) => item.id !== certificateId);

export const appendLink = (profile: UserProfile, link: ProfileLink): ProfileLink[] => [
  ...(profile.links || []),
  link,
];

export const removeLink = (profile: UserProfile, linkId: string) =>
  (profile.links || []).filter((item) => item.id !== linkId);

export const buildCertificate = (name: string, url: string, mimeType?: string): ProfileCertificate => ({
  id: randomId(),
  name,
  url,
  mime_type: mimeType,
  uploaded_at: new Date().toISOString(),
});

export const buildLink = (
  type: ProfileLink['type'],
  label: string,
  url: string,
): ProfileLink => ({
  id: randomId(),
  type,
  label,
  url,
});
