param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputDirectory = [IO.Path]::GetFullPath(
  (Join-Path $repoRoot "packages/catalogue-authoring/assets/national-parks")
)
$manifestFile = [IO.Path]::GetFullPath($ManifestPath)

if (-not (Test-Path -LiteralPath $manifestFile -PathType Leaf)) {
  throw "National-park study preparation could not find manifest $manifestFile. Pass a JSON object whose keys are park slugs and whose values are generated PNG paths."
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Add-Type -AssemblyName System.Drawing

$manifest = Get-Content -Raw -LiteralPath $manifestFile | ConvertFrom-Json
$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1
if ($null -eq $jpegCodec) {
  throw "National-park study preparation could not find the Windows JPEG encoder. Install a System.Drawing-compatible JPEG codec and retry."
}

$results = [Collections.Generic.List[object]]::new()
foreach ($entry in $manifest.PSObject.Properties) {
  $slug = [string]$entry.Name
  if ($slug -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw "National-park study preparation rejected slug '$slug'. Use lowercase ASCII words separated by single hyphens."
  }

  $inputFile = [IO.Path]::GetFullPath([string]$entry.Value)
  if (-not (Test-Path -LiteralPath $inputFile -PathType Leaf)) {
    throw "National-park study preparation could not find generated source $inputFile for $slug. Regenerate it or correct the manifest path."
  }

  $outputFile = [IO.Path]::GetFullPath((Join-Path $outputDirectory "$slug.jpg"))
  if (-not $outputFile.StartsWith("$outputDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "National-park study preparation refused output path $outputFile because it escapes $outputDirectory."
  }

  $source = $null
  $bitmap = $null
  $graphics = $null
  try {
    $source = [Drawing.Image]::FromFile($inputFile)
    $bitmap = [Drawing.Bitmap]::new(896, 896, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $bitmap.SetResolution(96, 96)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([Drawing.Color]::Black)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($source, [Drawing.Rectangle]::new(0, 0, 896, 896))

    $encoded = $null
    $selectedQuality = $null
    foreach ($quality in 88, 84, 80, 76, 72, 68, 64, 60) {
      $stream = [IO.MemoryStream]::new()
      try {
        $qualityParameter = [Drawing.Imaging.EncoderParameter]::new(
          [Drawing.Imaging.Encoder]::Quality,
          [long]$quality
        )
        $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
        try {
          $parameters.Param[0] = $qualityParameter
          $bitmap.Save($stream, $jpegCodec, $parameters)
          if ($stream.Length -le 256KB) {
            $encoded = $stream.ToArray()
            $selectedQuality = $quality
            break
          }
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

    if ($null -eq $encoded) {
      throw "National-park study preparation could not reduce $slug below the 256 KiB Git ceiling at 896 by 896 pixels. Review the asset pipeline before committing it."
    }

    [IO.File]::WriteAllBytes($outputFile, $encoded)
    $sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputFile).Hash.ToLowerInvariant()
    $results.Add([ordered]@{
      slug = $slug
      fileName = "$slug.jpg"
      bytes = $encoded.Length
      jpegQuality = $selectedQuality
      sha256 = $sha256
    })
  }
  finally {
    if ($null -ne $graphics) { $graphics.Dispose() }
    if ($null -ne $bitmap) { $bitmap.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
  }
}

$results | ConvertTo-Json -Depth 3
