'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Game = { id: string; name: string };
type Station = { id: string; name: string };
type Reservation = {
  id: string;
  stationId: string;
  startsAt: string;
  endsAt: string;
  game?: { id: string; name: string } | null;
};

const OPEN_START_HOUR = 8;
const OPEN_END_HOUR = 24;
const SLOT_MINUTES = 30;
const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 120;

const pad = (value: number) => String(value).padStart(2, '0');

const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
};

const addMinutes = (time: string, minutesToAdd: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  return minutesToTime(total);
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toLocalDateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function ReservePage() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stationId, setStationId] = useState('');
  const [gameId, setGameId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(todayDate());
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<Reservation | null>(null);

  useEffect(() => {
    const load = async () => {
      const g = await fetch(`${baseUrl}/games`).then((r) => r.json());
      const s = await fetch(`${baseUrl}/game-stations`).then((r) => r.json());
      setGames(g);
      setStations(s);
      if (g.length > 0) setGameId(g[0].id);
      const savedStation = localStorage.getItem('lastStationId');
      if (savedStation && s.some((st: Station) => st.id === savedStation)) {
        setStationId(savedStation);
      } else if (s.length > 0) {
        setStationId(s[0].id);
      }
    };
    load();
  }, [baseUrl]);

  const loadReservations = async () => {
    if (!stationId || !date) return;
    setReservations([]);
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59`;
    const res = await fetch(
      `${baseUrl}/reservations?stationId=${stationId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!res.ok) {
      setError('Ne mogu da učitam dostupnost. Osveži stranicu.');
      return;
    }
    const data = await res.json();
    setReservations(data);
  };

  useEffect(() => {
    loadReservations();
    setStartTime('');
  }, [baseUrl, date, stationId]);

  const slots = useMemo(() => {
    const list: { start: string; end: string }[] = [];
    for (
      let minutes = OPEN_START_HOUR * 60;
      minutes < OPEN_END_HOUR * 60;
      minutes += SLOT_MINUTES
    ) {
      list.push({
        start: minutesToTime(minutes),
        end: minutesToTime(minutes + SLOT_MINUTES),
      });
    }
    return list;
  }, []);

  const slotStatus = (slotStart: string, slotEnd: string) => {
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);
    return reservations.some((r) => {
      const resDateKey = toLocalDateKey(r.startsAt);
      if (resDateKey !== date) return false;
      const resStart = new Date(r.startsAt);
      const resEnd = new Date(r.endsAt);
      const resStartMin = resStart.getHours() * 60 + resStart.getMinutes();
      const resEndMin = resEnd.getHours() * 60 + resEnd.getMinutes();
      return resStartMin < slotEndMin && resEndMin > slotStartMin;
    })
      ? 'busy'
      : 'free';
  };

  const isInSelectedRange = (slotStart: string, slotEnd: string) => {
    if (!startTime) return false;
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(selectedEndTime);
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);
    return slotStartMin < endMin && slotEndMin > startMin;
  };

  const selectedEndTime = startTime
    ? addMinutes(startTime, durationMinutes)
    : '';

  const validate = () => {
    if (!stationId) return 'Izaberi stanicu.';
    if (!customerName || !customerPhone) return 'Unesi ime i telefon.';
    if (!date || !startTime) return 'Izaberi datum i vreme početka.';
    if (durationMinutes < MIN_DURATION_MINUTES)
      return `Minimalno trajanje je ${MIN_DURATION_MINUTES} min.`;
    if (durationMinutes > MAX_DURATION_MINUTES)
      return `Maksimalno trajanje je ${MAX_DURATION_MINUTES / 60}h.`;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${selectedEndTime}`);
    if (end <= start) return 'Vreme završetka mora biti posle početka.';

    const dayEnd =
      OPEN_END_HOUR === 24
        ? new Date(new Date(`${date}T00:00`).getTime() + 24 * 60 * 60 * 1000)
        : new Date(`${date}T${pad(OPEN_END_HOUR)}:00`);
    if (end > dayEnd) return 'Termin izlazi iz radnog vremena.';

    const conflict = reservations.some((r) => {
      const resStart = new Date(r.startsAt);
      const resEnd = new Date(r.endsAt);
      return resStart < end && resEnd > start;
    });
    if (conflict) return 'Termin se preklapa sa postojećom rezervacijom.';

    return null;
  };

  const submit = async () => {
    setMessage(null);
    setError(null);

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const startsAt = `${date}T${startTime}`;
    const endsAt = `${date}T${selectedEndTime}`;

    setIsSubmitting(true);
    const res = await fetch(`${baseUrl}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationId,
        gameId: gameId || undefined,
        customerName,
        customerPhone,
        startsAt,
        endsAt,
      }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      setError('Termin nije dostupan. Pokušaj drugi slot.');
      return;
    }
    const created = await res.json();
    setSuccess(created);
    setMessage('Rezervacija je uspešna!');
    await loadReservations();
  };

  if (success) {
    return (
      <div className="reservation-shell">
        <div className="success-card">
          <h1>Rezervacija potvrđena</h1>
          <p className="muted">
            {success.game?.name ? `${success.game.name} • ` : ''}
            {date} • {startTime} – {selectedEndTime}
          </p>
          <p>Hvala, {customerName}. Videćemo se uskoro!</p>
          <button
            className="btn primary"
            onClick={() => {
              setSuccess(null);
              setMessage(null);
              setError(null);
            }}
          >
            Nova rezervacija
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-scene">
      <div className="reserve-orb orb-a" />
      <div className="reserve-orb orb-b" />
      <div className="reserve-orb orb-c" />
      <div className="reserve-sticker sticker-monitor" />
      <div className="reserve-sticker sticker-controller" />
      <div className="reservation-shell">
        <div className="reservation-header">
          <button
            className="btn tiny ghost"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          >
            Nazad
          </button>
          <h1>Rezerviši igru</h1>
          <p className="muted">Odaberi računar, vreme i potvrdi termin.</p>
        </div>

      <div className="reserve-grid">
        <section className="reserve-form">
          <label>Računar</label>
        <select
          value={stationId}
          onChange={(e) => {
            setStationId(e.target.value);
            localStorage.setItem('lastStationId', e.target.value);
          }}
        >
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

          <label>Igra (opciono)</label>
          <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
            <option value="">Bez igre</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <label>Ime</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <label>Telefon</label>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />

          <label>Datum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label>Vreme početka</label>
          <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            <option value="">Izaberi vreme</option>
            {slots.map((slot) => (
              <option key={slot.start} value={slot.start}>
                {slot.start}
              </option>
            ))}
          </select>

          <label>Trajanje</label>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            <option value={30}>30 min</option>
            <option value={60}>1 sat</option>
            <option value={90}>1h 30m</option>
            <option value={120}>2 sata</option>
          </select>

          <div className="summary-row">
            <span>Planirano</span>
            <strong>{startTime ? `${startTime} – ${selectedEndTime}` : '—'}</strong>
          </div>

          <button className="btn primary full" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? 'Slanje...' : 'Rezerviši'}
          </button>
          {message && <div className="notice">{message}</div>}
          {error && <div className="error">{error}</div>}
        </section>

        <section className="availability-panel">
          <div className="panel-header">
            <h2>Dostupnost</h2>
            <div className="legend">
              <span className="legend-item">
                <span className="slot free" /> Slobodno
              </span>
              <span className="legend-item">
                <span className="slot busy" /> Zauzeto
              </span>
            </div>
          </div>
          <div className="availability-table">
            <div className="availability-head">
              <span>Vreme</span>
              <span>Status</span>
              <span>Akcija</span>
            </div>
            <div className="availability-split">
              <div className="availability-block">
                <h3>Slobodni termini</h3>
                {slots
                  .filter((slot) => slotStatus(slot.start, slot.end) === 'free')
                  .map((slot) => (
                    <button
                      key={slot.start}
                      className="slot free"
                      onClick={() => setStartTime(slot.start)}
                      aria-label={`Slobodno ${slot.start} do ${slot.end}`}
                    >
                      <span className="slot-time">
                        {slot.start} – {slot.end}
                      </span>
                    </button>
                  ))}
                {slots.filter((slot) => slotStatus(slot.start, slot.end) === 'free').length === 0 && (
                  <div className="muted">Nema slobodnih termina za ovaj dan.</div>
                )}
              </div>

              <div className="availability-block">
                <h3>Rezervisano</h3>
                {slots
                  .filter((slot) => slotStatus(slot.start, slot.end) === 'busy')
                  .map((slot) => (
                    <div key={slot.start} className="availability-row reserved">
                      <span>Rezervisano • {slot.start} – {slot.end}</span>
                      <span className="status-label busy">REZERVISANO</span>
                    </div>
                  ))}
                {slots.filter((slot) => slotStatus(slot.start, slot.end) === 'busy').length === 0 && (
                  <div className="muted">Nema rezervacija za ovaj dan.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
