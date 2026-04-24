# BUILD.ps1 - Spusti tento skript namiesto priameho "eas build"
# Zabezpeci male archiv (~50MB namiesto 1.5GB)

Write-Host "=== SPIS CASTLE BUILD SCRIPT ===" -ForegroundColor Yellow

# 1. Git push
Write-Host "`n[1/4] Git push..." -ForegroundColor Cyan
git add -A
$msg = Read-Host "Commit message (Enter = 'update')"
if ($msg -eq "") { $msg = "update" }
git commit -m $msg
git push origin main

# 2. Vymazat node_modules (Windows-safe sposob)
Write-Host "`n[2/4] Mazem node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    # Robocopy trik - najspolahlivejsi sposob na Windows
    $tmp = New-Item -ItemType Directory -Path "_empty_tmp" -Force
    robocopy "_empty_tmp" "node_modules" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    Remove-Item "_empty_tmp" -Force -Recurse
    Remove-Item "node_modules" -Force -Recurse -ErrorAction SilentlyContinue
    
    # Fallback - cmd rmdir
    if (Test-Path "node_modules") {
        cmd /c "rmdir /s /q node_modules"
    }
}
Write-Host "node_modules vymazane!" -ForegroundColor Green

# 3. npm install
Write-Host "`n[3/4] npm install..." -ForegroundColor Cyan
npm install

# 4. EAS build
Write-Host "`n[4/4] EAS build..." -ForegroundColor Cyan
Write-Host "Velkost archivu by mala byt ~50MB nie 1.5GB" -ForegroundColor Green
eas build --platform android --profile preview

Write-Host "`n=== HOTOVO ===" -ForegroundColor Yellow
