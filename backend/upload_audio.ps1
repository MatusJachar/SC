$TOKEN = ""
$BASE = "http://nrjrc2wkj5nf2s5rmgxngesn.178.104.72.151.sslip.io/api"
$AUDIO_DIR = "C:\Users\User1\Desktop\SC\backend\uploads\audio"

Write-Host "Logging in..." -ForegroundColor Cyan
$loginBody = '{"username":"hradmin","password":"hrad2024"}'
$loginResp = Invoke-RestMethod -Uri "$BASE/admin/login" -Method POST -Body $loginBody -ContentType "application/json"
$TOKEN = $loginResp.access_token
Write-Host "Login OK! Token: $($TOKEN.Substring(0,20))..." -ForegroundColor Green

$headers = @{ Authorization = "Bearer $TOKEN" }
$ok = 0; $fail = 0

foreach ($stop in 10,11,12,13) {
    foreach ($lang in "sk","en","de","pl","hu","fr","es","ru","zh") {
        $fname = "stop${stop}_${lang}.mp3"
        $fpath = Join-Path $AUDIO_DIR $fname
        
        if (-not (Test-Path $fpath)) {
            Write-Host "  MISSING: $fname" -ForegroundColor Yellow
            continue
        }
        
        $fsize = [math]::Round((Get-Item $fpath).Length / 1KB)
        
        try {
            $fileBytes = [System.IO.File]::ReadAllBytes($fpath)
            $boundary = [System.Guid]::NewGuid().ToString()
            $bodyLines = @(
                "--$boundary",
                "Content-Disposition: form-data; name=`"file`"; filename=`"$fname`"",
                "Content-Type: audio/mpeg",
                "",
                [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
                "--$boundary--"
            )
            $body = $bodyLines -join "`r`n"
            $bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($body)
            
            $resp = Invoke-WebRequest -Uri "$BASE/admin/upload/audio" `
                -Method POST `
                -Headers $headers `
                -Body $bodyBytes `
                -ContentType "multipart/form-data; boundary=$boundary" `
                -TimeoutSec 120
            
            if ($resp.StatusCode -in 200,201) {
                Write-Host "  OK: $fname (${fsize}KB)" -ForegroundColor Green
                $ok++
            } else {
                Write-Host "  FAIL $($resp.StatusCode): $fname" -ForegroundColor Red
                $fail++
            }
        } catch {
            Write-Host "  ERROR: $fname - $_" -ForegroundColor Red
            $fail++
        }
    }
}

Write-Host ""
Write-Host "=== DONE === OK:$ok FAIL:$fail" -ForegroundColor Cyan
