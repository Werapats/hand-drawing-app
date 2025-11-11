'use client';

import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

interface BattleDrawingProps {
  roomId: string;
  isPlayer1: boolean;
  onTimeUp: () => void;
  onQuit: () => void;
}

export default function BattleDrawing({ roomId, isPlayer1, onTimeUp, onQuit }: BattleDrawingProps) {
  const { user } = useAuth();
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const myCanvasRef = useRef<HTMLCanvasElement>(null);
  const myDrawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const opponentDrawingRef = useRef<HTMLCanvasElement>(null);

  const [timeLeft, setTimeLeft] = useState(180);
  const [currentColor, setCurrentColor] = useState('#3498db');
  const [brushSize, setBrushSize] = useState(8);
  const [topic, setTopic] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [opponentOnline, setOpponentOnline] = useState(true);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // ใช้ useRef เพื่อเก็บค่า prevX, prevY
  const prevX = useRef<number | null>(null);
  const prevY = useRef<number | null>(null);

  // นับถอยหลัง
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeUp]);

  // ฟังข้อมูลห้อง
  useEffect(() => {
    const roomRef = doc(db, 'battleRooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setTopic(data.topic?.topic || '');
        
        const opponent = isPlayer1 ? data.player2 : data.player1;
        if (opponent) {
          setOpponentEmail(opponent.email || '');
          setOpponentOnline(opponent.online !== false);
          
          // ถ้าคู่แข่งออก
          if (opponent.online === false) {
            setTimeout(() => {
              onTimeUp();
            }, 2000);
          }
          
          // วาดภาพคู่แข่ง
          if (opponent.drawing && opponentDrawingRef.current) {
            const img = new Image();
            img.onload = () => {
              const ctx = opponentDrawingRef.current?.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, opponentDrawingRef.current!.width, opponentDrawingRef.current!.height);
                ctx.drawImage(img, 0, 0);
              }
            };
            img.src = opponent.drawing;
          }
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, isPlayer1, onTimeUp]);

  // ส่ง heartbeat ว่ายังเล่นอยู่
