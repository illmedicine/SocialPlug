# retry-apply.ps1 — Keep retrying terraform apply until ARM capacity is available
# Oracle Free Tier ARM instances are heavily oversubscribed.
# Run this and leave it going — it retries every 60 seconds.

param(
    [int]$IntervalSeconds = 60,
    [int]$MaxAttempts = 0  # 0 = unlimited
)

$attempt = 0
while ($true) {
    $attempt++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "`n[$timestamp] Attempt #$attempt..." -ForegroundColor Cyan

    $output = terraform apply -auto-approve -no-color 2>&1 | Out-String

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n SUCCESS! All VMs provisioned." -ForegroundColor Green
        Write-Host $output
        terraform output -no-color
        break
    }

    if ($output -match "Out of host capacity") {
        Write-Host "  ARM capacity unavailable. Retrying in $IntervalSeconds seconds..." -ForegroundColor Yellow
    } else {
        Write-Host "  Failed with a different error:" -ForegroundColor Red
        Write-Host ($output | Select-String "Error:" | Out-String)
        break
    }

    if ($MaxAttempts -gt 0 -and $attempt -ge $MaxAttempts) {
        Write-Host "`nMax attempts ($MaxAttempts) reached. Stopping." -ForegroundColor Red
        break
    }

    Start-Sleep -Seconds $IntervalSeconds
}
