param(
  [string]$AssetsRoot,
  [string]$ProofOutputRoot,
  [string]$SingleImagePath,
  [string]$EvidencePath,
  [string]$CatalogueDirectories = "books-read,life-milestones",
  [ValidateRange(1, 10000)]
  [int]$ExpectedCount = 52,
  [ValidateRange(0.001, 1.0)]
  [double]$MaximumResidual = 0.045
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
if ([string]::IsNullOrWhiteSpace($AssetsRoot)) {
  $AssetsRoot = Join-Path $repoRoot "packages/catalogue-authoring/assets"
}
$AssetsRoot = [IO.Path]::GetFullPath($AssetsRoot)
if (-not [string]::IsNullOrWhiteSpace($ProofOutputRoot)) {
  $ProofOutputRoot = [IO.Path]::GetFullPath($ProofOutputRoot)
  New-Item -ItemType Directory -Path $ProofOutputRoot -Force | Out-Null
}

Add-Type -AssemblyName System.Drawing
function Get-Sha256 {
  param([string]$Path)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  $stream = [IO.File]::OpenRead($Path)
  try {
    return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $stream.Dispose()
    $algorithm.Dispose()
  }
}
Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class CatalogueMiniatureMetric
{
    public static double Measure(string sourcePath, int expectedWidth, int expectedHeight, int proofSize, string proofPath)
    {
        using (var bitmap = new Bitmap(sourcePath))
        {
            if (bitmap.Width != expectedWidth || bitmap.Height != expectedHeight)
            {
                throw new InvalidDataException(
                    "decoded at " + bitmap.Width + " by " + bitmap.Height +
                    "; expected " + expectedWidth + " by " + expectedHeight
                );
            }
            byte[] source = ReadRgb(bitmap);
            byte[] proof = ResizeRgbBilinear(source, bitmap.Width, bitmap.Height, proofSize, proofSize);
            byte[] reconstructed = ResizeRgbBilinear(
                proof,
                proofSize,
                proofSize,
                bitmap.Width,
                bitmap.Height
            );
            long absoluteRgbError = 0;
            for (int index = 0; index < source.Length; index++)
            {
                absoluteRgbError += Math.Abs((int)source[index] - reconstructed[index]);
            }
            if (!String.IsNullOrEmpty(proofPath))
            {
                string directory = Path.GetDirectoryName(proofPath);
                if (!String.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                SaveRgbPng(proof, proofSize, proofSize, proofPath);
            }
            return absoluteRgbError / (bitmap.Width * (double)bitmap.Height * 3.0 * 255.0);
        }
    }

    private static byte[] ReadRgb(Bitmap bitmap)
    {
        var rectangle = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(
            rectangle,
            ImageLockMode.ReadOnly,
            PixelFormat.Format24bppRgb
        );
        try
        {
            int stride = Math.Abs(data.Stride);
            byte[] encoded = new byte[stride * bitmap.Height];
            Marshal.Copy(data.Scan0, encoded, 0, encoded.Length);
            byte[] rgb = new byte[bitmap.Width * bitmap.Height * 3];
            for (int y = 0; y < bitmap.Height; y++)
            {
                int encodedY = data.Stride < 0 ? bitmap.Height - 1 - y : y;
                int sourceRow = encodedY * stride;
                int targetRow = y * bitmap.Width * 3;
                for (int x = 0; x < bitmap.Width; x++)
                {
                    int source = sourceRow + x * 3;
                    int target = targetRow + x * 3;
                    rgb[target] = encoded[source + 2];
                    rgb[target + 1] = encoded[source + 1];
                    rgb[target + 2] = encoded[source];
                }
            }
            return rgb;
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
    }

    private static byte[] ResizeRgbBilinear(
        byte[] source,
        int sourceWidth,
        int sourceHeight,
        int targetWidth,
        int targetHeight
    )
    {
        byte[] output = new byte[targetWidth * targetHeight * 3];
        double xScale = sourceWidth / (double)targetWidth;
        double yScale = sourceHeight / (double)targetHeight;
        for (int y = 0; y < targetHeight; y++)
        {
            double sourceY = Clamp((y + 0.5) * yScale - 0.5, 0, sourceHeight - 1);
            int y0 = (int)Math.Floor(sourceY);
            int y1 = Math.Min(sourceHeight - 1, y0 + 1);
            double yWeight = sourceY - y0;
            for (int x = 0; x < targetWidth; x++)
            {
                double sourceX = Clamp((x + 0.5) * xScale - 0.5, 0, sourceWidth - 1);
                int x0 = (int)Math.Floor(sourceX);
                int x1 = Math.Min(sourceWidth - 1, x0 + 1);
                double xWeight = sourceX - x0;
                int target = (y * targetWidth + x) * 3;
                for (int channel = 0; channel < 3; channel++)
                {
                    double top =
                        source[(y0 * sourceWidth + x0) * 3 + channel] * (1 - xWeight) +
                        source[(y0 * sourceWidth + x1) * 3 + channel] * xWeight;
                    double bottom =
                        source[(y1 * sourceWidth + x0) * 3 + channel] * (1 - xWeight) +
                        source[(y1 * sourceWidth + x1) * 3 + channel] * xWeight;
                    output[target + channel] = (byte)Math.Floor(
                        top * (1 - yWeight) + bottom * yWeight + 0.5
                    );
                }
            }
        }
        return output;
    }

    private static void SaveRgbPng(byte[] rgb, int width, int height, string outputPath)
    {
        using (var bitmap = new Bitmap(width, height, PixelFormat.Format24bppRgb))
        {
            var rectangle = new Rectangle(0, 0, width, height);
            BitmapData data = bitmap.LockBits(
                rectangle,
                ImageLockMode.WriteOnly,
                PixelFormat.Format24bppRgb
            );
            try
            {
                int stride = Math.Abs(data.Stride);
                byte[] encoded = new byte[stride * height];
                for (int y = 0; y < height; y++)
                {
                    int encodedY = data.Stride < 0 ? height - 1 - y : y;
                    int targetRow = encodedY * stride;
                    int sourceRow = y * width * 3;
                    for (int x = 0; x < width; x++)
                    {
                        int source = sourceRow + x * 3;
                        int target = targetRow + x * 3;
                        encoded[target] = rgb[source + 2];
                        encoded[target + 1] = rgb[source + 1];
                        encoded[target + 2] = rgb[source];
                    }
                }
                Marshal.Copy(encoded, 0, data.Scan0, encoded.Length);
            }
            finally
            {
                bitmap.UnlockBits(data);
            }
            bitmap.Save(outputPath, ImageFormat.Png);
        }
    }

    private static double Clamp(double value, double minimum, double maximum)
    {
        return Math.Max(minimum, Math.Min(maximum, value));
    }
}
'@

if (-not [string]::IsNullOrWhiteSpace($SingleImagePath)) {
  $singleFile = [IO.Path]::GetFullPath($SingleImagePath)
  if (-not (Test-Path -LiteralPath $singleFile -PathType Leaf)) {
    throw "Catalogue miniature measurement could not find single instrument-check image $singleFile."
  }
  $singleProofPath = $null
  if (-not [string]::IsNullOrWhiteSpace($ProofOutputRoot)) {
    $singleProofPath = Join-Path $ProofOutputRoot "$([IO.Path]::GetFileNameWithoutExtension($singleFile))-48.png"
  }
  $singleResidual = [CatalogueMiniatureMetric]::Measure(
    $singleFile,
    896,
    896,
    48,
    $singleProofPath
  )
  [ordered]@{
    key = [IO.Path]::GetFileNameWithoutExtension($singleFile)
    width = 896
    height = 896
    bytes = (Get-Item -LiteralPath $singleFile).Length
    sha256 = Get-Sha256 $singleFile
    proofSize = 48
    proofResize = "bilinear-center-sample-round"
    miniatureResidual = $singleResidual
    passes = $singleResidual -le $MaximumResidual
  } | ConvertTo-Json -Depth 5
  return
}

$knownCatalogueDirectories = @("books-read", "life-milestones", "michelin-dining")
$selectedCatalogueDirectories = @(
  $CatalogueDirectories.Split(',') |
    ForEach-Object { $_.Trim() } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)
if ($selectedCatalogueDirectories.Count -eq 0) {
  throw "Catalogue miniature measurement requires at least one comma-separated catalogue directory."
}
foreach ($directory in $selectedCatalogueDirectories) {
  if ($directory -notin $knownCatalogueDirectories) {
    throw "Catalogue miniature measurement does not know directory '$directory'. Use one of: $($knownCatalogueDirectories -join ', ')."
  }
}
if (($selectedCatalogueDirectories | Select-Object -Unique).Count -ne $selectedCatalogueDirectories.Count) {
  throw "Catalogue miniature measurement received a repeated catalogue directory; list each directory once."
}
$files = [Collections.Generic.List[object]]::new()
foreach ($directory in $selectedCatalogueDirectories) {
  $directoryPath = [IO.Path]::GetFullPath((Join-Path $AssetsRoot $directory))
  if (-not $directoryPath.StartsWith("$AssetsRoot$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Catalogue miniature measurement refused source path $directoryPath because it escapes $AssetsRoot."
  }
  foreach ($file in Get-ChildItem -LiteralPath $directoryPath -Filter "*.jpg" -File | Sort-Object Name) {
    $files.Add([ordered]@{ directory = $directory; file = $file })
  }
}
if ($files.Count -ne $ExpectedCount) {
  throw "Catalogue miniature measurement found $($files.Count) selected JPG sources across $($selectedCatalogueDirectories -join ', '); expected exactly $ExpectedCount."
}

$results = [Collections.Generic.List[object]]::new()
$failures = [Collections.Generic.List[string]]::new()
foreach ($entry in $files) {
  $file = $entry.file
  $key = "$($entry.directory)/$($file.BaseName)"
  if ($file.Length -gt 256KB) {
    $failures.Add("$key is $($file.Length) bytes; selected source JPGs must remain at or below 256 KiB.")
    continue
  }
  $proofPath = $null
  if (-not [string]::IsNullOrWhiteSpace($ProofOutputRoot)) {
    $proofPath = Join-Path $ProofOutputRoot "$($entry.directory)/$($file.BaseName)-48.png"
  }
  try {
    $residual = [CatalogueMiniatureMetric]::Measure(
      $file.FullName,
      896,
      896,
      48,
      $proofPath
    )
  }
  catch {
    $failures.Add("$key could not be fully decoded and measured: $($_.Exception.Message)")
    continue
  }
  if ($residual -gt $MaximumResidual) {
    $failures.Add("$key reconstructed through its exact 48-pixel proof at residual $residual; maximum is $MaximumResidual.")
  }
  $results.Add([ordered]@{
    key = $key
    width = 896
    height = 896
    bytes = $file.Length
    sha256 = Get-Sha256 $file.FullName
    proofSize = 48
    proofResize = "bilinear-center-sample-round"
    miniatureResidual = $residual
    passes = $residual -le $MaximumResidual
  })
}

if ($failures.Count -gt 0) {
  throw "Catalogue miniature measurement rejected $($failures.Count) source(s):`n- $($failures -join "`n- ")"
}
$json = $results | ConvertTo-Json -Depth 5
if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) {
  $evidenceFile = [IO.Path]::GetFullPath($EvidencePath)
  New-Item -ItemType Directory -Path (Split-Path -Parent $evidenceFile) -Force | Out-Null
  [IO.File]::WriteAllText($evidenceFile, $json, [Text.UTF8Encoding]::new($false))
}
$json
