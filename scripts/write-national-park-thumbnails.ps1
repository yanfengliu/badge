param(
  [string]$SourceDirectory,
  [string]$OutputDirectory,
  [ValidateRange(1, 10000)]
  [int]$ExpectedCount = 63
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($SourceDirectory)) {
  $SourceDirectory = Join-Path $repoRoot "packages/catalogue-authoring/assets/national-parks"
}
$SourceDirectory = [IO.Path]::GetFullPath($SourceDirectory)
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $SourceDirectory "thumbnails"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Add-Type -AssemblyName System.Drawing

$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1
if ($null -eq $jpegCodec) {
  throw "National-park thumbnail generation could not find the Windows JPEG encoder. Install a System.Drawing-compatible JPEG codec and retry."
}

$sourceFiles = @(Get-ChildItem -LiteralPath $SourceDirectory -Filter "*.jpg" -File | Sort-Object Name)
if ($sourceFiles.Count -ne $ExpectedCount) {
  throw "National-park thumbnail generation found $($sourceFiles.Count) source studies in $SourceDirectory; expected exactly $ExpectedCount before deriving list art."
}

$results = [Collections.Generic.List[object]]::new()
foreach ($sourceFile in $sourceFiles) {
  $outputFile = [IO.Path]::GetFullPath((Join-Path $OutputDirectory $sourceFile.Name))
  if (-not $outputFile.StartsWith("$OutputDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "National-park thumbnail generation refused output path $outputFile because it escapes $OutputDirectory."
  }

  $source = $null
  $bitmap = $null
  $graphics = $null
  try {
    $source = [Drawing.Image]::FromFile($sourceFile.FullName)
    if ($source.Width -ne 896 -or $source.Height -ne 896) {
      throw "National-park thumbnail generation rejected $($sourceFile.FullName) at $($source.Width) by $($source.Height); normalize the selected study to 896 by 896 first."
    }
    $bitmap = [Drawing.Bitmap]::new(128, 128, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $bitmap.SetResolution(96, 96)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([Drawing.Color]::Black)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($source, [Drawing.Rectangle]::new(0, 0, 128, 128))

    $stream = [IO.MemoryStream]::new()
    try {
      $qualityParameter = [Drawing.Imaging.EncoderParameter]::new(
        [Drawing.Imaging.Encoder]::Quality,
        [long]80
      )
      $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
      try {
        $parameters.Param[0] = $qualityParameter
        $bitmap.Save($stream, $jpegCodec, $parameters)
      }
      finally {
        $parameters.Dispose()
        $qualityParameter.Dispose()
      }
      if ($stream.Length -gt 16KB) {
        throw "National-park thumbnail generation produced $($sourceFile.Name) at $($stream.Length) bytes; revise recipe national-park-list-thumbnail@1 before committing it."
      }
      [IO.File]::WriteAllBytes($outputFile, $stream.ToArray())
      $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
      try {
        $hashBytes = $hashAlgorithm.ComputeHash([IO.File]::ReadAllBytes($outputFile))
        $sha256 = [BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
      }
      finally {
        $hashAlgorithm.Dispose()
      }
      $results.Add([ordered]@{
        fileName = $sourceFile.Name
        bytes = $stream.Length
        sha256 = $sha256
      })
    }
    finally {
      $stream.Dispose()
    }
  }
  finally {
    if ($null -ne $graphics) { $graphics.Dispose() }
    if ($null -ne $bitmap) { $bitmap.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
  }
}

$results | ConvertTo-Json -Depth 3
