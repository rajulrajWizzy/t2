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
        
        <div className="flex flex-col gap-4 justify-center mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/admin/login?role=branch_admin" className="px-4 py-2 bg-blue-500 text-white rounded font-medium no-underline hover:bg-blue-600">
              Branch Admin Login
            </Link>
            
            <Link href="/admin/login?role=super_admin" className="px-4 py-2 bg-purple-600 text-white rounded font-medium no-underline hover:bg-purple-700">
              Super Admin Login
            </Link>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-700 mt-6 mb-2">System Status</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
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
        </div>
        
        <div className="mt-8 text-sm text-gray-500 border-t pt-4">
          <p className="font-semibold mb-1">Default credentials:</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-left">
            <div>Super Admin:</div>
            <div className="font-mono bg-gray-100 px-1 py-0.5 rounded">superadmin</div>
            <div>Password:</div>
            <div className="font-mono bg-gray-100 px-1 py-0.5 rounded">CoWorks@SuperAdmin2023</div>
          </div>
        </div>
      </div>
    </main>
  );
}