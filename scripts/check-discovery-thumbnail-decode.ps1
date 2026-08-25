param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,
  [string]$AssetsRoot
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifestFile = [IO.Path]::GetFullPath($ManifestPath)
if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf)) {
  throw "Discovery thumbnail decode gate could not find manifest $manifestFile. Regenerate the qualified thumbnail manifest."
}
if ([string]::IsNullOrWhiteSpace($AssetsRoot)) {
  $AssetsRoot = Join-Path $repoRoot "packages/catalogue-authoring/assets"
}
$assetsDirectory = [IO.Path]::GetFullPath($AssetsRoot)
if (-not (Test-Path -LiteralPath $assetsDirectory -PathType Container)) {
  throw "Discovery thumbnail decode gate could not find asset root $assetsDirectory. Restore the tracked catalogue derivatives."
}

$manifest = Get-Content -Raw -LiteralPath $manifestFile | ConvertFrom-Json
$entries = @($manifest.entries)
if ($entries.Count -eq 0) {
  throw "Discovery thumbnail decode gate found no manifest entries. Regenerate the reviewed derivative tier."
}

Add-Type -AssemblyName System.Drawing
$expectedPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $entries) {
  $key = [string]$entry.key
  if ($key -notmatch '^(?<catalogue>[a-z0-9]+(?:-[a-z0-9]+)*)/(?<file>[a-z0-9]+(?:-[a-z0-9]+)*\.jpg)$') {
    throw "Discovery thumbnail decode gate rejected unqualified key '$key'. Use catalogue/file.jpg."
  }
  $thumbnailDirectory = [IO.Path]::GetFullPath((Join-Path $assetsDirectory "$($Matches.catalogue)/thumbnails"))
  $thumbnailFile = [IO.Path]::GetFullPath((Join-Path $thumbnailDirectory $Matches.file))
  if (-not $thumbnailFile.StartsWith("$assetsDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Discovery thumbnail decode gate refused path $thumbnailFile because it escapes $assetsDirectory."
  }
  if (-not (Test-Path -LiteralPath $thumbnailFile -PathType Leaf)) {
    throw "Discovery thumbnail manifest key $key has no tracked derivative at $thumbnailFile. Regenerate the asset and manifest together."
  }
  if (-not $expectedPaths.Add($thumbnailFile)) {
    throw "Discovery thumbnail manifest maps more than one entry to $thumbnailFile. Keep qualified keys unique."
  }

  $bytes = [IO.File]::ReadAllBytes($thumbnailFile)
  if ($bytes.Length -ne [int]$entry.bytes) {
    throw "Discovery thumbnail $key is $($bytes.Length) bytes, not the manifest-bound $($entry.bytes) bytes. Refresh the exact key binding."
  }
  $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
  try {
    $actualHash = [BitConverter]::ToString($hashAlgorithm.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $hashAlgorithm.Dispose()
  }
  if ($actualHash -ne [string]$entry.sha256) {
    throw "Discovery thumbnail $key hashes to $actualHash, not the manifest-bound $($entry.sha256). Refresh the exact key binding."
  }

  $stream = $null
  $source = $null
  $decoded = $null
  try {
    $stream = [IO.MemoryStream]::new($bytes, $false)
    $source = [Drawing.Image]::FromStream($stream, $false, $true)
    $decoded = [Drawing.Bitmap]::new($source)
    if (
      $decoded.Width -ne [int]$entry.width -or
      $decoded.Height -ne [int]$entry.height -or
      $decoded.Width -ne [int]$manifest.width -or
      $decoded.Height -ne [int]$manifest.height
    ) {
      throw "Discovery thumbnail $key fully decodes to $($decoded.Width) by $($decoded.Height), not the manifest-bound $($manifest.width) by $($manifest.height)."
    }
    $null = $decoded.GetPixel(0, 0)
    $null = $decoded.GetPixel($decoded.Width - 1, $decoded.Height - 1)
  }
  catch {
    throw "Discovery thumbnail $key could not fully decode as a bounded JPEG: $($_.Exception.Message)"
  }
  finally {
    if ($null -ne $decoded) { $decoded.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
    if ($null -ne $stream) { $stream.Dispose() }
  }
}

$trackedThumbnails = @(
  Get-ChildItem -LiteralPath $assetsDirectory -Recurse -File -Filter "*.jpg" |
    Where-Object { $_.Directory.Name -eq "thumbnails" }
)
if ($trackedThumbnails.Count -ne $entries.Count) {
  throw "Discovery thumbnail decode gate found $($trackedThumbnails.Count) tracked derivatives but $($entries.Count) manifest entries. Refresh the closed tier."
}
foreach ($thumbnail in $trackedThumbnails) {
  if (-not $expectedPaths.Contains($thumbnail.FullName)) {
    throw "Discovery thumbnail decode gate found unbound derivative $($thumbnail.FullName). Add its qualified manifest entry or remove the stray asset."
  }
}

Write-Output "Fully decoded and key-bound $($entries.Count) discovery thumbnails."
