Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$root = Join-Path $projectRoot 'assets\ui\backgrounds'
$raw = Join-Path $root '_deck-media'

function Save-Crop([string]$SourceName, [string]$DestinationName, [double]$X, [double]$Y, [double]$Width, [double]$Height) {
    $source = Join-Path $raw $SourceName
    $destination = Join-Path $root $DestinationName
    if (Test-Path -LiteralPath $destination) {
        Write-Output "Skipping existing derived image: $DestinationName"
        return
    }
    $sourceImage = [Drawing.Image]::FromFile($source)
    try {
        $sourceRect = [Drawing.Rectangle]::new(
            [int][Math]::Round($sourceImage.Width * $X),
            [int][Math]::Round($sourceImage.Height * $Y),
            [int][Math]::Round($sourceImage.Width * $Width),
            [int][Math]::Round($sourceImage.Height * $Height)
        )
        $target = New-Object Drawing.Bitmap 1600, 700
        try {
            $graphics = [Drawing.Graphics]::FromImage($target)
            try {
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sourceImage, [Drawing.Rectangle]::new(0, 0, 1600, 700), $sourceRect, [Drawing.GraphicsUnit]::Pixel)
            }
            finally { $graphics.Dispose() }
            $target.Save($destination, [Drawing.Imaging.ImageFormat]::Jpeg)
        }
        finally { $target.Dispose() }
    }
    finally { $sourceImage.Dispose() }
}

# Card layout: title occupies the first fifth; the supplied photograph is the
# following third. These crops exclude the descriptive stat blocks.
Save-Crop 'b52-card.png'     'us-standoff-photo.jpg'     0.07 0.20 0.86 0.25
Save-Crop 'h6-card.png'      'prc-standoff-photo.jpg'    0.07 0.20 0.86 0.25
Save-Crop 'us-aew-card.png'  'us-contingency-photo.jpg' 0.07 0.20 0.86 0.25
Save-Crop 'airbase-card.png' 'airbase-runway-photo.jpg' 0.04 0.00 0.92 0.10
Save-Crop 'f35-card.png'     'landing-f35-executive-v3.jpg' 0.12 0.24 0.68 0.13

Write-Output 'Clean photographic crops created without overwriting any existing image.'
