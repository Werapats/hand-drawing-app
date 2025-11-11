'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface BattleResultProps {
  roomId: string;
  isPlayer1: boolean;
}

export default function BattleResult({ roomId, isPlayer1 }: BattleResultProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [myDrawing, setMyDrawing] = useState('');
  const [opponentDrawing, setOpponentDrawing] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const roomRef = doc(db, 'battleRooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      const roomData = snapshot.data();
      setData(roomData);
      if (roomData) {
        setTopic(roomData.topic?.topic || '');
        setMyDrawing(isPlayer1 ? roomData.player1?.drawing : roomData.player2?.drawing);
        setOpponentDrawing(isPlayer1 ? roomData.player2?.drawing : roomData.player1?.drawing);
        setMyEmail(isPlayer1 ? roomData.player1?.email : roomData.player2?.email);
        setOpponentEmail(isPlayer1 ? roomData.player2?.email : roomData.player1?.email);
        
        if (roomData.votes) {
          setVotes(roomData.votes);
        }

        if (roomData.winner) {
          setWinner(roomData.winner);
          setShowResult(true);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, isPlayer1]);

  const handleVote = async (votedFor: 'player1' | 'player2') => {
    if (hasVoted) return;

    try {
      const roomRef = doc(db, 'battleRooms', roomId);
      await updateDoc(roomRef, {
        [`votes.${votedFor}`]: increment(1),
      });

      setHasVoted(true);

      // รอ 2 วินาทีแล้วเช็คผล
      setTimeout(() => {
        checkWinner();
      }, 2000);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const checkWinner = async () => {
    try {
      const roomRef = doc(db, 'battleRooms', roomId);
      
      let winnerUid = '';
      const totalVotes = votes.player1 + votes.player2;
      
      // ถ้าโหวตครบ 2 คน หรือมีคนออกจากเกม
      const player1Online = data?.player1?.online !== false;
      const player2Online = data?.player2?.online !== false;
      
      if (!player1Online) {
        winnerUid = 'player2';
      } else if (!player2Online) {
        winnerUid = 'player1';
      } else if (totalVotes >= 2) {
        // นับคะแนน
        if (votes.player1 > votes.player2) {
          winnerUid = 'player1';
        } else if (votes.player2 > votes.player1) {
          winnerUid = 'player2';
        } else {
          winnerUid = 'draw';
        }
      } else {
        // ยังโหวตไม่ครบ รอต่อ
        return;
      }

      await updateDoc(roomRef, {
        winner: winnerUid,
        status: 'finished',
      });
    } catch (error) {
      console.error('Error checking winner:', error);
    }
  };

  const getWinnerText = () => {
    if (!winner) return '⏳ กำลังนับคะแนน...';
    if (winner === 'draw') return '🤝 เสมอกัน!';
    
    const myOnline = isPlayer1 ? data?.player1?.online : data?.player2?.online;
    const opponentOnline = isPlayer1 ? data?.player2?.online : data?.player1?.online;
    
    if (winner === (isPlayer1 ? 'player1' : 'player2')) {
      if (opponentOnline === false) {
        return '🎉 คุณชนะ! (คู่แข่งออกจากเกม)';
      }
      return '🎉 คุณชนะ!';
    }
    
    if (myOnline === false) {
      return '😢 คุณแพ้ (เพราะออกจากเกม)';
    }
    return '😢 คุณแพ้';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🏁 ผลการแข่งขัน
            </h1>
            <p className="text-xl text-gray-600">โจทย์: {topic}</p>
          </div>

          {/* ภาพวาดทั้งสองฝ่าย */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* ภาพของฉัน */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-800 text-center">
                ✏️ ภาพวาดของคุณ
              </h3>
              <p className="text-center text-gray-600">{myEmail}</p>
              <div className="border-4 border-blue-500 rounded-lg overflow-hidden bg-white">
                {myDrawing ? (
                  <img src={myDrawing} alt="My drawing" className="w-full" />
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-400">
                    ไม่มีภาพ
                  </div>
                )}
              </div>
              {!hasVoted && !showResult && (
                <button
                  onClick={() => handleVote(isPlayer1 ? 'player1' : 'player2')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  🗳️ โหวตให้ตัวเอง ({votes[isPlayer1 ? 'player1' : 'player2']})
                </button>
              )}
            </div>

            {/* ภาพคู่แข่ง */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-800 text-center">
                🎨 ภาพวาดคู่แข่ง
              </h3>
              <p className="text-center text-gray-600">{opponentEmail}</p>
              <div className="border-4 border-red-500 rounded-lg overflow-hidden bg-white">
                {opponentDrawing ? (
                  <img src={opponentDrawing} alt="Opponent drawing" className="w-full" />
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-400">
                    ไม่มีภาพ
                  </div>
                )}
              </div>
              {!hasVoted && !showResult && (
                <button
                  onClick={() => handleVote(isPlayer1 ? 'player2' : 'player1')}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition"
                >
                  🗳️ โหวตให้คู่แข่ง ({votes[isPlayer1 ? 'player2' : 'player1']})
                </button>
              )}
            </div>
          </div>

          {/* ผลการโหวต */}
          {hasVoted && !showResult && (
            <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 mb-6 text-center">
              <p className="text-2xl font-bold text-gray-800">
                ✅ คุณโหวตแล้ว! กำลังรอผล...
              </p>
            </div>
          )}

          {/* ประกาศผล */}
          {showResult && (
            <div className="bg-linear-to-r from-yellow-400 to-orange-400 rounded-xl p-8 mb-6 text-center">
              <h2 className="text-5xl font-bold text-white mb-4">
                {getWinnerText()}
              </h2>
              <div className="text-3xl font-bold text-white">
                <p>คะแนนโหวต</p>
                <p className="mt-2">
                  {myEmail}: {votes[isPlayer1 ? 'player1' : 'player2']} คะแนน
                </p>
                <p>
                  {opponentEmail}: {votes[isPlayer1 ? 'player2' : 'player1']} คะแนน
                </p>
              </div>
            </div>
          )}

          {/* ปุ่ม */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/battle')}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition"
            >
              🎮 เล่นอีกครั้ง
            </button>
            <button
              onClick={() => router.push('/drawing')}
              className="bg-gray-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-700 transition"
            >
              🏠 กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}