'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  isActive: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

type UserInfo = {
  email: string;
  role: string;
};

export default function StaffMenuPage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiBase = `${baseUrl}/api`;

  const [token, setToken] = useState('');
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySort, setCategorySort] = useState(0);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(0);
  const [itemDesc, setItemDesc] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [editing, setEditing] = useState<Record<string, { name: string; priceCents: number; isActive: boolean }>>({});

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

  const loadMenu = async () => {
    setError(null);
    const res = await fetch(`${apiBase}/menu/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('staffToken');
        router.push('/staff/login');
      }
      setError('Failed to load menu.');
      return;
    }
    const data = await res.json();
    setMenu(data);
    if (data.length > 0 && !itemCategoryId) {
      setItemCategoryId(data[0].id);
    }

    const nextEditing: Record<string, { name: string; priceCents: number; isActive: boolean }> = {};
    data.forEach((cat: MenuCategory) => {
      cat.items.forEach((item: MenuItem) => {
        nextEditing[item.id] = {
          name: item.name,
          priceCents: item.priceCents,
          isActive: item.isActive,
        };
      });
    });
    setEditing(nextEditing);
  };

  useEffect(() => {
    if (token) {
      loadUser();
      loadMenu();
    }
  }, [token]);

  const createCategory = async () => {
    if (!isAdmin) return;
    const res = await fetch(`${apiBase}/menu/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: categoryName, sortOrder: categorySort }),
    });
    if (res.ok) {
      setCategoryName('');
      setCategorySort(0);
      loadMenu();
    }
  };

  const createItem = async () => {
    if (!isAdmin) return;
    const res = await fetch(`${apiBase}/menu/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        categoryId: itemCategoryId,
        name: itemName,
        description: itemDesc || undefined,
        priceCents: itemPrice,
      }),
    });
    if (res.ok) {
      setItemName('');
      setItemDesc('');
      setItemPrice(0);
      loadMenu();
    }
  };

  const saveItem = async (itemId: string) => {
    if (!isAdmin) return;
    const data = editing[itemId];
    if (!data) return;

    const res = await fetch(`${apiBase}/menu/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: data.name,
        priceCents: data.priceCents,
        isActive: data.isActive,
      }),
    });
    if (res.ok) {
      loadMenu();
    }
  };

  const formatPrice = new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  });

  return (
    <div className="menu-admin" data-theme="light">
      <div className="menu-admin-shell">
        <header className="menu-admin-hero">
          <div>
            <div className="eyebrow">Cafe Igraonica</div>
            <h1>Meni – Upravljanje</h1>
            <p className="muted">
              Ulogovan kao: {user?.email || '—'} • {user?.role || '—'}
            </p>
          </div>
          <div className="menu-admin-badge">
            <div className="menu-admin-badge-title">Status</div>
            <div className="menu-admin-badge-text">
              {isAdmin ? 'ADMIN' : 'STAFF'} • {menu.length} kategorija
            </div>
          </div>
        </header>

        {!isAdmin && (
          <div className="notice">Samo ADMIN može da menja meni.</div>
        )}
        {error && <div className="error">{error}</div>}

        <div className="menu-admin-grid">
          <div className="menu-admin-card">
            <h3>Nova kategorija</h3>
            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Naziv"
              disabled={!isAdmin}
            />
            <input
              type="number"
              value={categorySort}
              onChange={(e) => setCategorySort(Number(e.target.value))}
              placeholder="Sort"
              disabled={!isAdmin}
            />
            <button onClick={createCategory} className="btn primary" disabled={!isAdmin}>
              Dodaj kategoriju
            </button>
          </div>

          <div className="menu-admin-card">
            <h3>Nova stavka</h3>
            <select
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
              disabled={!isAdmin}
            >
              {menu.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Naziv"
              disabled={!isAdmin}
            />
            <input
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="Opis (opciono)"
              disabled={!isAdmin}
            />
            <input
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(Number(e.target.value))}
              placeholder="Cena (u centima)"
              disabled={!isAdmin}
            />
            <button onClick={createItem} className="btn primary" disabled={!isAdmin}>
              Dodaj stavku
            </button>
          </div>
        </div>

        {menu.length === 0 && !error && (
          <div className="menu-admin-empty">
            Nema stavki u meniju. Dodaj kategorije i stavke.
          </div>
        )}

        {menu.map((cat) => (
          <section key={cat.id} className="menu-admin-section">
            <div className="menu-admin-section-head">
              <h2>{cat.name}</h2>
              <span className="menu-count">{cat.items.length} stavki</span>
            </div>
            <div className="menu-admin-items">
              {cat.items.map((item) => (
                <div key={item.id} className="menu-admin-item">
                  <div className="menu-admin-item-head">
                    <input
                      value={editing[item.id]?.name || ''}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            name: e.target.value,
                          },
                        }))
                      }
                      disabled={!isAdmin}
                    />
                    <span className="menu-admin-price">
                      {formatPrice.format((editing[item.id]?.priceCents ?? item.priceCents) / 100)}
                    </span>
                  </div>
                  <div className="menu-admin-item-controls">
                    <input
                      type="number"
                      value={editing[item.id]?.priceCents ?? 0}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            priceCents: Number(e.target.value),
                          },
                        }))
                      }
                      disabled={!isAdmin}
                    />
                    <label className="muted">
                      <input
                        type="checkbox"
                        checked={editing[item.id]?.isActive ?? item.isActive}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              isActive: e.target.checked,
                            },
                          }))
                        }
                        disabled={!isAdmin}
                      />
                      Aktivno
                    </label>
                    <button className="btn ghost" onClick={() => saveItem(item.id)} disabled={!isAdmin}>
                      Sačuvaj
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
