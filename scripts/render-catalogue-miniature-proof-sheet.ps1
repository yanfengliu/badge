param(
  [Parameter(Mandatory = $true)]
  [string]$CatalogueDirectory,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [ValidateRange(1, 1000)]
  [int]$ExpectedCount
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$assetsRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "packages/catalogue-authoring/assets"))
if ($CatalogueDirectory -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
  throw "Miniature proof rejected catalogue directory '$CatalogueDirectory'. Use lowercase ASCII words separated by single hyphens."
}
$assetsDirectory = [IO.Path]::GetFullPath((Join-Path $assetsRoot $CatalogueDirectory))
if (-not $assetsDirectory.StartsWith("$assetsRoot$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
  throw "Miniature proof refused asset path $assetsDirectory because it escapes $assetsRoot."
}
$outputFile = [IO.Path]::GetFullPath((Join-Path $repoRoot $OutputPath))
$evidenceRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "tmp/visual-evidence"))
if (-not $outputFile.StartsWith("$evidenceRoot$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
  throw "Miniature proof refused output $outputFile because visual evidence must stay under $evidenceRoot."
}

$assets = @(Get-ChildItem -LiteralPath $assetsDirectory -Filter "*.jpg" -File | Sort-Object Name)
if ($assets.Count -ne $ExpectedCount) {
  throw "Miniature proof found $($assets.Count) studies in $assetsDirectory; expected exactly $ExpectedCount."
}

New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($outputFile)) -Force | Out-Null
Add-Type -AssemblyName System.Drawing
$columns = 8
$cellWidth = 132
$cellHeight = 132
$margin = 20
$rows = [Math]::Ceiling($assets.Count / $columns)
$sheet = [Drawing.Bitmap]::new(($columns * $cellWidth) + ($margin * 2), ($rows * $cellHeight) + ($margin * 2))
$graphics = [Drawing.Graphics]::FromImage($sheet)
$font = [Drawing.Font]::new("Segoe UI", 9, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$brush = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(235, 229, 216))
try {
  $graphics.Clear([Drawing.Color]::FromArgb(31, 30, 26))
  $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  for ($index = 0; $index -lt $assets.Count; $index += 1) {
    $column = $index % $columns
    $row = [Math]::Floor($index / $columns)
    $x = $margin + ($column * $cellWidth)
    $y = $margin + ($row * $cellHeight)
    $source = [Drawing.Image]::FromFile($assets[$index].FullName)
    $proof = [Drawing.Bitmap]::new(48, 48, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $proofGraphics = [Drawing.Graphics]::FromImage($proof)
    try {
      $proofGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $proofGraphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $proofGraphics.DrawImage($source, [Drawing.Rectangle]::new(0, 0, 48, 48))
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
      $graphics.DrawImage($proof, [Drawing.Rectangle]::new($x, $y, 96, 96))
    }
    finally {
      $proofGraphics.Dispose()
      $proof.Dispose()
      $source.Dispose()
    }
    $label = [IO.Path]::GetFileNameWithoutExtension($assets[$index].Name)
    $graphics.DrawString($label, $font, $brush, [Drawing.RectangleF]::new($x, $y + 100, 124, 28))
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
