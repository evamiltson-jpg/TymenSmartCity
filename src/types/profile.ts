export type UserType = 'student' | 'it_specialist' | 'citizen';

export interface ProfileLink {
  id: string;
  type: 'github' | 'resume' | 'portfolio' | 'other';
  label: string;
  url: string;
}

export interface ProfileCertificate {
  id: string;
  name: string;
  url: string;
  mime_type?: string;
  uploaded_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  work_place?: string;
  specialty?: string;
  skills?: string[];
  avatar_url?: string;
  user_type?: UserType;
  bio?: string;
  university?: string;
  course_year?: string;
  company?: string;
  experience_years?: number | null;
  city_interests?: string;
  contact_info?: string;
  links?: ProfileLink[];
  certificates?: ProfileCertificate[];
  quiz_completed_at?: string | null;
  quiz_attempts?: number;
  created_at?: string;
  updated_at?: string;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  student: 'Студент',
  it_specialist: 'ИТ-специалист',
  citizen: 'Житель города',
};

export const LINK_TYPE_LABELS: Record<ProfileLink['type'], string> = {
  github: 'GitHub',
  resume: 'Резюме',
  portfolio: 'Портфолио',
  other: 'Другое',
};
