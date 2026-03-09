# SINCO-WEB Network Setup Script
# Run this as Administrator to configure Firewall and Multi-user Persistence

Write-Host "--- Configuring SINCO-WEB for Network Access ---" -ForegroundColor Cyan

# 1. Open Firewall Ports
Write-Host "Opening Firewall Ports (3000, 5173)..."
New-NetFirewallRule -DisplayName "SINCO-WEB Backend (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "SINCO-WEB Frontend (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 2. Check PM2 
Write-Host "Checking PM2 status..."
cmd /c pm2 stop all
cmd /c pm2 delete all
cmd /c pm2 start ecosystem.config.cjs

# 3. Save PM2 list for persistence (requires pm2-windows-startup or similar for true boot persistence)
# For now, we manually save.
cmd /c pm2 save

Write-Host "`n--- Setup Complete ---" -ForegroundColor Green
Write-Host "Accessible at: http://192.168.1.11:5173"
