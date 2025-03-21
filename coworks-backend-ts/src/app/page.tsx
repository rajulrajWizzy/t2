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
        
        <div className="flex flex-col gap-4 md:flex-row md:gap-4 justify-center mt-8">
          <Link href="/admin/login" className="btn-primary">
            Admin Login
          </Link>
          
          <Link href="/api/status" className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium no-underline">
            API Status
          </Link>
          
          <Link href="/api/database-status" className="px-4 py-2 bg-green-200 text-green-800 rounded font-medium no-underline">
            Database Check
          </Link>
          
          <Link href="/api/test" className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium no-underline">
            API Test
          </Link>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Default super admin credentials:</p>
          <p>Username: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">superadmin</span></p>
          <p>Password: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">CoWorks@SuperAdmin2023</span></p>
        </div>
      </div>
    </main>
  );
}