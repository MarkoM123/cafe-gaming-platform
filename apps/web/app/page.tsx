'use client';

import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <main className="landing-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grid-floor" />

      <header className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">Cafe & Igraonica</span>
          <h1>
            Sve što gost treba je na stolu: QR meni, brza porudžbina i miran
            tempo igre.
          </h1>
          <p className="lead">
            Pixel Cafe & Igraonica je mesto gde se skenira, poručuje i igra bez
            čekanja. Rezerviši termin, dođi sa ekipom i uživaj.
          </p>
          <div className="hero-cta">
            <a className="btn primary" href="/games">
              Rezerviši igru
            </a>
            <a className="btn ghost" href="/menu">
              Pogledaj meni
            </a>
          </div>
          <div className="hero-note">
            QR meni je dostupan samo skeniranjem koda na stolu.
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-grid">
            <div className="hero-tile neon">
              <div className="hero-tile-title">PC arena</div>
              <div className="hero-tile-body">144Hz • FPS ready</div>
            </div>
            <div className="hero-tile glow">
              <div className="hero-tile-title">Console lounge</div>
              <div className="hero-tile-body">PS5 • Co-op večeri</div>
            </div>
            <div className="hero-tile ember">
              <div className="hero-tile-title">Turniri</div>
              <div className="hero-tile-body">Dnevne prijave</div>
            </div>
            <div className="hero-tile steel">
              <div className="hero-tile-title">QR naručivanje</div>
              <div className="hero-tile-body">Bez čekanja</div>
            </div>
            <div className="hero-tile mint">
              <div className="hero-tile-title">Kafa bar</div>
              <div className="hero-tile-body">Specijaliteti</div>
            </div>
            <div className="hero-tile dusk">
              <div className="hero-tile-title">Rezervacije</div>
              <div className="hero-tile-body">Jasni termini</div>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section flow-section">
        <div className="section-header">
          <h2>Atmosfera koja drži tempo</h2>
          <p className="muted">
            Glasna atmosfera, brze porudžbine i jasni termini.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Brza usluga</h3>
            <p>Porudžbina se vidi odmah, bez čekanja.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🎮</div>
            <h3>PC & PS5 zone</h3>
            <p>Jasno odvojene zone i setupi spremni.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🧾</div>
            <h3>Račun po stolu</h3>
            <p>Sve je grupisano i pregledno.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🕹️</div>
            <h3>Turniri</h3>
            <p>Dnevne prijave i brza organizacija.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">☕</div>
            <h3>Kafa bar</h3>
            <p>Specijaliteti i brze pauze.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🗓️</div>
            <h3>Rezervacije</h3>
            <p>Bez preklapanja, sve je jasno.</p>
          </article>
        </div>
      </section>

      <section className="landing-section menu-preview">
        <div className="section-header">
          <h2>Meni koji se pamti</h2>
          <p className="muted">
            Pregledan, čist i brz — stavke i cene su odmah tu.
          </p>
        </div>
        <div className="menu-preview-grid">
          <article className="menu-preview-card">
            <div className="menu-preview-image img-latte" />
            <div className="menu-preview-body">
              <h3>Specijaliteti kafe</h3>
              <p>Espresso, cappuccino, latte, mocha i cold brew.</p>
              <div className="menu-preview-price">od 220 RSD</div>
            </div>
          </article>
          <article className="menu-preview-card">
            <div className="menu-preview-image img-soda" />
            <div className="menu-preview-body">
              <h3>Sokovi i gazirano</h3>
              <p>Flaše, limenke, tonik i sveže kombinacije.</p>
              <div className="menu-preview-price">od 190 RSD</div>
            </div>
          </article>
          <article className="menu-preview-card">
            <div className="menu-preview-image img-snack" />
            <div className="menu-preview-body">
              <h3>Zalogaji</h3>
              <p>Toast, nachos i sendviči za duge partije.</p>
              <div className="menu-preview-price">od 350 RSD</div>
            </div>
          </article>
        </div>
        <div className="menu-preview-cta">
          <a className="btn primary" href="/menu">
            Otvori ceo meni
          </a>
          <span className="muted">Za porudžbine sa stola koristi QR.</span>
        </div>
      </section>

      <section className="landing-section split">
        <div>
          <h2>Iskustvo bez zastoja</h2>
          <p>
            Meni je skrojen za brz izbor, a rezervacije ti čuvaju vreme. Fokus
            ostaje na atmosferi i igri.
          </p>
          <div className="hero-cta">
            <a className="btn primary" href="/games">
              Rezerviši termin
            </a>
            <a className="btn ghost" href="/menu">
              Pogledaj meni
            </a>
          </div>
        </div>
        <div className="proof-card highlight">
          <div className="proof-item">
            <strong>Brza usluga</strong>
            <span>Porudžbine idu odmah, bez čekanja.</span>
          </div>
          <div className="proof-item">
            <strong>Gaming zona</strong>
            <span>PC i konzole spremne u svako doba.</span>
          </div>
          <div className="proof-item">
            <strong>Komfor</strong>
            <span>Prostor za ekipe i duge partije.</span>
          </div>
        </div>
      </section>

      <section className="landing-section atmosphere">
        <div className="section-header">
          <h2>Atmosfera i iskustvo</h2>
          <p className="muted">Kafa, igre i prostor koji radi bez zastoja.</p>
        </div>
        <div className="gallery gallery-large">
          <div className="shot warm">Espresso bar</div>
          <div className="shot cool">Gaming pods</div>
          <div className="shot neon">Arcade corner</div>
          <div className="shot wood">Cozy lounge</div>
          <div className="shot midnight">VR zone</div>
          <div className="shot sunset">Community table</div>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="footer-brand">Pixel Cafe & Igraonica</div>
          <div className="muted">Skeniraj • Poruči • Igraj</div>
        </div>
        <div className="footer-meta">
          <span>Radno vreme: 08:00 – 00:00</span>
          <button className="btn tiny ghost" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light varijanta' : 'Dark varijanta'}
          </button>
        </div>
      </footer>
    </main>
  );
}

