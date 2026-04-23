# Spusti tento skript pred každým EAS buildom
# Vymaze node_modules správne aj na Windows

Write-Host "Mazem node_modules..." -ForegroundColor Yellow

# Windows-safe mazanie dlhých ciest
if (Test-Path "node_modules") {
    # Metóda 1: cmd rmdir (zvládne dlhé cesty)
    cmd /c "rmdir /s /q node_modules"
    
    if (Test-Path "node_modules") {
        # Metóda 2: robocopy trik - skopíruje prázdny priečinok cez node_modules
        mkdir _empty_tmp -Force | Out-Null
        robocopy _empty_tmp node_modules /MIR /NFL /NDL /NJH /NJS | Out-Null
        Remove-Item _empty_tmp -Force
        Remove-Item node_modules -Force
    }
}

Write-Host "node_modules zmazané!" -ForegroundColor Green
Write-Host "Spúšťam npm install..." -ForegroundColor Yellow
npm install
Write-Host "Hotovo! Spúšťaj: eas build --platform android --profile preview" -ForegroundColor Green
