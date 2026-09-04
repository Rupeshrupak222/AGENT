import { Injectable } from '@nestjs/common';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  languages: string[];
  accent: string;
  tone: string;
  avatarColor: string;
}

@Injectable()
export class VoicesService {
  private readonly catalog: VoiceProfile[] = [
    { id: 'priya-warm',         name: 'Priya',     gender: 'Female', languages: ['Hindi', 'Hinglish', 'English'], accent: 'Indian',  tone: 'Warm & Friendly', avatarColor: '#6366f1' },
    { id: 'arjun-professional', name: 'Arjun',     gender: 'Male',   languages: ['Hindi', 'Hinglish'],          accent: 'Indian',  tone: 'Professional',    avatarColor: '#22c55e' },
    { id: 'meera-soft',         name: 'Meera',     gender: 'Female', languages: ['Tamil', 'English'],            accent: 'Indian',  tone: 'Soft & Calm',     avatarColor: '#a855f7' },
    { id: 'kavya-crisp',        name: 'Kavya',     gender: 'Female', languages: ['Telugu', 'English'],           accent: 'Indian',  tone: 'Crisp & Clear',   avatarColor: '#f97316' },
    { id: 'ravi-energetic',     name: 'Ravi',      gender: 'Male',   languages: ['Marathi', 'Hinglish'],         accent: 'Indian',  tone: 'Energetic',       avatarColor: '#06b6d4' },
    { id: 'anjali-confident',   name: 'Anjali',    gender: 'Female', languages: ['Gujarati', 'English'],         accent: 'Indian',  tone: 'Confident',       avatarColor: '#eab308' },
    { id: 'natasha-usa',        name: 'Natasha',   gender: 'Female', languages: ['English'],                     accent: 'US',      tone: 'Neutral',         avatarColor: '#0ea5e9' },
    { id: 'daniel-british',     name: 'Daniel',    gender: 'Male',   languages: ['English'],                     accent: 'British', tone: 'Reassuring',      avatarColor: '#8b5cf6' },
  ];

  list(): VoiceProfile[] {
    return this.catalog;
  }
}
