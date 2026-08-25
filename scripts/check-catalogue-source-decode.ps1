param(
  [Parameter(Mandatory = $true)]
  [string]$ImageDirectory,
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 1000)]
  [int]$ExpectedCount,
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 16384)]
  [int]$ExpectedWidth,
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 16384)]
  [int]$ExpectedHeight,
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 1073741824)]
  [long]$MaximumBytes,
  [string]$Kind = "catalogue source study"
)

$ErrorActionPreference = "Stop"
$directory = [IO.Path]::GetFullPath($ImageDirectory)
if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
  throw "Catalogue source decode gate could not find $Kind directory $directory. Restore the reviewed image tier."
}

$images = @(Get-ChildItem -LiteralPath $directory -File -Filter "*.jpg" | Sort-Object Name)
if ($images.Count -ne $ExpectedCount) {
  throw "Catalogue source decode gate found $($images.Count) $Kind JPEGs in $directory; expected exactly $ExpectedCount."
}

Add-Type -AssemblyName System.Drawing
foreach ($image in $images) {
  $bytes = [IO.File]::ReadAllBytes($image.FullName)
  if ($bytes.Length -gt $MaximumBytes) {
    throw "Catalogue source decode gate rejected $Kind $($image.FullName) at $($bytes.Length) bytes; keep it at or below $MaximumBytes bytes."
  }

  $stream = $null
  $source = $null
  $decoded = $null
  try {
    $stream = [IO.MemoryStream]::new($bytes, $false)
    $source = [Drawing.Image]::FromStream($stream, $false, $true)
    $decoded = [Drawing.Bitmap]::new($source)
    if ($decoded.Width -ne $ExpectedWidth -or $decoded.Height -ne $ExpectedHeight) {
      throw "$Kind $($image.Name) fully decodes to $($decoded.Width) by $($decoded.Height), not $ExpectedWidth by $ExpectedHeight."
    }
    $null = $decoded.GetPixel(0, 0)
    $null = $decoded.GetPixel($decoded.Width - 1, $decoded.Height - 1)
  }
  catch {
    throw "Catalogue source decode gate could not fully decode $Kind $($image.FullName): $($_.Exception.Message)"
  }
  finally {
    if ($null -ne $decoded) { $decoded.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
    if ($null -ne $stream) { $stream.Dispose() }
  }
}

Write-Output "Fully decoded $($images.Count) $Kind JPEGs at $ExpectedWidth by $ExpectedHeight."
