
import React from 'react';

export interface NewsArticle {
  id: number | string;
  imageUrl: string;
  date: string;
  date_iso?: string;
  title?: string;
  description: string;
  full_text?: string;
  tag?: string;
  link?: string;
}

export interface ProjectData {
  id: number | string;
  title: string;
  status: string;
  statusColor: string;
  category: string;
  rating: number;
  votes: number;
  desc: string;
  tags: string[];
  team: string;
  participants: number;
  imageUrl: string;
  projectType: 'city' | 'commercial';
  createdBy?: string | null;
}

export interface StudentStory {
  id: number;
  name: string;
  role: string;
  text: string;
  awards: string[];
  imageUrl: string;
}

export interface CampusTeam {
  id: number;
  title: string;
  desc: string;
  members: number;
  tags: string[];
  stack: string;
  date: string;
  status: string;
}

export interface CampusEvent {
  id: number;
  type: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  participants: string;
  buttonText: string;
  bgColor: string;
}

export interface Member {
  id: number;
  name: string;
  role: string;
  imageUrl?: string;
}

export interface Resource {
  id: number;
  name: string;
  icon: string | React.ReactNode;
  format?: string;
  size?: string;
  imageUrl?: string;
}

export interface EventItem {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  bgColor: string;
  textColor: string;
  colSpan?: number;
  rowSpan?: number;
}

// НОВЫЙ ИНТЕРФЕЙС
export interface ServiceItem {
  id: number;
  title: string;
  category: string;
  desc?: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
  buttonText?: string;
  button_text?: string;
  url?: string;
}
export interface ManagementStep {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  stat1_val: string;
  stat1_desc: string;
  stat2_val: string;
  stat2_desc: string;
  buttonText: string;
  buttonColor: string;
}
