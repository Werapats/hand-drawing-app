'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import MatchmakingLobby from '@/components/MatchmakingLobby';
import BattleDrawing from '@/components/BattleDrawing';
import BattleResult from '@/components/BattleResult';

function BattlePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'voting'>('lobby');
  const [isPlayer1, setIsPlayer1] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (!roomId) {
      setGameState('lobby');
      return;
    }

    // ฟังสถานะห้อง
    const roomRef = doc(db, 'battleRooms', roomId);
    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      if (data) {
        // เช็คว่าเป็น player 1 หรือ 2
        const isP1 = data.player1?.uid === user.uid;
        setIsPlayer1(isP1);

        // อัพเดทสถานะเกม
        if (data.status === 'ready') {
          // เริ่มเกม
          if (!data.startTime) {
            await updateDoc(roomRef, {
              status: 'playing',
              startTime: Date.now(),
            });
          }
          setGameState('playing');
        } else if (data.status === 'playing') {
          setGameState('playing');
        } else if (data.status === 'voting' || data.status === 'finished') {
          setGameState('voting');
        }
      }
    });

    return () => unsubscribe();
  }, [user, roomId, router]);

  const handleTimeUp = async () => {
    if (!roomId) return;

    try {
      const roomRef = doc(db, 'battleRooms', roomId);
      await updateDoc(roomRef, {
        status: 'voting',
        endTime: Date.now(),
      });
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">กำลังโหลด...</p>
      </div>
    );
  }

  if (!roomId || gameState === 'lobby') {
    return <MatchmakingLobby />;
  }

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <BattleDrawing roomId={roomId} isPlayer1={isPlayer1} onTimeUp={handleTimeUp} />
      </div>
    );
  }

  if (gameState === 'voting') {
    return <BattleResult roomId={roomId} isPlayer1={isPlayer1} />;
  }

  return null;
}

export default function BattlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">กำลังโหลด...</p>
      </div>
    }>
      <BattlePageContent />
    </Suspense>
  );
}