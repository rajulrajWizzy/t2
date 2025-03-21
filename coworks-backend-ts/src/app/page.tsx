'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-b from-white to-gray-100">
      <div className="max-w-xl mx-auto p-8 rounded-lg shadow-md bg-white">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Coworks API Backend
        </h1>
        <p className="mb-8 text-gray-600">
          Welcome to the Coworks coworking space management system backend API.
        </p>
        
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/admin/login" className="btn-primary">
            Admin Login
          </Link>
          
          <Link href="/api/test" className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium no-underline">
            API Test
          </Link>
        </div>
      </div>
    </main>
  );
}