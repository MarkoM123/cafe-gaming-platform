'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  menuItem: { name: string };
};

type Game = { id: string; name: string };
type Station = { id: string; name: string };
type Table = { id: string; code: string; name?: string | null };
type Reservation = {
  id: string;
  stationId: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  game?: { id: string; name: string } | null;
  station?: { id: string; name: string } | null;
};

type Order = {
  id: string;
  orderNumber?: number;
  status: string;
  totalCents: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
  items: OrderItem[];
  tableSession: { table: { code: string }; endedAt?: string | null };
};

const HIGHLIGHT_MS = 2 * 60 * 1000;
const OPEN_START_HOUR = 8;
const OPEN_END_HOUR = 24;
const SLOT_MINUTES = 30;

export default function StaffOrdersPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('NEW');
  const [tableFilter, setTableFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [flash, setFlash] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationDate, setReservationDate] = useState(() => {
    const now = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [reservationStationId, setReservationStationId] = useState('');
  const [reservationGameId, setReservationGameId] = useState('');
  const [reservationName, setReservationName] = useState('');
  const [reservationPhone, setReservationPhone] = useState('');
  const [reservationStart, setReservationStart] = useState('');
  const [reservationDuration, setReservationDuration] = useState(60);
  const [reservationMessage, setReservationMessage] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationFilterStationId, setReservationFilterStationId] = useState('ALL');
  const [totalsScope, setTotalsScope] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [gameDuration, setGameDuration] = useState(60);
  const [gamePlayerName, setGamePlayerName] = useState('');
  const [gameTableCode, setGameTableCode] = useState('');
  const [gameActionLoadingId, setGameActionLoadingId] = useState<string | null>(null);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const streamRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const highlightRef = useRef<Map<string, number>>(new Map());
  const pendingAttentionRef = useRef(false);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
      oscillator.onended = () => ctx.close();
    } catch {
      // ignore audio errors
    }
  };

  const triggerAttention = () => {
    if (soundEnabled) playBeep();
    if (flashEnabled) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
  };

  const updateHighlights = (newIds: string[]) => {
    const now = Date.now();
    for (const id of newIds) {
      highlightRef.current.set(id, now);
    }
    for (const [id, ts] of highlightRef.current.entries()) {
      if (now - ts > HIGHLIGHT_MS) {
        highlightRef.current.delete(id);
      }
    }
    setHighlightedIds(Array.from(highlightRef.current.keys()));
  };

  const loadOrders = async () => {
    setError(null);
    const params = new URLSearchParams();

    const res = await fetch(`${baseUrl}/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('staffToken');
        router.push('/staff/login');
      }
      setError('Unauthorized or error loading orders.');
      return;
    }

    const data = await res.json();
    setOrders(data);
    setLastUpdated(new Date().toLocaleTimeString());

    const currentIds = new Set<string>();
    for (const order of data as Order[]) {
      currentIds.add(order.id);
    }

    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!seenIdsRef.current.has(id)) {
        newIds.push(id);
      }
    }
    seenIdsRef.current = currentIds;

    if (newIds.length > 0 || pendingAttentionRef.current) {
      triggerAttention();
      pendingAttentionRef.current = false;
    }
    updateHighlights(newIds);
  };

  const loadGamesAndStations = async () => {
    try {
      const [stationsRes, gamesRes, tablesRes] = await Promise.all([
        fetch(`${baseUrl}/game-stations`),
        fetch(`${baseUrl}/games`),
        fetch(`${baseUrl}/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData);
        if (!reservationStationId && stationsData.length > 0) {
          setReservationStationId(stationsData[0].id);
        }
      }
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData);
        if (!reservationGameId && gamesData.length > 0) {
          setReservationGameId(gamesData[0].id);
        }
      }
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
        if (!gameTableCode && tablesData.length > 0) {
          setGameTableCode(tablesData[0].code);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadReservationsForDay = async () => {
    if (!reservationDate) return;
    setReservations([]);
    const from = `${reservationDate}T00:00:00`;
    const to = `${reservationDate}T23:59:59`;
    try {
      const results = await Promise.all(
        stations.map((st) =>
          fetch(
            `${baseUrl}/reservations?stationId=${st.id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          ).then((res) => (res.ok ? res.json() : [])),
        ),
      );
      const merged = results.flat() as Reservation[];
      setReservations(merged);
    } catch {
      // ignore
    }
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    const res = await fetch(`${baseUrl}/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, reason }),
    });
    if (res.ok) {
      loadOrders();
    }
  };

  const closeOrder = async (
    id: string,
    paidCents: number,
    paymentMethod: 'CASH' | 'CARD' | 'MIXED',
  ) => {
    const res = await fetch(`${baseUrl}/orders/${id}/close`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paidCents, paymentMethod }),
    });
    if (res.ok) {
      loadOrders();
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('staffToken');
    const sound = localStorage.getItem('staffSound');
    const flashPref = localStorage.getItem('staffFlash');
    if (sound !== null) setSoundEnabled(sound === 'on');
    if (flashPref !== null) setFlashEnabled(flashPref === 'on');

    if (saved) {
      setToken(saved);
    } else {
      router.push('/staff/login');
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('staffToken', token);
      loadOrders();
      loadGamesAndStations();
    }
  }, [statusFilter, token]);

  useEffect(() => {
    localStorage.setItem('staffSound', soundEnabled ? 'on' : 'off');
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('staffFlash', flashEnabled ? 'on' : 'off');
  }, [flashEnabled]);

  useEffect(() => {
    if (!token) return;

    let lastEventAt = Date.now();

    const connect = () => {
      if (streamRef.current) {
        streamRef.current.close();
      }

      const es = new EventSource(`${baseUrl}/orders/stream?token=${token}`);
      streamRef.current = es;
      setConnectionStatus('reconnecting');

      es.onopen = () => {
        retryRef.current = 0;
        setConnectionStatus('connected');
        setInfo(null);
      };

      es.addEventListener('order.created', () => {
        lastEventAt = Date.now();
        pendingAttentionRef.current = true;
        loadOrders();
      });

      es.addEventListener('order.status_changed', () => {
        lastEventAt = Date.now();
        loadOrders();
      });

      es.addEventListener('ping', () => {
        lastEventAt = Date.now();
      });

      es.onerror = () => {
        setInfo('Realtime stream disconnected. Reconnecting...');
        setConnectionStatus('reconnecting');
        es.close();

        const retryCount = retryRef.current + 1;
        retryRef.current = retryCount;
        const delay = Math.min(30000, 1000 * 2 ** retryCount);
        setTimeout(connect, delay);
      };
    };

    connect();

    if (staleTimerRef.current) {
      clearInterval(staleTimerRef.current);
    }
    staleTimerRef.current = setInterval(() => {
      if (Date.now() - lastEventAt > 45000) {
        loadOrders();
        setInfo('Stream stale. Refetching...');
      }
    }, 15000);

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
      if (staleTimerRef.current) {
        clearInterval(staleTimerRef.current);
      }
      setConnectionStatus('disconnected');
    };
  }, [token, baseUrl]);

  useEffect(() => {
    if (stations.length > 0) {
      loadReservationsForDay();
    }
  }, [stations, reservationDate]);

  const slots = useMemo(() => {
    const list: { start: string; end: string }[] = [];
    for (let minutes = OPEN_START_HOUR * 60; minutes < OPEN_END_HOUR * 60; minutes += SLOT_MINUTES) {
      const h1 = String(Math.floor(minutes / 60)).padStart(2, '0');
      const m1 = String(minutes % 60).padStart(2, '0');
      const h2 = String(Math.floor((minutes + SLOT_MINUTES) / 60)).padStart(2, '0');
      const m2 = String((minutes + SLOT_MINUTES) % 60).padStart(2, '0');
      list.push({ start: `${h1}:${m1}`, end: `${h2}:${m2}` });
    }
    return list;
  }, []);

  const submitReservation = async () => {
    setReservationMessage(null);
    setReservationError(null);
    if (!reservationStationId) return setReservationError('Izaberi računar.');
    if (!reservationName || !reservationPhone) return setReservationError('Unesi ime i telefon.');
    if (!reservationDate || !reservationStart) return setReservationError('Izaberi datum i vreme.');
    const start = `${reservationDate}T${reservationStart}`;
    const [sh, sm] = reservationStart.split(':').map(Number);
    const endMinutes = sh * 60 + sm + reservationDuration;
    const eh = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const em = String(endMinutes % 60).padStart(2, '0');
    const end = `${reservationDate}T${eh}:${em}`;

    setReservationSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: reservationStationId,
          gameId: reservationGameId || undefined,
          customerName: reservationName,
          customerPhone: reservationPhone,
          startsAt: start,
          endsAt: end,
        }),
      });
      if (!res.ok) {
        setReservationError('Termin nije dostupan.');
        return;
      }
      setReservationMessage('Rezervacija je sačuvana.');
      setReservationName('');
      setReservationPhone('');
      await loadReservationsForDay();
    } catch {
      setReservationError('Greška pri čuvanju.');
    } finally {
      setReservationSubmitting(false);
    }
  };

  const totalsByTable = useMemo(() => {
    const map = new Map<string, number>();
    const isActive = (status: string) => status === 'NEW' || status === 'IN_PROGRESS';
    for (const o of orders) {
      if (totalsScope === 'ACTIVE' && !isActive(o.status)) continue;
      if (o.tableSession.endedAt) continue;
      const table = o.tableSession.table.code;
      map.set(table, (map.get(table) || 0) + o.totalCents);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders, totalsScope]);

  const dashboardStats = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => o.status === 'NEW' || o.status === 'IN_PROGRESS',
    );
    const activeTables = new Set(
      activeOrders
        .filter((o) => !o.tableSession.endedAt)
        .map((o) => o.tableSession.table.code),
    );
    const todayKey = new Date().toISOString().slice(0, 10);
    const revenueToday = orders
      .filter((o) => o.createdAt.slice(0, 10) === todayKey)
      .reduce((sum, o) => sum + o.totalCents, 0);
    const busyStations = stations.filter((s) => {
      const active = reservations.find((r) => r.stationId === s.id);
      return (
        active &&
        new Date(active.startsAt) <= new Date() &&
        new Date(active.endsAt) >= new Date()
      );
    }).length;
    return {
      activeOrders: activeOrders.length,
      busyStations,
      revenueToday,
      activeTables: activeTables.size,
    };
  }, [orders, stations, reservations]);
  const ordersByTable = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.tableSession.endedAt) continue;
      const table = o.tableSession.table.code;
      const list = map.get(table) || [];
      list.push(o);
      map.set(table, list);
    }
    return map;
  }, [orders]);

  const settleTable = async (tableCode: string) => {
    const list = ordersByTable.get(tableCode) || [];
    if (list.length === 0) return;
    const total = list.reduce((sum, o) => sum + o.totalCents, 0);
    const method = window
      .prompt('Način plaćanja: CASH, CARD ili MIXED', 'CASH')
      ?.toUpperCase();
    if (method !== 'CASH' && method !== 'CARD' && method !== 'MIXED') return;
    const ok = window.confirm(
      `Ukupno za naplatu: ${(total / 100).toFixed(2)} RSD.\nZatvori sto ${tableCode}?`,
    );
    if (!ok) return;
    await Promise.all(list.map((o) => closeOrder(o.id, o.totalCents, method)));
    const res = await fetch(`${baseUrl}/sessions/close?tableCode=${tableCode}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.closed === false && data.reason === 'ACTIVE_ORDERS') {
        alert('Sto ne može da se zatvori. Aktivne porudžbine postoje.');
      }
    }
    loadOrders();
  };

  const startGame = async (stationId: string) => {
    setGameActionLoadingId(stationId);
    const res = await fetch(`${baseUrl}/reservations/start-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        stationId,
        gameId: reservationGameId || undefined,
        durationMinutes: gameDuration,
        customerName: gamePlayerName || undefined,
        customerPhone: 'N/A',
        tableCode: gameTableCode || undefined,
      }),
    });
    if (res.ok) {
      setGamePlayerName('');
      await loadReservationsForDay();
    }
    setGameActionLoadingId(null);
  };

  const stopGame = async (reservationId: string) => {
    setGameActionLoadingId(reservationId);
    const res = await fetch(`${baseUrl}/reservations/${reservationId}/stop-game`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      alert(
        `Za naplatu: ${(data.amountCents / 100).toFixed(2)} RSD (${data.durationMinutes} min)`,
      );
      await loadReservationsForDay();
    }
    setGameActionLoadingId(null);
  };

  const extendGame = async (reservationId: string, minutes: number) => {
    setGameActionLoadingId(reservationId);
    const res = await fetch(`${baseUrl}/reservations/${reservationId}/extend`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) {
      alert('Ne može da se produži termin.');
    } else {
      await loadReservationsForDay();
    }
    setGameActionLoadingId(null);
  };

  const filteredOrders = useMemo(() => {
    const table = tableFilter.trim().toLowerCase();
    const keyword = keywordFilter.trim().toLowerCase();

    return orders.filter((order) => {
      const matchStatus =
        statusFilter === 'ALL' ? true : order.status === statusFilter;
      const matchPayment = unpaidOnly ? !order.paidAt : true;
      const matchTable = table
        ? order.tableSession.table.code.toLowerCase().includes(table)
        : true;
      const matchKeyword = keyword
        ? order.items.some((item) =>
            item.menuItem.name.toLowerCase().includes(keyword),
          )
        : true;
      return matchStatus && matchPayment && matchTable && matchKeyword;
    });
  }, [orders, tableFilter, keywordFilter, statusFilter, unpaidOnly]);

  const logout = () => {
    localStorage.removeItem('staffToken');
    setToken('');
    router.push('/staff/login');
  };

  return (
    <div className="staff-shell">
      <div className={`staff-flash ${flash ? 'on' : ''}`} />

      <header className="staff-header">
        <div>
          <h1>Staff Orders</h1>
          <div className="muted">
            Real-time narudžbine • {lastUpdated ? `Ažurirano ${lastUpdated}` : 'Čeka konekciju'}
          </div>
        </div>
        <div className="staff-status">
          <span className={`status-dot ${connectionStatus}`} />
          {connectionStatus}
        </div>
          <nav className="staff-nav">
        <a className="btn tiny ghost" href="/staff/orders">Porudžbine</a>
        <a className="btn tiny ghost" href="/staff/menu">Meni</a>
        <a className="btn tiny ghost" href="/staff/games">Igre</a>
        <a className="btn tiny ghost" href="/staff/hours">Radno vreme</a>
        <a className="btn tiny ghost" href="/staff/qr">QR</a>
        <a className="btn tiny ghost" href="/staff/audit">Audit</a>
      </nav>
    </header>

      <section className="staff-dashboard-metrics">
        <div className="metric-card">
          <div className="metric-label">Aktivne narudžbine</div>
          <div className="metric-value">{dashboardStats.activeOrders}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Zauzeti računari</div>
          <div className="metric-value">
            {dashboardStats.busyStations} / {stations.length || 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Promet danas</div>
          <div className="metric-value">
            {(dashboardStats.revenueToday / 100).toFixed(2)} RSD
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Aktivni stolovi</div>
          <div className="metric-value">{dashboardStats.activeTables}</div>
        </div>
      </section>

      <section className="staff-controls">
        <div className="control-group">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Sve</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
        <div className="control-group">
          <label>Sto</label>
          <input
            placeholder="Npr. A1"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
        </div>
        <div className="control-group">
          <label>Stavka / igra</label>
          <input
            placeholder="Kafa, FIFA..."
            value={keywordFilter}
            onChange={(e) => setKeywordFilter(e.target.value)}
          />
        </div>
        <div className="control-group toggles">
          <label>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            Zvuk
          </label>
          <label>
            <input
              type="checkbox"
              checked={flashEnabled}
              onChange={(e) => setFlashEnabled(e.target.checked)}
            />
            Flash
          </label>
          <label>
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
            />
            Samo neplaćene
          </label>
        </div>
        <div className="control-actions">
          <button className="btn ghost" onClick={loadOrders}>Refresh</button>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </section>

      {error && <div className="error">{error}</div>}
      {info && <div className="notice">{info}</div>}

      <section className="staff-dashboard">
        <div className="orders-grid">
          {filteredOrders.length === 0 && !error && (
            <div className="card">Nema porudžbina za prikaz.</div>
          )}
          {filteredOrders.map((o) => {
            const isHighlighted = highlightedIds.includes(o.id);
            return (
              <article key={o.id} className={`order-card ${isHighlighted ? 'highlight' : ''}`}>
                <div className="order-header">
                  <div className="order-table">
                    Sto {o.tableSession.table.code}
                    {typeof o.orderNumber === 'number' && (
                      <span className="muted"> • #{o.orderNumber}</span>
                    )}
                  </div>
                  <div className={`order-status status-${o.status.toLowerCase()}`}>{o.status}</div>
                </div>
                <div className="order-meta">
                  <span>{new Date(o.createdAt).toLocaleTimeString()}</span>
                  <span>{(o.totalCents / 100).toFixed(2)} RSD</span>
                </div>
                {o.paidAt && (
                  <div className="order-paid">
                    Plaćeno • {o.paymentMethod || 'CASH'}
                  </div>
                )}
                <ul className="order-items">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <span>{i.menuItem.name}</span>
                      <strong>x{i.quantity}</strong>
                    </li>
                  ))}
                </ul>
                <div className="order-actions">
                  <button
                    onClick={() => updateStatus(o.id, 'IN_PROGRESS')}
                    disabled={o.status !== 'NEW'}
                  >
                    U pripremi
                  </button>
                  <button
                    onClick={() => updateStatus(o.id, 'DONE')}
                    disabled={o.status !== 'IN_PROGRESS'}
                  >
                    Spremno
                  </button>
                  <button
                    onClick={() => {
                      if (o.status === 'DONE' || o.status === 'CANCELED') return;
                      const reason = window.prompt('Razlog otkaza? (opciono)') || undefined;
                      if (!window.confirm('Potvrdi otkaz porudžbine?')) return;
                      updateStatus(o.id, 'CANCELED', reason);
                    }}
                    disabled={o.status === 'DONE' || o.status === 'CANCELED'}
                  >
                    Otkaži
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="staff-side">
          <div className="card">
            <h3>Ukupan račun po stolu</h3>
            <div className="controls">
              <button
                className={`btn tiny ${totalsScope === 'ACTIVE' ? 'primary' : 'ghost'}`}
                onClick={() => setTotalsScope('ACTIVE')}
              >
                Aktivne
              </button>
              <button
                className={`btn tiny ${totalsScope === 'ALL' ? 'primary' : 'ghost'}`}
                onClick={() => setTotalsScope('ALL')}
              >
                Sve
              </button>
            </div>
            {totalsByTable.length === 0 && <div className="muted">Nema porudžbina.</div>}
            <ul className="list">
              {totalsByTable.map(([table, total]) => (
                <li key={table} className="row">
                  <span>Sto {table}</span>
                  <strong>{(total / 100).toFixed(2)} RSD</strong>
                  <button className="btn tiny" onClick={() => settleTable(table)}>
                    Naplati
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>Rezervacije (danas)</h3>
            <input
              type="date"
              value={reservationDate}
              onChange={(e) => setReservationDate(e.target.value)}
            />
            <select
              value={reservationFilterStationId}
              onChange={(e) => setReservationFilterStationId(e.target.value)}
            >
              <option value="ALL">Svi računari</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {reservations.length === 0 && <div className="muted">Nema rezervacija.</div>}
            <ul className="list">
              {reservations
                .filter((r) =>
                  reservationFilterStationId === 'ALL'
                    ? true
                    : r.stationId === reservationFilterStationId,
                )
                .map((r) => (
                  <li key={r.id} className="row">
                    <div className="grow">
                      <strong>{r.station?.name || 'Računar'}</strong>
                      <div className="muted">
                        {new Date(r.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(r.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="muted">
                        {r.game?.name ? r.game.name : 'Bez igre'} • {r.customerName}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          <div className="card">
            <h3>Igre / Računari</h3>
            <div className="controls">
              <select
                value={gameTableCode}
                onChange={(e) => setGameTableCode(e.target.value)}
              >
                <option value="">Bez stola</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.name ? t.name : `Sto ${t.code}`}
                  </option>
                ))}
              </select>
              <select
                value={reservationGameId}
                onChange={(e) => setReservationGameId(e.target.value)}
              >
                <option value="">Bez igre</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select value={gameDuration} onChange={(e) => setGameDuration(Number(e.target.value))}>
                <option value={30}>30 min</option>
                <option value={60}>1 sat</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2 sata</option>
              </select>
              <input
                placeholder="Igrač (opciono)"
                value={gamePlayerName}
                onChange={(e) => setGamePlayerName(e.target.value)}
              />
            </div>
            <ul className="list">
              {stations.map((s) => {
                const active = reservations.find((r) => r.stationId === s.id);
                const busy =
                  active &&
                  new Date(active.startsAt) <= new Date() &&
                  new Date(active.endsAt) >= new Date();
                return (
                  <li key={s.id} className="row">
                    <div className="grow">
                      <strong>{s.name}</strong>
                      {busy && active && (
                        <div className="muted">
                          {active.game?.name || 'Bez igre'} • {active.customerName}
                        </div>
                      )}
                      {!busy && <div className="muted">SLOBODAN</div>}
                    </div>
                    {!busy ? (
                      <button
                        className="btn tiny"
                        onClick={() => startGame(s.id)}
                        disabled={gameActionLoadingId === s.id}
                      >
                        {gameActionLoadingId === s.id ? '...' : 'Start'}
                      </button>
                    ) : (
                      <div className="controls">
                        <button
                          className="btn tiny ghost"
                          onClick={() => extendGame(active!.id, 30)}
                          disabled={gameActionLoadingId === active!.id}
                        >
                          +30m
                        </button>
                        <button
                          className="btn tiny ghost"
                          onClick={() => extendGame(active!.id, 60)}
                          disabled={gameActionLoadingId === active!.id}
                        >
                          +60m
                        </button>
                        <button
                          className="btn tiny primary"
                          onClick={() => stopGame(active!.id)}
                          disabled={gameActionLoadingId === active!.id}
                        >
                          {gameActionLoadingId === active!.id ? '...' : 'Stop'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <h3>Nova rezervacija (pult)</h3>
            <select
              value={reservationStationId}
              onChange={(e) => setReservationStationId(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={reservationGameId}
              onChange={(e) => setReservationGameId(e.target.value)}
            >
              <option value="">Bez igre</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Ime"
              value={reservationName}
              onChange={(e) => setReservationName(e.target.value)}
            />
            <input
              placeholder="Telefon"
              value={reservationPhone}
              onChange={(e) => setReservationPhone(e.target.value)}
            />
            <input
              type="date"
              value={reservationDate}
              onChange={(e) => setReservationDate(e.target.value)}
            />
            <select value={reservationStart} onChange={(e) => setReservationStart(e.target.value)}>
              <option value="">Vreme početka</option>
              {slots.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {slot.start}
                </option>
              ))}
            </select>
            <select
              value={reservationDuration}
              onChange={(e) => setReservationDuration(Number(e.target.value))}
            >
              <option value={30}>30 min</option>
              <option value={60}>1 sat</option>
              <option value={90}>1h 30m</option>
              <option value={120}>2 sata</option>
            </select>
            <button className="btn primary" onClick={submitReservation} disabled={reservationSubmitting}>
              {reservationSubmitting ? 'Slanje...' : 'Sačuvaj'}
            </button>
            {reservationMessage && <div className="notice">{reservationMessage}</div>}
            {reservationError && <div className="error">{reservationError}</div>}
          </div>
        </aside>
      </section>
    </div>
  );
}


