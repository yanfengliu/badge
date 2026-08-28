param(
  [string]$InputRoot,
  [string]$EvidencePath,
  [string]$AllowedDirectory,
  [ValidateRange(1, 1000)]
  [int]$ExpectedCount = 45
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($InputRoot)) {
  $InputRoot = Join-Path $repoRoot "output/code-native-catalogue-art"
}
$InputRoot = [IO.Path]::GetFullPath($InputRoot)
if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
  $EvidencePath = Join-Path $InputRoot "final-jpeg-normalization.json"
}
$EvidencePath = [IO.Path]::GetFullPath($EvidencePath)
$metricsPath = Join-Path $InputRoot "png-metrics.json"
$assetsRoot = [IO.Path]::GetFullPath(
  (Join-Path $repoRoot "packages/catalogue-authoring/assets")
)
$inputSourcesRoot = [IO.Path]::GetFullPath((Join-Path $InputRoot "sources"))
$knownDirectories = @("books-read", "life-milestones", "michelin-dining", "national-parks", "us-states", "video-games")
if (-not [string]::IsNullOrWhiteSpace($AllowedDirectory) -and $AllowedDirectory -notin $knownDirectories) {
  throw "Code-native normalization does not know catalogue directory '$AllowedDirectory'. Use one of: $($knownDirectories -join ', ')."
}

if (-not (Test-Path -LiteralPath $metricsPath -PathType Leaf)) {
  throw "Code-native normalization could not find renderer metrics at $metricsPath. Render the deterministic PNG intermediates first."
}
$decodedRecords = Get-Content -Raw -LiteralPath $metricsPath | ConvertFrom-Json
$records = [Collections.Generic.List[object]]::new()
foreach ($record in $decodedRecords) { $records.Add($record) }
if ($records.Count -ne $ExpectedCount) {
  throw "Code-native normalization found $($records.Count) renderer records; expected exactly $ExpectedCount before changing selected catalogue JPGs."
}

Add-Type -AssemblyName System.Drawing
$jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1
if ($null -eq $jpegCodec) {
  throw "Code-native normalization could not find the Windows JPEG encoder. Install a System.Drawing-compatible JPEG codec and retry."
}

