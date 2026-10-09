# ========================================
#   GLB Optimizer (512x512 + WebP)
#   gltf-transform ile texture küçült + WebP
# ========================================
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File optimize-glb.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GLB Optimizer (512x512 + WebP Q80)" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

# Paketleri kur
$needInstall = $false
try { $v = & gltf-transform --version 2>$null } catch { $needInstall = $true }
if ($needInstall -or $LASTEXITCODE -ne 0) {
    Write-Host "  Paketler kuruluyor..." -ForegroundColor Yellow
    npm install -g @gltf-transform/cli sharp
}

$inputDir = Join-Path $PSScriptRoot "src\components\models\face"
$outputDir = Join-Path $PSScriptRoot "public\models\face"

if (-not (Test-Path $inputDir)) {
    Write-Host "HATA: $inputDir bulunamadi" -ForegroundColor Red
    pause; exit 1
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# _glb klasörlerindeki GLB'leri bul
$files = Get-ChildItem -Path $inputDir -Filter "*.glb" -Recurse | Where-Object {
    $_.DirectoryName -match '_glb'
}

$total = $files.Count
$count = 0
$totalOrig = 0
$totalNew = 0

Write-Host "  $total GLB bulundu" 
Write-Host ""

foreach ($file in $files) {
    $count++
    $origSize = $file.Length
    $totalOrig += $origSize
    
    $relPath = $file.FullName.Substring($inputDir.Length + 1)
    $outPath = Join-Path $outputDir $relPath
    $outFolder = Split-Path $outPath -Parent
    New-Item -ItemType Directory -Path $outFolder -Force | Out-Null
    
    $tempPath = "$outPath.tmp.glb"
    
    Write-Host "[$count/$total] $($file.Name)" -NoNewline
    
    try {
        # 1. Resize 512x512
        & gltf-transform resize $file.FullName $tempPath --width 512 --height 512 2>$null
        
        if (Test-Path $tempPath) {
            # 2. WebP dönüşüm
            & gltf-transform webp $tempPath $outPath --quality 80 2>$null
            Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
            
            if (-not (Test-Path $outPath)) {
                # WebP başarısızsa resize'lı olanı kullan
                & gltf-transform resize $file.FullName $outPath --width 512 --height 512 2>$null
            }
        }
        
        if (-not (Test-Path $outPath)) {
            # Hiçbiri olmazsa orijinali kopyala
            Copy-Item $file.FullName $outPath
        }
        
        $newSize = (Get-Item $outPath).Length
        $totalNew += $newSize
        $savings = [math]::Round((1 - $newSize / $origSize) * 100, 1)
        $oKB = [math]::Round($origSize / 1024, 0)
        $nKB = [math]::Round($newSize / 1024, 0)
        Write-Host "  ${oKB}KB -> ${nKB}KB  (-${savings}%)" -ForegroundColor Green
    } catch {
        Copy-Item $file.FullName $outPath -Force
        $totalNew += $origSize
        Write-Host "  KOPYALANDI" -ForegroundColor Yellow
    }
}

# Default GLB'leri kopyala
Write-Host ""
Write-Host "--- Default GLB'ler ---" -ForegroundColor Yellow
foreach ($df in @('Man_Eye1.glb', 'Man_Eye_Brows1.glb', 'Man_Mouth1.glb', 'Women_Eye1.glb')) {
    $src = Join-Path $inputDir $df
    $dst = Join-Path $outputDir $df
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  + $df"
    }
}

# PNG thumbnail klasörlerini kopyala
Write-Host ""
Write-Host "--- PNG thumbnails ---" -ForegroundColor Yellow
Get-ChildItem -Path $inputDir -Directory -Recurse | Where-Object { $_.Name -match '_png' } | ForEach-Object {
    $rel = $_.FullName.Substring($inputDir.Length + 1)
    $dstDir = Join-Path $outputDir $rel
    if (-not (Test-Path $dstDir)) {
        Copy-Item $_.FullName $dstDir -Recurse -Force
    } else {
        Copy-Item "$($_.FullName)\*" $dstDir -Force
    }
    Write-Host "  + $rel"
}

# Özet
$oMB = [math]::Round($totalOrig / 1024 / 1024, 2)
$nMB = [math]::Round($totalNew / 1024 / 1024, 2)
$sv = if ($totalOrig -gt 0) { [math]::Round((1 - $totalNew / $totalOrig) * 100, 1) } else { 0 }
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  $count dosya islendi"
Write-Host "  ${oMB}MB -> ${nMB}MB  (-${sv}%)"
Write-Host "========================================" -ForegroundColor Cyan
pause