'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
  user?: { id: string; email: string; role: string } | null;
};

type UserInfo = { email: string; role: string };

export default function StaffAuditPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const saved = localStorage.getItem('staffToken');
    if (saved) {
      setToken(saved);
    } else {
      router.push('/staff/login');
    }
  }, [router]);

  const loadUser = async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setUser({ email: data.email, role: data.role });
  };

  const loadLogs = async () => {
    if (!token) return;
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (entityType) params.set('entityType', entityType);
    if (action) params.set('action', action);

    const res = await fetch(`${baseUrl}/audit?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('staffToken');
        router.push('/staff/login');
      }
      setError('Ne mogu da učitam audit log.');
      return;
    }
    setLogs(await res.json());
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadLogs();
    }
  }, [token]);

  return (
    <div className="container">
      <h1>Audit log</h1>
      {user && (
        <div className="muted">Ulogovan kao: {user.email} • {user.role}</div>
      )}
      {!isAdmin && (
        <div className="notice">Samo ADMIN može da vidi audit log.</div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="card">
        <label>Od</label>
        <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!isAdmin} />
        <label>Do</label>
        <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} disabled={!isAdmin} />
        <label>Entity</label>
        <input value={entityType} onChange={(e) => setEntityType(e.target.value)} disabled={!isAdmin} />
        <label>Akcija</label>
        <input value={action} onChange={(e) => setAction(e.target.value)} disabled={!isAdmin} />
        <button onClick={loadLogs} className="primary" disabled={!isAdmin}>Pretraži</button>
      </div>

      <div className="card">
        <ul className="list">
          {logs.map((log) => (
            <li key={log.id} className="row">
              <div className="grow">
                <div>
                  <strong>{log.action}</strong> • {log.entityType} • {log.entityId}
                </div>
                <div className="muted">
                  {new Date(log.createdAt).toLocaleString()} • {log.user?.email || 'System'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
