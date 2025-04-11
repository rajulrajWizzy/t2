'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin login page
    router.push('/admin/login');
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-b from-white to-gray-100">
      <div className="max-w-xl mx-auto p-8 rounded-lg shadow-md bg-white">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Coworks API Backend
        </h1>
        <p className="mb-8 text-gray-600">
          Redirecting to admin login...
        </p>
      </div>
    </main>
  );
}