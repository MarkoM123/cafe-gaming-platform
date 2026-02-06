'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Game = { id: string; name: string; isActive: boolean };
type Station = { id: string; name: string; isActive: boolean };

type UserInfo = { email: string; role: string };

export default function StaffGamesPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [newGame, setNewGame] = useState('');
  const [newStation, setNewStation] = useState('');
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

  const loadData = async () => {
    setError(null);
    const [gamesRes, stationsRes] = await Promise.all([
      fetch(`${baseUrl}/games/all`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${baseUrl}/game-stations/all`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!gamesRes.ok || !stationsRes.ok) {
      if (gamesRes.status === 401 || stationsRes.status === 401) {
        localStorage.removeItem('staffToken');
        router.push('/staff/login');
      }
      setError('Failed to load games/stations.');
      return;
    }

    setGames(await gamesRes.json());
    setStations(await stationsRes.json());
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadData();
    }
  }, [token]);

  const createGame = async () => {
    if (!isAdmin || !newGame.trim()) return;
    const res = await fetch(`${baseUrl}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newGame.trim() }),
    });
    if (res.ok) {
      setNewGame('');
      loadData();
    }
  };

  const createStation = async () => {
    if (!isAdmin || !newStation.trim()) return;
    const res = await fetch(`${baseUrl}/game-stations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newStation.trim() }),
    });
    if (res.ok) {
      setNewStation('');
      loadData();
    }
  };

  const updateGame = async (game: Game) => {
    if (!isAdmin) return;
    await fetch(`${baseUrl}/games/${game.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: game.name, isActive: game.isActive }),
    });
    loadData();
  };

  const updateStation = async (station: Station) => {
    if (!isAdmin) return;
    await fetch(`${baseUrl}/game-stations/${station.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: station.name, isActive: station.isActive }),
    });
    loadData();
  };

  return (
    <div className="container">
      <h1>Igre i stanice</h1>
      {user && (
        <div className="muted">Ulogovan kao: {user.email} • {user.role}</div>
      )}
      {!isAdmin && (
        <div className="notice">Samo ADMIN može da menja igre i stanice.</div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Dodaj igru</h3>
        <input
          value={newGame}
          onChange={(e) => setNewGame(e.target.value)}
          placeholder="Naziv igre"
          disabled={!isAdmin}
        />
        <button onClick={createGame} className="primary" disabled={!isAdmin}>
          Dodaj
        </button>
      </div>

      <div className="card">
        <h3>Dodaj stanicu</h3>
        <input
          value={newStation}
          onChange={(e) => setNewStation(e.target.value)}
          placeholder="Naziv stanice"
          disabled={!isAdmin}
        />
        <button onClick={createStation} className="primary" disabled={!isAdmin}>
          Dodaj
        </button>
      </div>

      <div className="card">
        <h3>Igre</h3>
        <ul className="list">
          {games.map((g, index) => (
            <li key={g.id} className="row">
              <div className="grow">
                <input
                  value={g.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGames((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, name: value } : item,
                      ),
                    );
                  }}
                  disabled={!isAdmin}
                />
              </div>
              <label className="muted">
                <input
                  type="checkbox"
                  checked={g.isActive}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setGames((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, isActive: value } : item,
                      ),
                    );
                  }}
                  disabled={!isAdmin}
                />
                Aktivno
              </label>
              <button onClick={() => updateGame(g)} disabled={!isAdmin}>
                Sačuvaj
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Stanice</h3>
        <ul className="list">
          {stations.map((s, index) => (
            <li key={s.id} className="row">
              <div className="grow">
                <input
                  value={s.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStations((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, name: value } : item,
                      ),
                    );
                  }}
                  disabled={!isAdmin}
                />
              </div>
              <label className="muted">
                <input
                  type="checkbox"
                  checked={s.isActive}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setStations((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, isActive: value } : item,
                      ),
                    );
                  }}
                  disabled={!isAdmin}
                />
                Aktivno
              </label>
              <button onClick={() => updateStation(s)} disabled={!isAdmin}>
                Sačuvaj
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
