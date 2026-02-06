STATUS

Backend endpoints (Feb 5, 2026)

Auth
- POST /auth/register
- POST /auth/login
- GET /auth/me

Users
- POST /users
- GET /users/me

Orders
- POST /orders
- GET /orders
- GET /orders/summary
- GET /orders/top-items
- GET /orders/stream
- PATCH /orders/:id/status
- PATCH /orders/:id/archive
- GET /orders/:id/public?tableCode=
- GET /orders/:id/stream?tableCode=

QR
- GET /qr/:tableCode

Menu
- GET /menu (requires tableCode)
- GET /menu/all
- POST /menu/categories
- POST /menu/items
- PATCH /menu/items/:id/availability

Games
- GET /games
- GET /game-stations

Reservations
- POST /reservations
- GET /reservations
- GET /reservations/top-games
- PATCH /reservations/:id/archive

Admin / Config (Feb 5, 2026)
- PATCH /menu/items/:id (ADMIN only)
- GET /games/all (ADMIN/STAFF)
- POST /games (ADMIN)
- PATCH /games/:id (ADMIN)
- GET /game-stations/all (ADMIN/STAFF)
- POST /game-stations (ADMIN)
- PATCH /game-stations/:id (ADMIN)
- GET /settings/hours
- PATCH /settings/hours (ADMIN)
- GET /audit (ADMIN)
- GET /tables (ADMIN/STAFF)

Seed + reset (Feb 5, 2026)
- pnpm seed
- pnpm reset:dev

Admin UI (Feb 5, 2026)
- /staff/menu (edit price + enable/disable)
- /staff/games (edit games/stations)
- /staff/hours (edit operating hours)
- /staff/audit (audit log view)
- /staff/qr (QR code generator per table)

Demo accounts (seed)
- admin@demo.com / admin123
- staff@demo.com / staff123
- demo@demo.com / demo123

Ops and stability (Feb 5, 2026)
- Rate limiting: /auth/login and /orders
- Audit log for order status changes and archival
- Soft delete for orders and reservations
- Reservation duration min/max enforced

Run notes (Feb 5, 2026)
- If availability shows wrong after refresh, restart backend to load new GET /reservations route.

Deployment and scaling (Feb 5, 2026)
- Docker compose includes: postgres, backend, web
- Backend build: tsc -> dist, runtime uses migrate deploy
- Frontend build: next build, runtime next start
- Env example: .env.example
- Backup: docker/backup.ps1 and docker/backup.sh (pg_dump to docker/backups)
