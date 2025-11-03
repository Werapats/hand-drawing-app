'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import HandDrawing from '@/components/HandDrawing';

export default function DrawingPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showDrawing, setShowDrawing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 to-gray-700 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🎨 ห้องฝึกวาดรูป
              </h1>
              <p className="text-gray-600 mt-1">
                ยินดีต้อนรับ: {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* ปุ่มเริ่มวาด */}
        {!showDrawing ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              พร้อมที่จะวาดรูปแล้วหรือยัง?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              กดปุ่มด้านล่างเพื่อเริ่มฝึกวาดรูปด้วย AI
            </p>
            <button
              onClick={() => setShowDrawing(true)}
              className="bg-linear-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-lg text-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105"
            >
              🎨 เริ่มวาดรูป
            </button>
            
            {/* ฟีเจอร์ที่จะมาในอนาคต */}
            <div className="mt-12 p-6 bg-gray-100 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-700 mb-4">
                🚀 ฟีเจอร์ที่กำลังจะมาแน่นอนแต่ไม่นอนแน่นะจ๊ะ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-bold text-gray-800">👥 จับคู่ 1-1 ออนไลน์</p>
                  <p className="text-gray-600 text-sm">วาดรูปกับเพื่อนแบบ Real-time</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-bold text-gray-800">🏆 ระบบแข่งขัน</p>
                  <p className="text-gray-600 text-sm">แข่งวาดรูปและรับคะแนน</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-bold text-gray-800">💾 บันทึกผลงาน</p>
                  <p className="text-gray-600 text-sm">เก็บรูปที่วาดไว้ดูย้อนหลัง</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="font-bold text-gray-800">🎯 ภารกิจวาดรูป</p>
                  <p className="text-gray-600 text-sm">ทำภารกิจและปลดล็อกรางวัล</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                กำลังวาดรูป...
              </h2>
              <button
                onClick={() => setShowDrawing(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-600 transition"
              >
                ← กลับ
              </button>
            </div>
            <HandDrawing />
          </div>
        )}
      </div>
    </div>
  );
}