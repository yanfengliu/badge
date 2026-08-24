param(
  [string]$OutputPath = "tmp/visual-evidence/national-parks-contact-sheet.png"
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$assetsDirectory = [IO.Path]::GetFullPath(
  (Join-Path $repoRoot "packages/catalogue-authoring/assets/national-parks")
)
$outputFile = [IO.Path]::GetFullPath((Join-Path $repoRoot $OutputPath))
$evidenceDirectory = [IO.Path]::GetFullPath((Join-Path $repoRoot "tmp/visual-evidence"))
if (-not $outputFile.StartsWith("$evidenceDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
  throw "Contact-sheet rendering refused output $outputFile because visual evidence must stay under $evidenceDirectory."
}

$assets = @(Get-ChildItem -LiteralPath $assetsDirectory -Filter "*.jpg" | Sort-Object Name)
if ($assets.Count -ne 63) {
  throw "Contact-sheet rendering found $($assets.Count) national-park studies in $assetsDirectory; prepare the exact 63-park edition first."
}

New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($outputFile)) -Force | Out-Null
Add-Type -AssemblyName System.Drawing

$columns = 7
$cellWidth = 220
$cellHeight = 246
$margin = 24
$rows = [Math]::Ceiling($assets.Count / $columns)
$sheet = [Drawing.Bitmap]::new(
  ($columns * $cellWidth) + ($margin * 2),
  ($rows * $cellHeight) + ($margin * 2),
  [Drawing.Imaging.PixelFormat]::Format24bppRgb
)
$graphics = [Drawing.Graphics]::FromImage($sheet)
$font = [Drawing.Font]::new("Segoe UI", 10, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$brush = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(231, 224, 213))
try {
  $graphics.Clear([Drawing.Color]::FromArgb(35, 34, 29))
  $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for ($index = 0; $index -lt $assets.Count; $index += 1) {
    $column = $index % $columns
    $row = [Math]::Floor($index / $columns)
    $x = $margin + ($column * $cellWidth)
    $y = $margin + ($row * $cellHeight)
    $image = [Drawing.Image]::FromFile($assets[$index].FullName)
    try {
      $graphics.DrawImage($image, [Drawing.Rectangle]::new($x, $y, 204, 204))
    }
    finally {
      $image.Dispose()
    }
    $label = [IO.Path]::GetFileNameWithoutExtension($assets[$index].Name)
    $graphics.DrawString($label, $font, $brush, [Drawing.PointF]::new($x, $y + 211))
  }
  $sheet.Save($outputFile, [Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $brush.Dispose()
  $font.Dispose()
  $graphics.Dispose()
  $sheet.Dispose()
}

Write-Output $outputFile
