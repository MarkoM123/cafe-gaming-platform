# STATUS

## Testiranje (tačan redosled)

1) Restart backend:
`pnpm ts-node src/main.ts`

2) Register prvog korisnika (postaje ADMIN) — pokreni jednu po jednu liniju:
`$body = @{ email="admin@demo.com"; password="secret123" } | ConvertTo-Json`
`$admin = Invoke-RestMethod -Method POST -Uri http://localhost:3001/auth/register -ContentType "application/json" -Body $body`
`$adminToken = $admin.access_token`

Ako dobiješ `409 Email already in use`, ADMIN već postoji — uradi login umesto register:
`$body = @{ email="admin@demo.com"; password="secret123" } | ConvertTo-Json`
`$admin = Invoke-RestMethod -Method POST -Uri http://localhost:3001/auth/login -ContentType "application/json" -Body $body`
`$adminToken = $admin.access_token`

3) Kreiraj STAFF preko ADMIN-a:
`$staffBody = @{ email="staff@demo.com"; password="secret123"; role="STAFF" } | ConvertTo-Json`
`Invoke-RestMethod -Method POST -Uri http://localhost:3001/users -ContentType "application/json" -Body $staffBody -Headers @{ Authorization = "Bearer $adminToken" }`

4) Login kao STAFF:
`$body = @{ email="staff@demo.com"; password="secret123" } | ConvertTo-Json`
`$staff = Invoke-RestMethod -Method POST -Uri http://localhost:3001/auth/login -ContentType "application/json" -Body $body`
`$staffToken = $staff.access_token`

5) Testovi:
`Invoke-RestMethod -Uri http://localhost:3001/users -Headers @{ Authorization = "Bearer $adminToken" }`
`Invoke-RestMethod -Uri http://localhost:3001/orders -Headers @{ Authorization = "Bearer $staffToken" }`

## Napomena (bootstrap admin)
- Ako već postoji `admin@demo.com` sa rolom `GAMER`, prvim login-om biće automatski prebačen u `ADMIN`.

## Sada uradi
1) Restart backend:
`pnpm ts-node src/main.ts`

2) Login kao admin:
`$body = @{ email="admin@demo.com"; password="secret123" } | ConvertTo-Json`
`$adminLogin = Invoke-RestMethod -Method POST -Uri http://localhost:3001/auth/login -ContentType "application/json" -Body $body`
`$adminToken = $adminLogin.access_token`

3) Test `/users`:
`Invoke-RestMethod -Uri http://localhost:3001/users -Headers @{ Authorization = "Bearer $adminToken" }`

## Napomena (RolesGuard)
- Uklonjen globalni `RolesGuard` (bio je pre `JwtAuthGuard`), sada se koristi samo preko `@UseGuards(JwtAuthGuard, RolesGuard)` na rutama.
