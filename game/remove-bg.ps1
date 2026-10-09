# ========================================
#   PNG Boşluk Kırpıcı (Trim Transparent Area)
#   Tüm _png klasörlerindeki thumbnail'ları kırpar
# ========================================
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File remove-bg.ps1
#
# Gereksinim: ImageMagick
#   winget install ImageMagick.ImageMagick

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PNG Bosluk Kirpici (Trim)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$magick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host "  ImageMagick bulunamadi!" -ForegroundColor Red
    Write-Host "  winget install ImageMagick.ImageMagick" -ForegroundColor Yellow
    pause; exit 1
}

$targetDir = Join-Path $PSScriptRoot "src\components\models\face"

if (-not (Test-Path $targetDir)) {
    Write-Host "HATA: $targetDir bulunamadi" -ForegroundColor Red
    pause; exit 1
}

$files = Get-ChildItem -Path $targetDir -Filter "*.png" -Recurse | Where-Object {
    $_.DirectoryName -match '_png'
}

$total = $files.Count
$count = 0

Write-Host "  $total PNG bulundu"
Write-Host ""

foreach ($file in $files) {
    $count++
    $origSize = [math]::Round($file.Length / 1024, 0)
    
    Write-Host "[$count/$total] $($file.Name)" -NoNewline
    
    try {
        # Boşlukları kırp + küçük padding bırak
        & magick $file.FullName -trim +repage -bordercolor transparent -border 10 $file.FullName
        
        $newSize = [math]::Round((Get-Item $file.FullName).Length / 1024, 0)
        Write-Host "  ${origSize}KB -> ${newSize}KB" -ForegroundColor Green
    } catch {
        Write-Host "  HATA" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  $count dosya islendi"
Write-Host "========================================" -ForegroundColor Cyan
pause
