'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffLoginPage() {
  const router = useRouter();
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiBase = `${baseUrl}/api`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError(null);
    setLoading(true);
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError('Login failed.');
      setLoading(false);
      return;
    }
    const data = await res.json();
    localStorage.setItem('staffToken', data.access_token);
    setLoading(false);
    router.push('/staff/orders');
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Staff Login</h1>
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={login} className="primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
