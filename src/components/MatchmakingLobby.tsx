'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  limit,
} from 'firebase/firestore';
import { getRandomTopic } from '@/lib/battleTopics';
import { useRouter } from 'next/navigation';

export default function MatchmakingLobby() {
  const { user } = useAuth();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;

    if (searching && roomId) {
      // ฟังการเปลี่ยนแปลงของห้อง
      const roomRef = doc(db, 'battleRooms', roomId);
      unsubscribe = onSnapshot(roomRef, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ready') {
          // มีคู่แข่งแล้ว เริ่มเกม!
          setStatusMessage('พบคู่แข่งแล้ว! กำลังเริ่มเกม...');
          setTimeout(() => {
            router.push(`/battle?roomId=${roomId}`);
          }, 2000);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [searching, roomId, user, router]);

  const startMatchmaking = async () => {
    if (!user) return;

    setSearching(true);
    setStatusMessage('กำลังค้นหาคู่แข่ง...');

    try {
      // หาห้องที่รอคนอยู่
      const roomsRef = collection(db, 'battleRooms');
      const q = query(
        roomsRef,
        where('status', '==', 'waiting'),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // เจอห้องที่รออยู่ เข้าร่วมเลย
        const existingRoom = snapshot.docs[0];
        const existingRoomId = existingRoom.id;

        await updateDoc(doc(db, 'battleRooms', existingRoomId), {
          player2: {
            uid: user.uid,
            email: user.email,
            ready: false,
          },
          status: 'ready',
        });

        setRoomId(existingRoomId);
        setStatusMessage('พบคู่แข่งแล้ว! กำลังเริ่มเกม...');
        
        setTimeout(() => {
          router.push(`/battle?roomId=${existingRoomId}`);
        }, 2000);
      } else {
        // ไม่เจอห้อง สร้างห้องใหม่
        const topic = getRandomTopic();
        const newRoom = {
          player1: {
            uid: user.uid,
            email: user.email,
            ready: false,
          },
          topic,
          status: 'waiting',
          createdAt: Date.now(),
        };

        const docRef = await addDoc(collection(db, 'battleRooms'), newRoom);
        setRoomId(docRef.id);
        setStatusMessage('กำลังรอคู่แข่ง...');
      }
    } catch (error) {
      console.error('Error in matchmaking:', error);
      setStatusMessage('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setSearching(false);
    }
  };

  const cancelMatchmaking = () => {
    setSearching(false);
    setRoomId(null);
    setStatusMessage('');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-purple-700 to-pink-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          ⚔️ โหมดแบทเทิล
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          แข่งวาดรูปกับคู่แข่งแบบ 1 ต่อ 1
        </p>

        <div className="bg-linear-to-r from-yellow-100 to-yellow-50 rounded-xl p-6 mb-8 border-2 border-yellow-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📜 กติกา</h2>
          <ul className="text-left text-gray-700 space-y-2">
            <li>⏱️ <strong>เวลา:</strong> 3 นาที</li>
            <li>🎯 <strong>โจทย์:</strong> สุ่มให้อัตโนมัติ</li>
            <li>👀 <strong>ดูกัน:</strong> เห็นภาพวาดของคู่แข่ง Real-time</li>
            <li>🗳️ <strong>โหวต:</strong> ทั้งคู่โหวตให้กันหลังจบ</li>
            <li>🏆 <strong>ชนะ:</strong> คนที่ได้คะแนนโหวตมากกว่า</li>
          </ul>
        </div>

        {!searching ? (
          <button
            onClick={startMatchmaking}
            className="bg-linear-to-r from-green-500 to-blue-500 text-white px-16 py-6 rounded-xl text-3xl font-bold hover:from-green-600 hover:to-blue-600 transition transform hover:scale-105 shadow-lg"
          >
            🎮 เริ่มหาคู่แข่ง
          </button>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center items-center space-x-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
              <p className="text-2xl font-bold text-gray-700">{statusMessage}</p>
            </div>
            
            <button
              onClick={cancelMatchmaking}
              className="bg-red-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-600 transition"
            >
              ยกเลิก
            </button>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-gray-200">
          <button
            onClick={() => router.push('/drawing')}
            className="text-gray-600 hover:text-gray-800 font-semibold"
          >
            ← กลับไปฝึกวาด
          </button>
        </div>
      </div>
    </div>
  );
}