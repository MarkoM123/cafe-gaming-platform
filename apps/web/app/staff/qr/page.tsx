'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

type Table = { id: string; code: string; name?: string | null };
type UserInfo = { email: string; role: string };

type QrRow = {
  id: string;
  code: string;
  name?: string | null;
  url: string;
  dataUrl: string;
};

export default function StaffQrPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [rows, setRows] = useState<QrRow[]>([]);
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

  const loadTables = async () => {
    setError(null);
    const res = await fetch(`${baseUrl}/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('staffToken');
        router.push('/staff/login');
      }
      setError('Ne mogu da učitam stolove.');
      return;
    }
    const data = await res.json();
    setTables(data);
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadTables();
    }
  }, [token]);

  useEffect(() => {
    const build = async () => {
      const origin = window.location.origin;
      const result: QrRow[] = [];
      for (const t of tables) {
        const url = `${origin}/qr/${t.code}`;
        const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 180 });
        result.push({ ...t, url, dataUrl });
      }
      setRows(result);
    };
    if (tables.length > 0) build();
  }, [tables]);

  return (
    <div className="container">
      <h1>QR kodovi za stolove</h1>
      {user && (
        <div className="muted">Ulogovan kao: {user.email} • {user.role}</div>
      )}
      {!isAdmin && (
        <div className="notice">Samo ADMIN može da upravlja QR kodovima.</div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="menu-grid">
          {rows.map((row) => (
            <div key={row.id} className="menu-item">
              <div>
                <strong>{row.name || `Sto ${row.code}`}</strong>
                <div className="muted">{row.url}</div>
              </div>
              <img src={row.dataUrl} alt={`QR ${row.code}`} />
              <div className="controls">
                <a className="btn tiny" href={row.url} target="_blank" rel="noreferrer">
                  Otvori meni
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
