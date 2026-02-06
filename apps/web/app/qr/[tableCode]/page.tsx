'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
};

type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export default function QrPage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const params = useParams<{ tableCode: string }>();
  const tableCode = params?.tableCode;

  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!tableCode) return;
      setLoading(true);
      setError(null);
      const maxRetries = 3;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          await fetch(`${baseUrl}/qr/${tableCode}`);
          const res = await fetch(`${baseUrl}/menu?tableCode=${tableCode}`);
          if (!res.ok) {
            throw new Error('menu');
          }
          const data = await res.json();
          setMenu(data);
          setLoading(false);
          return;
        } catch {
          attempt += 1;
          if (attempt >= maxRetries) {
            setError('Backend unreachable.');
            setMenu([]);
            setLoading(false);
            return;
          }
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
    load();
  }, [baseUrl, tableCode]);

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const cat of menu) {
      for (const item of cat.items) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [menu]);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  };

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = itemsById.get(id);
    if (!item) return sum;
    return sum + item.priceCents * qty;
  }, 0);

  const formatPrice = useMemo(
    () =>
      new Intl.NumberFormat('sr-RS', {
        style: 'currency',
        currency: 'RSD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const submitOrder = async () => {
    setMessage(null);
    setError(null);
    if (isSubmitting) return;
    const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
    }));
    if (items.length === 0) {
      setMessage('Cart is empty.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableCode, items }),
      });
      if (!res.ok) {
        setMessage('Failed to create order.');
        return;
      }
      const created = await res.json();
      setOrderId(created.id);
      setOrderNumber(created.orderNumber ?? null);
      setOrderStatus(created.status);
      setCart({});
      setMessage(
        `Porudžbina #${created.orderNumber ?? created.id.slice(0, 6)} poslata!`,
      );
    } catch {
      setMessage('Failed to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!orderId || !tableCode) return;
    const es = new EventSource(
      `${baseUrl}/orders/${orderId}/stream?tableCode=${tableCode}`,
    );

    const onStatus = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.status) {
          setOrderStatus(data.status);
        }
      } catch {
        // ignore
      }
    };

    es.addEventListener('order.status', onStatus);
    es.addEventListener('ping', () => {});
    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [orderId, tableCode, baseUrl]);

  if (loading) {
    return <div className="container">Loading menu...</div>;
  }

  return (
    <div className="menu-scene">
      <div className="menu-orb orb-a" />
      <div className="menu-orb orb-b" />
      <div className="menu-orb orb-c" />

      <div className="menu-shell">
        <header className="menu-hero">
          <div>
            <div className="eyebrow">Cafe Igraonica</div>
            <h1>Meni</h1>
            <p className="muted">
              Sto <strong>#{tableCode}</strong> • Dodaj u korpu i pošalji porudžbinu.
            </p>
          </div>
          <div className="menu-hero-card">
            <div className="menu-hero-title">Brza porudžbina</div>
            <div className="menu-hero-meta">Vreme pripreme 6-12 min</div>
            <div className="menu-hero-note">QR naručivanje aktivno</div>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="menu-layout">
          <section className="menu-list">
            {menu.length === 0 && !error && (
              <div className="card">Trenutno nema stavki u meniju.</div>
            )}
            {menu.map((cat) => (
              <section key={cat.id} className="menu-category-card">
                <div className="menu-category-head">
                  <h2>{cat.name}</h2>
                  <span className="menu-count">{cat.items.length} stavki</span>
                </div>
                <div className="menu-grid">
                  {cat.items.map((item) => (
                    <div key={item.id} className="menu-item modern">
                      <div className="menu-item-body">
                        <strong>{item.name}</strong>
                        {item.description && (
                          <div className="muted">{item.description}</div>
                        )}
                      </div>
                      <div className="menu-footer">
                        <span className="price">
                          {formatPrice.format(item.priceCents / 100)}
                        </span>
                        <div className="controls">
                          <button
                            className="btn tiny ghost"
                            onClick={() => removeFromCart(item.id)}
                          >
                            -
                          </button>
                          <span className="qty">{cart[item.id] || 0}</span>
                          <button
                            className="btn tiny primary"
                            onClick={() => addToCart(item.id)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <aside className="menu-cart">
            <div className="menu-cart-card">
              <div className="menu-cart-head">
                <h3>Korpa</h3>
                <span className="menu-count">
                  {Object.values(cart).reduce((a, b) => a + b, 0)} artikala
                </span>
              </div>
              <div className="menu-cart-body">
                {Object.keys(cart).length === 0 && (
                  <div className="muted">Korpa je prazna.</div>
                )}
                {Object.entries(cart).map(([id, qty]) => {
                  const item = itemsById.get(id);
                  if (!item) return null;
                  return (
                    <div key={id} className="menu-cart-row">
                      <div>
                        <div className="menu-cart-title">{item.name}</div>
                        <div className="muted">
                          {formatPrice.format(item.priceCents / 100)}
                        </div>
                      </div>
                      <div className="menu-cart-qty">x{qty}</div>
                    </div>
                  );
                })}
              </div>

              <div className="menu-cart-total">
                <span>Ukupno</span>
                <strong>{formatPrice.format(total / 100)}</strong>
              </div>

              <button
                onClick={submitOrder}
                className="btn primary full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Slanje...' : 'Pošalji porudžbinu'}
              </button>

              {message && <div className="notice">{message}</div>}
              {orderId && (
                <div className="order-status-pill">
                  <span>Status</span>
                  <strong>{orderStatus || 'NEW'}</strong>
                  <span>•</span>
                  <span>#{orderNumber ?? orderId.slice(0, 6)}</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