useEffect(() => {
  const heartbeat = setInterval(async () => {
    try {
      const roomRef = doc(db, 'battleRooms', roomId);
      const fieldOnline = isPlayer1 ? 'player1.online' : 'player2.online';
      const fieldSearching = isPlayer1 ? 'player1.isSearching' : 'player2.isSearching';
      await updateDoc(roomRef, {
        [fieldOnline]: true,
        [fieldSearching]: false, // ✅ เพิ่ม: ไม่หาคู่แล้ว กำลังเล่นอยู่
        lastActivity: Date.now(),
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }, 5000);

  return () => clearInterval(heartbeat);
}, [roomId, isPlayer1]);

  // ตรวจจับเมื่อปิดหน้าต่าง
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        const roomRef = doc(db, 'battleRooms', roomId);
        const field = isPlayer1 ? 'player1.online' : 'player2.online';
        
        await updateDoc(roomRef, {
          [field]: false,
          status: 'finished',
          winner: isPlayer1 ? 'player2' : 'player1',
        });
      } catch (error) {
        console.error('Error on beforeunload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, isPlayer1]);

  // ฟังก์ชัน uploadDrawing
  const uploadDrawing = async () => {
    if (!myDrawingCanvasRef.current) return;

    try {
      const dataURL = myDrawingCanvasRef.current.toDataURL('image/png');
      const roomRef = doc(db, 'battleRooms', roomId);
      
      const field = isPlayer1 ? 'player1.drawing' : 'player2.drawing';
      await updateDoc(roomRef, {
        [field]: dataURL,
      });
    } catch (error) {
      console.error('Error uploading drawing:', error);
    }
  };

  // เปิดกล้อง + MediaPipe
  useEffect(() => {
    let camera: any;
    let hands: any;

    async function initializeCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          await myVideoRef.current.play();
        }

        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults(onResults);

        if (myVideoRef.current) {
          camera = new Camera(myVideoRef.current, {
            onFrame: async () => {
              if (myVideoRef.current) {
                await hands.send({ image: myVideoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          camera.start();
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    }

    function onResults(results: any) {
      const canvas = myCanvasRef.current;
      const drawingCanvas = myDrawingCanvasRef.current;
      if (!canvas || !drawingCanvas) return;

      const ctx = canvas.getContext('2d');
      const drawCtx = drawingCanvas.getContext('2d');
      if (!ctx || !drawCtx) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const fingers = countFingers(landmarks);

        drawHand(ctx, landmarks, canvas.width, canvas.height);

        if (fingers === 5) {
          drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
          prevX.current = null;
          prevY.current = null;
        } else if (fingers === 1) {
          const indexTip = landmarks[8];
          const x = (1 - indexTip.x) * canvas.width;
          const y = indexTip.y * canvas.height;

          if (prevX.current !== null && prevY.current !== null) {
            drawCtx.beginPath();
            drawCtx.moveTo(prevX.current, prevY.current);
            drawCtx.lineTo(x, y);
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = brushSize;
            drawCtx.lineCap = 'round';
            drawCtx.stroke();

            uploadDrawing();
          }

          prevX.current = x;
          prevY.current = y;
        } else {
          prevX.current = null;
          prevY.current = null;
        }
      }
    }

    initializeCamera();

    return () => {
      if (camera) camera.stop();
      if (myVideoRef.current && myVideoRef.current.srcObject) {
        const stream = myVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentColor, brushSize, roomId, isPlayer1]);

  function countFingers(landmarks: any[]) {
    let fingers = 0;
    if (landmarks[4].x > landmarks[3].x) fingers++;
    const tips = [8, 12, 16, 20];
    for (const tip of tips) {
      if (landmarks[tip].y < landmarks[tip - 2].y) fingers++;
    }
    return fingers;
  }

  function drawHand(ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const s = landmarks[start];
      const e = landmarks[end];
      ctx.beginPath();
      ctx.moveTo((1 - s.x) * w, s.y * h);
      ctx.lineTo((1 - e.x) * w, e.y * h);
      ctx.stroke();
    });
  }

  const handleQuit = async () => {
    try {
      const roomRef = doc(db, 'battleRooms', roomId);
      const field = isPlayer1 ? 'player1.online' : 'player2.online';
      
      await updateDoc(roomRef, {
        [field]: false,
        status: 'finished',
        winner: isPlayer1 ? 'player2' : 'player1',
      });

      onQuit();
    } catch (error) {
      console.error('Error quitting game:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const colors = [
    { name: 'น้ำเงิน', value: '#3498db' },
    { name: 'เขียว', value: '#27ae60' },
    { name: 'แดง', value: '#e74c3c' },
    { name: 'เหลือง', value: '#f1c40f' },
    { name: 'ม่วง', value: '#9b59b6' },
    { name: 'ขาว', value: '#ecf0f1' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-linear-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">🎯 โจทย์: {topic}</h2>
            <p className="text-sm">
              คู่แข่ง: {opponentEmail}
              {!opponentOnline && (
                <span className="ml-2 text-red-300">(ออกจากเกม)</span>
              )}
            </p>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-4xl font-bold">{formatTime(timeLeft)}</p>
              <p className="text-sm">เวลาคงเหลือ</p>
            </div>
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition"
            >
              ❌ ออก
            </button>
          </div>
        </div>
      </div>

      {!opponentOnline && (
        <div className="bg-green-500 text-white p-4 rounded-lg text-center font-bold text-xl animate-pulse">
          🎉 คู่แข่งออกจากเกม คุณชนะ!
        </div>
      )}

      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              ⚠️ ยืนยันการออก
            </h3>
            <p className="text-gray-600 mb-6">
              ถ้าออกตอนนี้ คุณจะแพ้ทันที<br />
              แน่ใจหรือไม่?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleQuit}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600"
              >
                ใช่ ออกเลย
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-400"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-white">✏️ ภาพวาดของคุณ</h3>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video ref={myVideoRef} className="hidden" playsInline />
            <canvas ref={myCanvasRef} width={640} height={480} className="w-full" />
            <canvas
              ref={myDrawingCanvasRef}
              width={640}
              height={480}
              className="absolute top-0 left-0 w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-xl text-white">👀 ภาพวาดคู่แข่ง</h3>
          <div className="relative bg-gray-800 rounded-lg overflow-hidden h-full flex items-center justify-center">
            <canvas
              ref={opponentDrawingRef}
              width={640}
              height={480}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg space-y-3">
        <div>
          <p className="font-bold text-gray-800 mb-2">🎨 เลือกสี:</p>
          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setCurrentColor(color.value)}
                className={`w-12 h-12 rounded-full border-4 transition ${
                  currentColor === color.value ? 'border-black scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-bold text-gray-800 mb-2">📏 ขนาดแปรง:</p>
          <div className="flex gap-2">
            {[3, 5, 8, 12, 20].map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  brushSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}