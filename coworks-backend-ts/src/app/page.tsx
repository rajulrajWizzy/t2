'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Coworks Space Management</h1>
          <p className="text-gray-600 text-lg">Your all-in-one solution for coworking space management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">For Customers</h2>
            <p className="text-gray-600 mb-4">Book workspaces, manage your profile, and view your bookings</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-700 mb-2">For Branch Admins</h2>
            <p className="text-gray-600 mb-4">Manage your branch, seats, bookings, and customer relationships</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-indigo-700 mb-2">For Super Admins</h2>
            <p className="text-gray-600 mb-4">Oversee all branches, manage admins, and monitor global metrics</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-4">
          <button 
            onClick={() => router.push('/login')}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Customer Login
          </button>
          <button 
            onClick={() => router.push('/admin/login')}
            className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Admin Login
          </button>
          <button 
            onClick={() => router.push('/admin/login?role=superadmin')}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Super Admin Login
          </button>
        </div>
      </div>

      <div className="mt-8 text-gray-600 text-center">
        <p> 2025 Coworks Space Management. All rights reserved.</p>
      </div>
    </div>
  );
}