function New-RgbBitmap {
  param([int]$Width, [int]$Height)
  $bitmap = [Drawing.Bitmap]::new(
    $Width,
    $Height,
    [Drawing.Imaging.PixelFormat]::Format24bppRgb
  )
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function Draw-ExactCanvas {
  param(
    [Drawing.Image]$Source,
    [Drawing.Bitmap]$Target,
    [int]$Width,
    [int]$Height
  )
  $graphics = [Drawing.Graphics]::FromImage($Target)
  try {
    $graphics.Clear([Drawing.Color]::Black)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($Source, [Drawing.Rectangle]::new(0, 0, $Width, $Height))
  }
  finally {
    $graphics.Dispose()
  }
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

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$results = [Collections.Generic.List[object]]::new()
foreach ($record in $records) {
  $directory = [string]$record.catalogueDirectory
  $slug = [string]$record.slug
  if ($directory -notin $knownDirectories) {
    throw "Code-native normalization rejected directory '$directory' for $slug. Use a registered code-native catalogue directory."
  }
  if (-not [string]::IsNullOrWhiteSpace($AllowedDirectory) -and $directory -ne $AllowedDirectory) {
    throw "Code-native normalization rejected directory '$directory' for $slug because this pass is restricted to '$AllowedDirectory'."
  }
  if ($slug -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw "Code-native normalization rejected slug '$slug'. Use lowercase ASCII words separated by single hyphens."
  }
  $key = "$directory/$slug"
  if (-not $seen.Add($key)) {
    throw "Code-native normalization found duplicate renderer record $key. Render one immutable recipe per selected source."
  }
  if ([string]$record.sourcePngColorType -ne "RGB" -or
      [int]$record.sourceSize[0] -ne 896 -or
      [int]$record.sourceSize[1] -ne 896) {
    throw "Code-native normalization rejected $key because its renderer intermediate is not an 896 by 896 RGB PNG."
  }
  if (-not [bool]$record.quantitativePass -or [double]$record.miniatureResidual -gt 0.035) {
    throw "Code-native normalization rejected raw renderer output $key at miniature residual $($record.miniatureResidual); simplify the recipe to 0.035 or below before JPEG processing."
  }

  $inputFile = [IO.Path]::GetFullPath(
    (Join-Path $inputSourcesRoot "$directory/$slug.png")
  )
  if (-not $inputFile.StartsWith("$inputSourcesRoot$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Code-native normalization refused input path $inputFile because it escapes $inputSourcesRoot."
  }
  if (-not (Test-Path -LiteralPath $inputFile -PathType Leaf)) {
    throw "Code-native normalization could not find renderer intermediate $inputFile for $key."
  }
  if ((Get-Sha256 $inputFile) -ne [string]$record.sourceSha256) {
    throw "Code-native normalization rejected $key because its PNG bytes no longer match png-metrics.json. Rerender before promotion."
  }

  $outputDirectory = [IO.Path]::GetFullPath((Join-Path $assetsRoot $directory))
  $thumbnailDirectory = [IO.Path]::GetFullPath((Join-Path $outputDirectory "thumbnails"))
  $outputFile = [IO.Path]::GetFullPath((Join-Path $outputDirectory "$slug.jpg"))
  $thumbnailFile = [IO.Path]::GetFullPath((Join-Path $thumbnailDirectory "$slug.jpg"))
  foreach ($target in $outputFile, $thumbnailFile) {
    if (-not $target.StartsWith("$outputDirectory$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
      throw "Code-native normalization refused output path $target because it escapes $outputDirectory."
    }
  }
  New-Item -ItemType Directory -Path $thumbnailDirectory -Force | Out-Null

  $source = $null
  $bitmap = $null
  try {
    $source = [Drawing.Image]::FromFile($inputFile)
    if ($source.Width -ne 896 -or $source.Height -ne 896) {
      throw "Code-native normalization decoded $inputFile at $($source.Width) by $($source.Height); rerender it at exactly 896 by 896."
    }
    $bitmap = New-RgbBitmap 896 896
    Draw-ExactCanvas $source $bitmap 896 896
    $encoded = $null
    $selectedQuality = $null
    foreach ($quality in 88, 84, 80, 76, 72, 68, 64, 60) {
      $candidate = ConvertTo-JpegBytes $bitmap $quality
      if ($candidate.Length -le 256KB) {
        $encoded = $candidate
        $selectedQuality = $quality
        break
      }
    }
    if ($null -eq $encoded) {
      throw "Code-native normalization could not reduce $key below the 256 KiB source ceiling. Revise catalogue-study-jpeg@1 before promotion."
    }
    [IO.File]::WriteAllBytes($outputFile, $encoded)
  }
  finally {
    if ($null -ne $bitmap) { $bitmap.Dispose() }
    if ($null -ne $source) { $source.Dispose() }
  }

  $normalizedSource = $null
  $thumbnail = $null
  try {
    $normalizedSource = [Drawing.Image]::FromFile($outputFile)
    if ($normalizedSource.Width -ne 896 -or $normalizedSource.Height -ne 896) {
      throw "Code-native normalization wrote $outputFile at $($normalizedSource.Width) by $($normalizedSource.Height); catalogue-study-jpeg@1 requires 896 by 896."
    }
    $thumbnail = New-RgbBitmap 128 128
    Draw-ExactCanvas $normalizedSource $thumbnail 128 128
    $thumbnailBytes = ConvertTo-JpegBytes $thumbnail 80
    if ($thumbnailBytes.Length -gt 16KB) {
      throw "Code-native normalization produced $thumbnailFile at $($thumbnailBytes.Length) bytes; revise catalogue-list-thumbnail@1 before promotion."
    }
    [IO.File]::WriteAllBytes($thumbnailFile, $thumbnailBytes)
  }
  finally {
    if ($null -ne $thumbnail) { $thumbnail.Dispose() }
    if ($null -ne $normalizedSource) { $normalizedSource.Dispose() }
  }

  $results.Add([ordered]@{
    key = $key
    renderer = $record.renderer
    recipeSha256 = [string]$record.recipeSha256
    inputPngSha256 = [string]$record.sourceSha256
    normalization = [ordered]@{
      id = "catalogue-study-jpeg"
      revision = 1
      jpegQuality = $selectedQuality
      sourcePath = $outputFile.Substring($repoRoot.Length + 1).Replace('\', '/')
      sourceBytes = (Get-Item -LiteralPath $outputFile).Length
      sourceSha256 = Get-Sha256 $outputFile
    }
    thumbnail = [ordered]@{
      id = "catalogue-list-thumbnail"
      revision = 1
      jpegQuality = 80
      path = $thumbnailFile.Substring($repoRoot.Length + 1).Replace('\', '/')
      bytes = (Get-Item -LiteralPath $thumbnailFile).Length
      sha256 = Get-Sha256 $thumbnailFile
    }
  })
}

$evidenceDirectory = Split-Path -Parent $EvidencePath
New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
$json = $results | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($EvidencePath, $json, [Text.UTF8Encoding]::new($false))
$json
