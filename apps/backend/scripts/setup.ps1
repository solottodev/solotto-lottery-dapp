param(
  [switch]$Recreate
)

Write-Host "Starting Postgres on port 5433 via Docker Compose..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\.."
try {
  if ($Recreate) { docker compose down -v }
  docker compose up -d
} finally {
  Pop-Location
}

Write-Host "Waiting for Postgres to become healthy..." -ForegroundColor Cyan
$retries = 20
for ($i=0; $i -lt $retries; $i++) {
  $status = (docker inspect -f '{{.State.Health.Status}}' solotto-pg) 2>$null
  if ($status -eq 'healthy') { break }
  Start-Sleep -Seconds 2
}
if ($status -ne 'healthy') { Write-Warning "Database not healthy yet; continuing anyway." }

Write-Host "Running Prisma generate/migrate/seed..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\.."
try {
  npx prisma generate
  npx prisma migrate dev -n init || exit $LASTEXITCODE
  npm run seed
} finally {
  Pop-Location
}

Write-Host "Setup complete. Backend env should point to port 5433." -ForegroundColor Green

