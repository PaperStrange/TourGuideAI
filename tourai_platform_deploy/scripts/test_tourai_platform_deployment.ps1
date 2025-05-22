# PowerShell script to test TourAI Platform deployment (Windows)
# Tests backend and frontend in tourai_platform_deploy

$backendDir = "tourai_platform_deploy/backend"
$frontendDir = "tourai_platform_deploy/frontend"

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$Retries = 20,
        [int]$WaitSec = 2
    )
    for ($i = 0; $i -lt $Retries; $i++) {
        $tcp = Test-NetConnection -ComputerName 'localhost' -Port $Port
        if ($tcp.TcpTestSucceeded) { return $true }
        Start-Sleep -Seconds $WaitSec
    }
    return $false
}

# Start backend
Write-Host "[Backend] Installing dependencies..."
Push-Location $backendDir
npm install
if (!(Test-Path .env) -and (Test-Path .env.example)) {
    Copy-Item .env.example .env
    Write-Host "[Backend] Copied .env.example to .env. Please edit .env if secrets are needed."
}
Write-Host "[Backend] Starting backend server..."
$backendProc = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
Pop-Location

# Wait for backend
Write-Host "[Backend] Waiting for backend to be available on port 3001..."
if (Wait-ForPort -Port 3001) {
    Write-Host "[Backend] Backend is running on port 3001."
} else {
    Write-Host "[Backend] ERROR: Backend did not start on port 3001."
    $backendProc | Stop-Process
    exit 1
}

# Start frontend
Write-Host "[Frontend] Installing dependencies..."
Push-Location $frontendDir
npm install
if (!(Test-Path .env)) {
    "REACT_APP_API_URL=http://localhost:3001" | Out-File -Encoding utf8 .env
    Write-Host "[Frontend] Created .env with REACT_APP_API_URL."
}
Write-Host "[Frontend] Starting frontend..."
$frontendProc = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
Pop-Location

# Wait for frontend
Write-Host "[Frontend] Waiting for frontend to be available on port 3000..."
if (Wait-ForPort -Port 3000) {
    Write-Host "[Frontend] Frontend is running on port 3000."
} else {
    Write-Host "[Frontend] ERROR: Frontend did not start on port 3000."
    $backendProc | Stop-Process
    $frontendProc | Stop-Process
    exit 1
}

Write-Host "[SUCCESS] Both backend and frontend are running. Test at http://localhost:3000 and http://localhost:3001."
Write-Host "Press Ctrl+C to stop both servers."

# Wait for user to exit
try {
    while ($true) { Start-Sleep -Seconds 10 }
} finally {
    $backendProc | Stop-Process
    $frontendProc | Stop-Process
} 