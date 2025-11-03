'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Register({ onToggle }: { onToggle: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      router.push('/drawing');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้ว');
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
        📝 สมัครสมาชิก
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            อีเมล
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสผ่าน
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ยืนยันรหัสผ่าน
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
        >
          {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
      </form>

      <p className="mt-4 text-center text-gray-600">
        มีบัญชีอยู่แล้ว?{' '}
        <button
          onClick={onToggle}
          className="text-blue-600 hover:underline font-semibold"
        >
          เข้าสู่ระบบ
        </button>
      </p>
    </div>
  );
}