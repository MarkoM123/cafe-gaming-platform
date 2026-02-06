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
          </div>
          <div className="hero-note">
            QR meni je dostupan samo skeniranjem koda na stolu.
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card glass">
            <div className="hero-card-title">Skeniraj → Poruči</div>
            <div className="hero-card-body">
              <div className="pulse-dot" />
              <div>Porudžbina je jasna i brza</div>
            </div>
            <div className="hero-card-footer">Sve bez aplikacije</div>
          </div>

          <div className="hero-card neon">
            <div className="hero-card-title">Rezervacije po stanici</div>
            <div className="slot-row">
              <span className="slot-chip free">Slobodno</span>
              <span>18:00 – 20:00</span>
            </div>
            <div className="slot-row">
              <span className="slot-chip busy">Zauzeto</span>
              <span>20:00 – 22:00</span>
            </div>
            <div className="slot-row">
              <span className="slot-chip hold">Potvrda</span>
              <span>22:00 – 23:00</span>
            </div>
          </div>

          <div className="hero-card signal">
            <div className="hero-card-title">Status narudžbine</div>
            <div className="signal-row">
              <span className="dot on" /> Poslato
            </div>
            <div className="signal-row">
              <span className="dot wait" /> U pripremi
            </div>
            <div className="signal-row">
              <span className="dot off" /> Spremno
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section flow-section">
        <div className="section-header">
          <h2>Kako izgleda gostu</h2>
          <p className="muted">
            Jednostavno, brzo i bez konfuzije — sve je tu gde treba.
          </p>
        </div>
        <div className="flow-grid">
          <article className="flow-card">
            <div className="flow-index">01</div>
            <h3>QR meni</h3>
            <p>Skener na stolu vodi direktno na meni i narudžbinu.</p>
            <div className="flow-meta">Bez registracije • bez čekanja</div>
          </article>
          <article className="flow-card">
            <div className="flow-index">02</div>
            <h3>Brza porudžbina</h3>
            <p>Izaberi stavke, potvrdi i prati status uživo.</p>
            <div className="flow-meta">Jasno • transparentno</div>
          </article>
          <article className="flow-card">
            <div className="flow-index">03</div>
            <h3>Rezervacije igara</h3>
            <p>Izaberi stanicu, termin i potvrdi u dva klika.</p>
            <div className="flow-meta">Bez preklapanja • sigurno</div>
          </article>
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
          </div>
        </div>
        <div className="proof-card">
          <div>
            <strong>QR iskustvo</strong>
            <span>Meni dostupan samo na stolu</span>
          </div>
          <div>
            <strong>Brza porudžbina</strong>
            <span>Od skeniranja do potvrde za par sekundi</span>
          </div>
          <div>
            <strong>Rezervacije</strong>
            <span>Termini jasni i bez preklapanja</span>
          </div>
        </div>
      </section>

      <section className="landing-section atmosphere">
        <div className="section-header">
          <h2>Atmosfera i iskustvo</h2>
          <p className="muted">Kafa, igre i prostor koji radi bez zastoja.</p>
        </div>
        <div className="gallery">
          <div className="shot warm">Espresso bar</div>
          <div className="shot cool">Gaming pods</div>
          <div className="shot neon">Arcade corner</div>
          <div className="shot wood">Cozy lounge</div>
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

