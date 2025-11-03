'use client';

import { useState } from 'react';
import Login from '@/components/Login';
import Register from '@/components/Register';

export default function Home() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      {showLogin ? (
        <Login onToggle={() => setShowLogin(false)} />
      ) : (
        <Register onToggle={() => setShowLogin(true)} />
      )}
    </main>
  );
}