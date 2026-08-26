param(
  [string]$ManifestPath
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$assetsRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "packages/catalogue-authoring/assets"))
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Join-Path $assetsRoot "discovery-thumbnails.manifest.json"
}
$manifestFile = [IO.Path]::GetFullPath($ManifestPath)
if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf)) {
  throw "Discovery detail derivation could not find thumbnail manifest $manifestFile. Refresh the list tier first."
}

$manifest = Get-Content -Raw -LiteralPath $manifestFile | ConvertFrom-Json
$entries = @($manifest.entries)
if ($entries.Count -eq 0) {
  throw "Discovery detail derivation found no qualified studies. Refresh the thumbnail manifest first."
}

Add-Type -AssemblyName System.Drawing
$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1
if ($null -eq $jpegCodec) {
  throw "Discovery detail derivation could not find a Windows JPEG encoder. Install a System.Drawing-compatible codec and retry."
}

function ConvertTo-JpegBytes {
  param([Drawing.Bitmap]$Bitmap, [int]$Quality)
  $stream = [IO.MemoryStream]::new()
  try {
    $qualityParameter = [Drawing.Imaging.EncoderParameter]::new(
      [Drawing.Imaging.Encoder]::Quality,
      [long]$Quality
    )
    $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
    try {
      $parameters.Param[0] = $qualityParameter
      $Bitmap.Save($stream, $jpegCodec, $parameters)
      return $stream.ToArray()
    }
    finally {
      $parameters.Dispose()
      $qualityParameter.Dispose()
    }
  }
  finally {
    $stream.Dispose()
  }
}

$expectedPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$results = [Collections.Generic.List[object]]::new()
foreach ($entry in $entries) {
  $key = [string]$entry.key
  if ($key -notmatch '^(?<catalogue>[a-z0-9]+(?:-[a-z0-9]+)*)/(?<file>[a-z0-9]+(?:-[a-z0-9]+)*\.jpg)$') {
    throw "Discovery detail derivation rejected key '$key'. Keep catalogue-qualified lowercase JPEG keys."
  }
  $catalogueDirectory = [IO.Path]::GetFullPath((Join-Path $assetsRoot $Matches.catalogue))
  $sourceFile = [IO.Path]::GetFullPath((Join-Path $catalogueDirectory $Matches.file))
  $detailDirectory = [IO.Path]::GetFullPath((Join-Path $catalogueDirectory "details"))
  $detailFile = [IO.Path]::GetFullPath((Join-Path $detailDirectory $Matches.file))
  foreach ($path in $sourceFile, $detailFile) {
    if (-not $path.StartsWith("$catalogueDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
      throw "Discovery detail derivation refused path $path because it escapes $catalogueDirectory."
    }
  }
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Discovery detail derivation could not find normalized source $sourceFile for $key. Restore or regenerate it first."
  }
  if (-not $expectedPaths.Add($detailFile)) {
    throw "Discovery detail derivation maps more than one study to $detailFile. Keep qualified keys unique."
  }
  New-Item -ItemType Directory -Path $detailDirectory -Force | Out-Null

  $source = $null
  $detail = $null
  $graphics = $null
  try {
    $source = [Drawing.Image]::FromFile($sourceFile)
    if ($source.Width -ne 896 -or $source.Height -ne 896) {
      throw "Discovery detail derivation rejected $sourceFile at $($source.Width) by $($source.Height); normalize it to 896 by 896 first."
    }
    $detail = [Drawing.Bitmap]::new(384, 384, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $detail.SetResolution(96, 96)
    $graphics = [Drawing.Graphics]::FromImage($detail)
    $graphics.Clear([Drawing.Color]::Black)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($source, [Drawing.Rectangle]::new(0, 0, 384, 384))

    $bytes = $null
    $selectedQuality = $null
    foreach ($quality in 84, 80, 76, 72, 68, 64, 60) {
      $candidate = ConvertTo-JpegBytes $detail $quality
      if ($candidate.Length -le 64KB) {
        $bytes = $candidate
        $selectedQuality = $quality
        break
      }
    }
    if ($null -eq $bytes) {
      throw "Discovery detail derivation could not reduce $key below 64 KiB. Simplify the reviewed source before retrying."
    }
    [IO.File]::WriteAllBytes($detailFile, $bytes)
    $results.Add([ordered]@{ key = $key; bytes = $bytes.Length; jpegQuality = $selectedQuality })
  }
  finally {
    if ($null -ne $graphics) { $graphics.Dispose() }
    if ($null -ne $detail) { $detail.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
  }
}

$trackedDetails = @(
  Get-ChildItem -LiteralPath $assetsRoot -Recurse -File -Filter "*.jpg" |
    Where-Object { $_.Directory.Name -eq "details" }
)
if ($trackedDetails.Count -ne $entries.Count) {
  throw "Discovery detail derivation found $($trackedDetails.Count) detail previews for $($entries.Count) qualified studies. Remove the exact stale detail or restore its source before refreshing the closed tier."
}
foreach ($detail in $trackedDetails) {
  if (-not $expectedPaths.Contains($detail.FullName)) {
    throw "Discovery detail derivation found unbound preview $($detail.FullName). Remove that exact stale file before refreshing the manifest."
  }
}

$results | ConvertTo-Json -Depth 3
