param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,
  [string]$AssetsRoot
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifestFile = [IO.Path]::GetFullPath($ManifestPath)
if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf)) {
  throw "Discovery source decode gate could not find manifest $manifestFile. Regenerate the qualified source manifest."
}
if ([string]::IsNullOrWhiteSpace($AssetsRoot)) {
  $AssetsRoot = Join-Path $repoRoot "packages/catalogue-authoring/assets"
}
$assetsDirectory = [IO.Path]::GetFullPath($AssetsRoot)
if (-not (Test-Path -LiteralPath $assetsDirectory -PathType Container)) {
  throw "Discovery source decode gate could not find asset root $assetsDirectory. Restore the tracked catalogue studies."
}

# Yosemite's canonical study remains an authoring input outside the shipped tier because the
# published starter badge already owns that concept.
$excludedKeys = @("national-parks/yosemite.jpg")

$manifest = Get-Content -Raw -LiteralPath $manifestFile | ConvertFrom-Json
$entries = @($manifest.entries)
if ($entries.Count -eq 0) {
  throw "Discovery source decode gate found no entries. Regenerate the reviewed source tier."
}

Add-Type -AssemblyName System.Drawing
$expectedPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $entries) {
  $key = [string]$entry.key
  if ($key -notmatch '^(?<catalogue>[a-z0-9]+(?:-[a-z0-9]+)*)/(?<file>[a-z0-9]+(?:-[a-z0-9]+)*\.jpg)$') {
    throw "Discovery source decode gate rejected key '$key'. Use catalogue/file.jpg."
  }
  if ($excludedKeys -contains $key) {
    throw "Discovery source decode gate rejected excluded key '$key'. The deduplicated starter concept never enters the shipped tier."
  }
  $catalogueDirectory = [IO.Path]::GetFullPath((Join-Path $assetsDirectory $Matches.catalogue))
  $sourceFile = [IO.Path]::GetFullPath((Join-Path $catalogueDirectory $Matches.file))
  if (-not $sourceFile.StartsWith("$assetsDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Discovery source decode gate refused path $sourceFile because it escapes $assetsDirectory."
  }
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Discovery source manifest key $key has no tracked study at $sourceFile. Regenerate the asset and manifest together."
  }
  if (-not $expectedPaths.Add($sourceFile)) {
    throw "Discovery source manifest maps more than one entry to $sourceFile. Keep qualified keys unique."
  }

  $bytes = [IO.File]::ReadAllBytes($sourceFile)
  if ($bytes.Length -ne [int]$entry.bytes) {
    throw "Discovery source $key is $($bytes.Length) bytes, not the manifest-bound $($entry.bytes) bytes. Refresh the exact key binding."
  }
  $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
  try {
    $actualHash = [BitConverter]::ToString($hashAlgorithm.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $hashAlgorithm.Dispose()
  }
  if ($actualHash -ne [string]$entry.sha256) {
    throw "Discovery source $key hashes to $actualHash, not the manifest-bound $($entry.sha256). Refresh the exact key binding."
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
      throw "Discovery source $key fully decodes to $($decoded.Width) by $($decoded.Height), not the manifest-bound $($manifest.width) by $($manifest.height)."
    }
    $null = $decoded.GetPixel(0, 0)
    $null = $decoded.GetPixel($decoded.Width - 1, $decoded.Height - 1)
  }
  catch {
    throw "Discovery source $key could not fully decode as a bounded JPEG: $($_.Exception.Message)"
  }
  finally {
    if ($null -ne $decoded) { $decoded.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
    if ($null -ne $stream) { $stream.Dispose() }
  }
}

$trackedSources = @(
  Get-ChildItem -LiteralPath $assetsDirectory -Recurse -File -Filter "*.jpg" |
    Where-Object { $_.Directory.Name -ne "details" -and $_.Directory.Name -ne "thumbnails" }
)
$expectedTrackedCount = $entries.Count + $excludedKeys.Count
if ($trackedSources.Count -ne $expectedTrackedCount) {
  throw "Discovery source decode gate found $($trackedSources.Count) tracked studies but expected $expectedTrackedCount (manifest entries plus the deduplicated Yosemite input). Refresh the closed tier."
}
foreach ($tracked in $trackedSources) {
  $relativeKey = "$($tracked.Directory.Name)/$($tracked.Name)"
  if (-not $expectedPaths.Contains($tracked.FullName) -and -not ($excludedKeys -contains $relativeKey)) {
    throw "Discovery source decode gate found unbound study $($tracked.FullName). Add its qualified manifest entry or remove the stray asset."
  }
}

Write-Output "Fully decoded and key-bound $($entries.Count) discovery canonical sources."
