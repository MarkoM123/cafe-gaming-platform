'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Table = { id: string; code: string; name?: string | null };
type OrderItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  menuItem: { name: string };
};
type Order = {
  id: string;
  status: string;
  totalCents: number;
  paidAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  tableSession: {
    table: { code: string };
    endedAt?: string | null;
    startedAt?: string | null;
    lastActivityAt?: string | null;
  };
};

export default function StaffTablesPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiBase = `${baseUrl}/api`;

  const [token, setToken] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('staffToken');
    if (saved) {
      setToken(saved);
    } else {
      router.push('/staff/login');
    }
  }, [router]);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        fetch(`${apiBase}/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!tablesRes.ok || !ordersRes.ok) {
        if (tablesRes.status === 401 || ordersRes.status === 401) {
          localStorage.removeItem('staffToken');
          router.push('/staff/login');
        }
        setError('Ne mogu da učitam stolove/porudžbine.');
        return;
      }
      setTables(await tablesRes.json());
      setOrders(await ordersRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token]);

  const ordersByTable = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.tableSession.endedAt) continue;
      if (unpaidOnly && o.paidAt) continue;
      const code = o.tableSession.table.code;
      const list = map.get(code) || [];
      list.push(o);
      map.set(code, list);
    }
    return map;
  }, [orders, unpaidOnly]);

  const activeOrdersByTable = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const [code, list] of ordersByTable.entries()) {
      const active = list.filter(
        (o) => o.status === 'NEW' || o.status === 'IN_PROGRESS',
      );
      map.set(code, active);
    }
    return map;
  }, [ordersByTable]);

  const unpaidByTable = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const [code, list] of ordersByTable.entries()) {
      const unpaid = list.filter((o) => !o.paidAt);
      map.set(code, unpaid);
    }
    return map;
  }, [ordersByTable]);

  const settleTable = async (tableCode: string) => {
    const list = activeOrdersByTable.get(tableCode) || [];
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
    await Promise.all(
      list.map((o) =>
        fetch(`${apiBase}/orders/${o.id}/close`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paidCents: o.totalCents, paymentMethod: method }),
        }),
      ),
    );
    const res = await fetch(`${apiBase}/sessions/close?tableCode=${tableCode}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.closed === false && data.reason === 'ACTIVE_ORDERS') {
        alert('Sto ne može da se zatvori. Aktivne porudžbine postoje.');
      }
    }
    load();
  };

  const aggregateItems = (list: Order[]) => {
    const map = new Map<string, { name: string; qty: number; totalCents: number }>();
    for (const o of list) {
      for (const item of o.items) {
        const prev = map.get(item.menuItem.name) || {
          name: item.menuItem.name,
          qty: 0,
          totalCents: 0,
        };
        prev.qty += item.quantity;
        prev.totalCents += item.totalCents;
        map.set(item.menuItem.name, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  };

  if (loading) {
    return <div className="staff-shell">Učitavanje...</div>;
  }

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <div>
          <h1>Stolovi</h1>
          <div className="muted">Pregled po stolu i brza naplata.</div>
        </div>
        <nav className="staff-nav">
          <a className="btn tiny ghost" href="/staff/orders">Porudžbine</a>
          <a className="btn tiny ghost" href="/staff/tables">Stolovi</a>
          <a className="btn tiny ghost" href="/staff/games">Igre</a>
          <a className="btn tiny ghost" href="/staff/menu">Meni</a>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="tables-filters">
        <label>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Samo aktivni stolovi
        </label>
        <label>
          <input
            type="checkbox"
            checked={unpaidOnly}
            onChange={(e) => setUnpaidOnly(e.target.checked)}
          />
          Samo neplaćeno
        </label>
      </section>

      <section className="tables-grid">
        {tables
          .filter((t) => {
            if (!activeOnly) return true;
            const activeOrders = activeOrdersByTable.get(t.code) || [];
            return activeOrders.length > 0;
          })
          .map((t) => {
            const activeOrders = activeOrdersByTable.get(t.code) || [];
            const total = activeOrders.reduce((sum, o) => sum + o.totalCents, 0);
            const unpaid = unpaidByTable.get(t.code) || [];
            const unpaidTotal = unpaid.reduce((sum, o) => sum + o.totalCents, 0);
            const items = aggregateItems(activeOrders);
            const isActive = activeOrders.length > 0;
            const sessionInfo = activeOrders[0]?.tableSession;
            return (
              <article key={t.id} className={`table-card ${isActive ? 'active' : ''}`}>
                <div className="table-card-head">
                  <div>
                    <h3>{t.name || `Sto ${t.code}`}</h3>
                    <div className={`table-status ${isActive ? 'on' : 'off'}`}>
                      {isActive ? 'AKTIVAN' : 'NEMA SESIJE'}
                    </div>
                  </div>
                  <div className="table-total">
                    {(total / 100).toFixed(2)} RSD
                  </div>
                </div>
                {sessionInfo && (
                  <div className="table-session-meta">
                    <span>
                      Start: {sessionInfo.startedAt
                        ? new Date(sessionInfo.startedAt).toLocaleTimeString()
                        : '—'}
                    </span>
                    <span>
                      Aktivnost: {sessionInfo.lastActivityAt
                        ? new Date(sessionInfo.lastActivityAt).toLocaleTimeString()
                        : '—'}
                    </span>
                  </div>
                )}
                {unpaidOnly && (
                  <div className="table-unpaid">
                    Neplaćeno: {(unpaidTotal / 100).toFixed(2)} RSD
                  </div>
                )}

                {items.length === 0 && <div className="muted">Nema aktivnih stavki.</div>}
                {items.length > 0 && (
                  <ul className="list">
                    {items.map((i) => (
                      <li key={i.name} className="row">
                        <span>{i.name}</span>
                        <span>x{i.qty}</span>
                        <strong>{(i.totalCents / 100).toFixed(2)} RSD</strong>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="table-actions">
                  <button
                    className="btn primary"
                    disabled={!isActive}
                    onClick={() => settleTable(t.code)}
                  >
                    Naplati i zatvori sto
                  </button>
                </div>
              </article>
            );
          })}
      </section>
    </div>
  );
}
