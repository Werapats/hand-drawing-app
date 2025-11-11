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
  deleteDoc,
  getDoc,
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
      const roomRef = doc(db, 'battleRooms', roomId);
      unsubscribe = onSnapshot(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
          setStatusMessage('คู่แข่งยกเลิก กำลังกลับสู่หน้าหลัก...');
          setTimeout(() => {
            setSearching(false);
            setRoomId(null);
          }, 2000);
          return;
        }

        const data = snapshot.data();
        if (data?.status === 'ready' && data?.player2) {
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

  // ล้างห้องเก่าที่มีอายุเกิน 5 นาที
  const cleanOldRooms = async () => {
    try {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const roomsRef = collection(db, 'battleRooms');
      const q = query(
        roomsRef,
        where('createdAt', '<', fiveMinutesAgo)
      );
      const snapshot = await getDocs(q);

      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, 'battleRooms', document.id));
      }
    } catch (error) {
      console.error('Error cleaning old rooms:', error);
    }
  };

  const startMatchmaking = async () => {
    if (!user) return;

    setSearching(true);
    setStatusMessage('กำลังค้นหาคู่แข่ง...');

    try {
      // ล้างห้องเก่าก่อน
      await cleanOldRooms();

      // หาห้องที่รอคนอยู่ (ต้องมีทุกเงื่อนไขนี้)
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const roomsRef = collection(db, 'battleRooms');
      const q = query(
        roomsRef,
        where('status', '==', 'waiting'),
        where('createdAt', '>', oneMinuteAgo),
        where('player1.online', '==', true),
        where('player1.isSearching', '==', true), // ✅ เพิ่มเงื่อนไขนี้
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingRoom = snapshot.docs[0];
        const existingRoomData = existingRoom.data();
        const existingRoomId = existingRoom.id;

        // เช็คว่าไม่ใช่ห้องของตัวเอง
        if (existingRoomData.player1?.uid === user.uid) {
          setRoomId(existingRoomId);
          setStatusMessage('กำลังรอคู่แข่ง...');
          return;
        }

        // Double check ว่า player1 ยังกำลังหาคู่อยู่จริง
        const roomSnapshot = await getDoc(doc(db, 'battleRooms', existingRoomId));
        const currentData = roomSnapshot.data();
        
        if (!currentData || 
            currentData.player1?.online !== true || 
            currentData.player1?.isSearching !== true || // ✅ เช็คเพิ่ม
            currentData.status !== 'waiting') {
          // ห้องไม่ valid แล้ว ลบทิ้ง
          await deleteDoc(doc(db, 'battleRooms', existingRoomId));
          // ลองหาใหม่
          startMatchmaking();
          return;
        }

        // เข้าร่วมห้อง
        await updateDoc(doc(db, 'battleRooms', existingRoomId), {
          player2: {
            uid: user.uid,
            email: user.email,
            ready: true,
            online: true,
            isSearching: true, // ✅ เพิ่ม
          },
          status: 'ready',
          lastActivity: Date.now(),
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
            ready: true,
            online: true,
            isSearching: true, // ✅ เพิ่ม
          },
          topic,
          status: 'waiting',
          createdAt: Date.now(),
          lastActivity: Date.now(),
          votes: {
            player1: 0,
            player2: 0,
          },
        };

        const docRef = await addDoc(collection(db, 'battleRooms'), newRoom);
        setRoomId(docRef.id);
        setStatusMessage('กำลังรอคู่แข่ง...');

        // เริ่มส่ง heartbeat
        startHeartbeat(docRef.id);
      }
    } catch (error) {
      console.error('Error in matchmaking:', error);
      setStatusMessage('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setSearching(false);
    }
  };

  // Heartbeat เพื่อบอกว่ายังออนไลน์และยังหาคู่อยู่
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const startHeartbeat = (roomId: string) => {
    heartbeatInterval = setInterval(async () => {
      try {
        const roomRef = doc(db, 'battleRooms', roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          await updateDoc(roomRef, {
            'player1.online': true,
            'player1.isSearching': true, // ✅ เพิ่ม
            lastActivity: Date.now(),
          });
        } else {
          // ห้องถูกลบแล้ว หยุด heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 5000); // ทุก 5 วินาที
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const cancelMatchmaking = async () => {
    stopHeartbeat();

    if (roomId) {
      try {
        const roomRef = doc(db, 'battleRooms', roomId);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          // ลบห้องถ้ายังไม่มีคู่
          if (roomData.status === 'waiting' && !roomData.player2) {
            await deleteDoc(roomRef);
          } else {
            // ถ้ามีคู่แล้ว แค่อัพเดทว่าไม่หาคู่แล้ว
            await updateDoc(roomRef, {
              'player1.isSearching': false,
            });
          }
        }
      } catch (error) {
        console.error('Error canceling matchmaking:', error);
      }
    }
    
    setSearching(false);
    setRoomId(null);
    setStatusMessage('');
  };

  // Cleanup เมื่อ component unmount หรือออกจากหน้า
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (roomId && searching) {
        const cleanup = async () => {
          try {
            const roomRef = doc(db, 'battleRooms', roomId);
            const roomSnap = await getDoc(roomRef);
            
            if (roomSnap.exists()) {
              const roomData = roomSnap.data();
              if (roomData.status === 'waiting' && !roomData.player2) {
                // ลบห้องถ้ายังไม่มีคู่
                await deleteDoc(roomRef);
              } else {
                // มีคู่แล้ว แค่อัพเดทสถานะ
                await updateDoc(roomRef, {
                  'player1.isSearching': false,
                  'player1.online': false,
                });
              }
            }
          } catch (error) {
            console.error('Error cleanup:', error);
          }
        };
        cleanup();
      }
    };
  }, []);

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
            <li>⚠️ <strong>หมายเหตุ:</strong> ถ้าออกระหว่างเกม จะแพ้ทันที</li>
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
              ❌ ยกเลิก
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