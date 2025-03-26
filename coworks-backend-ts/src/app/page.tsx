'use client';

import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ color: '#0070f3', marginBottom: '20px' }}>CoWorks API</h1>
      <p>Welcome to the CoWorks API. Please use one of the following endpoints:</p>
      
      <section style={{ marginTop: '30px' }}>
        <h2 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px' }}>Public Endpoints</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ margin: '10px 0' }}>
            <Link href="/api/status" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '5px', textDecoration: 'none' }}>
              <span style={{ backgroundColor: '#0070f3', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>✓</span>
              API Status Check
            </Link>
          </li>
          <li style={{ margin: '10px 0' }}>
            <Link href="/api/test" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '5px', textDecoration: 'none' }}>
              <span style={{ backgroundColor: '#0070f3', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>✓</span>
              Test Endpoint
            </Link>
          </li>
          <li style={{ margin: '10px 0' }}>
            <Link href="/api/setup/database-status" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '5px', textDecoration: 'none' }}>
              <span style={{ backgroundColor: '#0070f3', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>✓</span>
              Database Status
            </Link>
          </li>
          <li style={{ margin: '10px 0' }}>
            <Link href="/api/setup/fix-customers-table" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '5px', textDecoration: 'none' }}>
              <span style={{ backgroundColor: '#0070f3', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>✓</span>
              Fix Customers Table
            </Link>
          </li>
        </ul>
      </section>
      
      <section style={{ marginTop: '30px' }}>
        <h2 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px' }}>Authentication</h2>
        <ul>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/auth/login</code> - User login</li>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/auth/register</code> - User registration</li>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/auth/forgot-password</code> - Password reset request</li>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/auth/reset-password</code> - Reset password with token</li>
        </ul>
      </section>
      
      <section style={{ marginTop: '30px' }}>
        <h2 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px' }}>Admin Authentication</h2>
        <ul>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/admin/auth/login</code> - Admin login</li>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/admin/auth/reset-password</code> - Admin password reset</li>
        </ul>
      </section>
      
      <section style={{ marginTop: '30px' }}>
        <h2 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px' }}>Setup Endpoints</h2>
        <ul>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/setup/fix-customers-table</code> - Fix customers table</li>
          <li><code style={{ background: '#f1f1f1', padding: '3px 5px', borderRadius: '3px' }}>/api/setup/database-status</code> - Check database status (GET) or fix issues (POST)</li>
        </ul>
      </section>
      
      <footer style={{ marginTop: '50px', textAlign: 'center', fontSize: '14px', color: '#666', borderTop: '1px solid #eaeaea', paddingTop: '20px' }}>
        CoWorks API © {new Date().getFullYear()}
      </footer>
    </div>
  );
}