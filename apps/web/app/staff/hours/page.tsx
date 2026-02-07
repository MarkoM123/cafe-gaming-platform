'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Hour = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

type UserInfo = { email: string; role: string };

const dayLabels = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

export default function StaffHoursPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiBase = `${baseUrl}/api`;

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [hours, setHours] = useState<Hour[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setUser({ email: data.email, role: data.role });
  };

  const loadHours = async () => {
    setError(null);
    const res = await fetch(`${apiBase}/settings/hours`);
    if (!res.ok) {
      setError('Ne mogu da učitam radno vreme.');
      return;
    }
    const data = await res.json();
    setHours(data);
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadHours();
    }
  }, [token]);

  const save = async () => {
    if (!isAdmin) return;
    setInfo(null);
    const res = await fetch(`${apiBase}/settings/hours`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hours }),
    });
    if (!res.ok) {
      setError('Greška pri snimanju.');
      return;
    }
    setInfo('Sačuvano.');
    loadHours();
  };

  return (
    <div className="container">
      <h1>Radno vreme</h1>
      {user && (
        <div className="muted">Ulogovan kao: {user.email} • {user.role}</div>
      )}
      {!isAdmin && (
        <div className="notice">Samo ADMIN može da menja radno vreme.</div>
      )}
      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}

      <div className="card">
        <ul className="list">
          {hours.map((h, index) => (
            <li key={h.id} className="row">
              <div className="grow">
                <strong>{dayLabels[h.dayOfWeek] || `Dan ${h.dayOfWeek}`}</strong>
              </div>
              <label className="muted">
                <input
                  type="checkbox"
                  checked={h.isClosed}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setHours((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, isClosed: value } : item,
                      ),
                    );
                  }}
                  disabled={!isAdmin}
                />
                Zatvoreno
              </label>
              <input
                type="time"
                value={h.openTime}
                onChange={(e) => {
                  const value = e.target.value;
                  setHours((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, openTime: value } : item,
                    ),
                  );
                }}
                disabled={!isAdmin || h.isClosed}
              />
              <input
                type="time"
                value={h.closeTime}
                onChange={(e) => {
                  const value = e.target.value;
                  setHours((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, closeTime: value } : item,
                    ),
                  );
                }}
                disabled={!isAdmin || h.isClosed}
              />
            </li>
          ))}
        </ul>
        <button onClick={save} className="primary" disabled={!isAdmin}>
          Sačuvaj
        </button>
      </div>
    </div>
  );
}
