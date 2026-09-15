$projectRoot = 'D:\Shiseido Camp 2026'
$previewUrl = 'http://127.0.0.1:3000'

$serverIsRunning = $false
try {
  $serverIsRunning = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
} catch {
  $serverIsRunning = $false
}

if (-not $serverIsRunning) {
  Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev -- -H 127.0.0.1' -WorkingDirectory $projectRoot
  Start-Sleep -Seconds 4
}

Start-Process $previewUrl
