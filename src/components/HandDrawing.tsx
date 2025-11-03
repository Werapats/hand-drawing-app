'use client';

import { useRef, useEffect, useState } from 'react';

export default function HandDrawing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#3498db');
  const [brushSize, setBrushSize] = useState(8);
  const [fingerCount, setFingerCount] = useState(0);
  const [status, setStatus] = useState('กำลังเริ่มต้น...');
  const currentColorRef = useRef(currentColor);

useEffect(() => {
  currentColorRef.current = currentColor;
}, [currentColor]);
const brushSizeRef = useRef(brushSize);

useEffect(() => {
  brushSizeRef.current = brushSize;
}, [brushSize]);


  const colors = [
    { name: '🔵 น้ำเงิน', value: '#3498db' },
    { name: '🟢 เขียว', value: '#27ae60' },
    { name: '🔴 แดง', value: '#e74c3c' },
    { name: '🟡 เหลือง', value: '#f1c40f' },
    { name: '🟣 ม่วง', value: '#9b59b6' },
    { name: '⚪ ขาว', value: '#ecf0f1' },
    { name: '🟠 ส้ม', value: '#e67e22' },
    { name: '💗 ชมพู', value: '#ff69b4' },
  ];

  useEffect(() => {
    let animationId: number | null = null;
    let hands: any;

    async function initializeCamera() {
      try {
        // ขอสิทธิ์กล้อง
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('พร้อมใช้งาน');
        }

        // โหลด MediaPipe Hands
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

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                await hands.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
          });
          camera.start();
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setStatus('ไม่สามารถเข้าถึงกล้องได้');
      }
    }

    function onResults(results: any) {
      const canvas = canvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      if (!canvas || !drawingCanvas) return;

      const ctx = canvas.getContext('2d');
      const drawCtx = drawingCanvas.getContext('2d');
      if (!ctx || !drawCtx) return;

      // ล้างและวาดวิดีโอ
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // นับนิ้ว
        const fingers = countFingers(landmarks);
        setFingerCount(fingers);

        // วาดโครงมือ
        drawConnectors(ctx, landmarks, canvas.width, canvas.height);
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height);

        // ถ้าชู 5 นิ้ว = ลบ
        if (fingers === 5) {
          clearCanvas();
          setStatus('ล้างหน้าจอ!');
        }
        // ถ้าชี้นิ้วเดียว = วาด
        else if (fingers === 1) {
          const indexTip = landmarks[8];
          const x = (1 - indexTip.x) * canvas.width; // กลับซ้าย-ขวา
          const y = indexTip.y * canvas.height;

          drawOnCanvas(x, y);
          setIsDrawing(true);
          setStatus('กำลังวาด');
        } else {
          setIsDrawing(false);
          setStatus('ยกปากกา');
        }
      } else {
        setFingerCount(0);
        setStatus('ไม่พบมือ');
      }
    }

    initializeCamera();

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  let prevX: number | null = null;
  let prevY: number | null = null;

  function drawOnCanvas(x: number, y: number) {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (prevX !== null && prevY !== null) {
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = currentColorRef.current;
      ctx.lineWidth = brushSizeRef.current;

      ctx.lineCap = 'round';
      ctx.stroke();
    }

    prevX = x;
    prevY = y;
  }

  function countFingers(landmarks: any[]) {
    let fingers = 0;

    // นิ้วหัวแม่มือ
    if (landmarks[4].x > landmarks[3].x) {
      fingers++;
    }

    // นิ้วอื่นๆ
    const tips = [8, 12, 16, 20];
    for (const tip of tips) {
      if (landmarks[tip].y < landmarks[tip - 2].y) {
        fingers++;
      }
    }

    return fingers;
  }

  function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    width: number,
    height: number
  ) {
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
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      ctx.beginPath();
      ctx.moveTo((1 - startPoint.x) * width, startPoint.y * height);
      ctx.lineTo((1 - endPoint.x) * width, endPoint.y * height);
      ctx.stroke();
    });
  }

  function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    width: number,
    height: number
  ) {
    landmarks.forEach((landmark) => {
      const x = (1 - landmark.x) * width;
      const y = landmark.y * height;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function clearCanvas() {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prevX = null;
    prevY = null;
  }

  return (
    <div className="space-y-4">
      {/* คำแนะนำ */}
      <div className="bg-gray-800 text-white p-4 rounded-lg">
        <p className="text-center font-bold">
          👆 ชี้นิ้วชี้เดียว = วาด | ✌️ ชี้ 2 นิ้ว = ยกปากกา | 🖐️ ชู 5 นิ้ว = ลบทั้งหมด
        </p>
      </div>

      {/* พื้นที่แสดงวิดีโอ */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="hidden"
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full"
        />
        <canvas
          ref={drawingCanvasRef}
          width={1280}
          height={720}
          className="absolute top-0 left-0 w-full"
        />

        {/* แสดงข้อมูล */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
          <p>นิ้ว: {fingerCount}</p>
          <p>ขนาดแปรง: {brushSize}px</p>
          <p className={isDrawing ? 'text-green-400' : 'text-gray-400'}>
            สถานะ: {status}
          </p>
        </div>

        {/* แสดงสีปัจจุบัน */}
        <div className="absolute top-4 right-4">
          <div
  className="w-24 h-24 border-4 border-white rounded-lg"
  style={{ backgroundColor: currentColor }}
>
</div>

          <p className="text-white text-center mt-2 font-bold">สีปัจจุบัน</p>
        </div>
      </div>

      {/* ปุ่มควบคุม */}
      <div className="space-y-4">
        {/* เลือกสี */}
        <div>
          <h3 className="font-bold mb-2 text-gray-800">เลือกสี:</h3>
          <div className="grid grid-cols-4 gap-2">
         {colors.map((color) => (
  <button
    key={color.value}
    onClick={() => setCurrentColor(color.value)}
    className={`p-3 rounded-lg font-bold text-white transition ${
      currentColor === color.value ? 'ring-4 ring-blue-500' : ''
    }`}
    style={{ backgroundColor: color.value }}
  >
    {color.name}
  </button>
))}

</div>
</div>
    {/* เลือกขนาดแปรง */}
    <div>
      <h3 className="font-bold mb-2 text-gray-800">ขนาดแปรง:</h3>
      <div className="flex gap-2">
        {[3, 5, 8, 12, 20].map((size) => (
          <button
            key={size}
            onClick={() => setBrushSize(size)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              brushSize === size
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
            }`}
          >
            {size}px
          </button>
        ))}
      </div>
    </div>

    {/* ปุ่มล้างหน้าจอ */}
    <button
      onClick={clearCanvas}
      className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition"
    >
      🗑️ ล้างหน้าจอ
    </button>
  </div>
</div>
);
}