'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function PublicMenuPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/menu/public`);
        if (!res.ok) throw new Error('menu');
        setMenu(await res.json());
      } catch {
        setError('Ne mogu da učitam meni.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [baseUrl]);

  const formatPrice = useMemo(
    () =>
      new Intl.NumberFormat('sr-RS', {
        style: 'currency',
        currency: 'RSD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  return (
    <div className="public-menu public-menu-gridy" data-theme="light">
      <div className="public-menu-shell public-menu-shell-gridy">
        <header className="public-menu-hero-gridy">
          <div>
            <div className="eyebrow">Cafe Igraonica</div>
            <h1>Jelovnik</h1>
            <p className="muted">Sveže, glasno i jasno.</p>
          </div>
          <div className="public-menu-hero-cards">
            <div className="hero-card-square">
              <div className="hero-card-title">Radno vreme</div>
              <div className="hero-card-value">08:00 – 23:59</div>
            </div>
            <div className="hero-card-square accent">
              <div className="hero-card-title">Top izbor</div>
              <div className="hero-card-value">Latte 330 RSD</div>
            </div>
          </div>
        </header>

        {loading && <div className="public-menu-loading">Učitavanje...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && menu.length === 0 && (
          <div className="public-menu-empty">Meni je trenutno prazan.</div>
        )}

        <div className="public-menu-gridy-layout">
          {menu.map((cat) => (
            <section key={cat.id} className="public-menu-category-card">
              <div className="public-menu-category-head">
                <h2>{cat.name}</h2>
                <span className="menu-count">{cat.items.length} stavki</span>
              </div>
              <div className="public-menu-items-grid">
                {cat.items.map((item) => (
                  <div key={item.id} className="public-menu-item-card">
                    <div className="public-menu-item-title">
                      <strong>{item.name}</strong>
                      {item.description && (
                        <div className="muted">{item.description}</div>
                      )}
                    </div>
                    <div className="public-menu-price-badge">
                      {formatPrice.format(item.priceCents / 100)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
