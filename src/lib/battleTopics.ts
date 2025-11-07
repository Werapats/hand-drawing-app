// รายการโจทย์วาดรูป
export const battleTopics = [
  { id: 1, topic: '🏠 บ้าน', difficulty: 'easy' },
  { id: 2, topic: '🌳 ต้นไม้', difficulty: 'easy' },
  { id: 3, topic: '☀️ พระอาทิตย์', difficulty: 'easy' },
  { id: 4, topic: '🐱 แมว', difficulty: 'easy' },
  { id: 5, topic: '🐕 สุนัข', difficulty: 'easy' },
  { id: 6, topic: '🚗 รถยนต์', difficulty: 'medium' },
  { id: 7, topic: '🚁 เฮลิคอปเตอร์', difficulty: 'medium' },
  { id: 8, topic: '🦋 ผีเสื้อ', difficulty: 'medium' },
  { id: 9, topic: '🌈 รุ้ง', difficulty: 'medium' },
  { id: 10, topic: '🏰 ปราสาท', difficulty: 'hard' },
  { id: 11, topic: '🦁 สิงโต', difficulty: 'hard' },
  { id: 12, topic: '🚀 จรวด', difficulty: 'hard' },
  { id: 13, topic: '🐉 มังกร', difficulty: 'hard' },
  { id: 14, topic: '🎸 กีตาร์', difficulty: 'medium' },
  { id: 15, topic: '🎨 จานสี', difficulty: 'easy' },
];

// ฟังก์ชันสุ่มโจทย์
export function getRandomTopic() {
  const randomIndex = Math.floor(Math.random() * battleTopics.length);
  return battleTopics[randomIndex];
}

// ประเภทข้อมูลสำหรับ Battle
export interface BattleRoom {
  id: string;
  player1: {
    uid: string;
    email: string;
    drawing?: string; // Base64 image
    ready: boolean;
  };
  player2?: {
    uid: string;
    email: string;
    drawing?: string; // Base64 image
    ready: boolean;
  };
  topic: {
    id: number;
    topic: string;
    difficulty: string;
  };
  status: 'waiting' | 'ready' | 'playing' | 'voting' | 'finished';
  startTime?: number;
  endTime?: number;
  votes?: {
    player1: number;
    player2: number;
  };
  winner?: string;
  createdAt: number;
}