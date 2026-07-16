Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$deckPath = Join-Path $projectRoot 'docs\AFWI_OVERVIEW.pptx'
$outputRoot = Join-Path $projectRoot 'assets\ui\backgrounds'

function Ensure-Directory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Copy-DeckMedia([string]$EntryName, [string]$Destination) {
    if (Test-Path -LiteralPath $Destination) {
        throw "Refusing to overwrite existing derived image: $Destination"
    }
    $archive = [IO.Compression.ZipFile]::OpenRead($deckPath)
    try {
        $entry = $archive.GetEntry($EntryName)
        if ($null -eq $entry) { throw "Deck media not found: $EntryName" }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $Destination, $false)
    }
    finally {
        $archive.Dispose()
    }
}

function Save-Crop([string]$Source, [string]$Destination, [double]$X, [double]$Y, [double]$Width, [double]$Height) {
    if (Test-Path -LiteralPath $Destination) {
        throw "Refusing to overwrite existing derived image: $Destination"
    }
    $sourceImage = [Drawing.Image]::FromFile($Source)
    try {
        $sx = [int][Math]::Round($sourceImage.Width * $X)
        $sy = [int][Math]::Round($sourceImage.Height * $Y)
        $sw = [int][Math]::Round($sourceImage.Width * $Width)
        $sh = [int][Math]::Round($sourceImage.Height * $Height)
        $target = New-Object Drawing.Bitmap 1200, 600
        try {
            $graphics = [Drawing.Graphics]::FromImage($target)
            try {
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($sourceImage, [Drawing.Rectangle]::new(0, 0, 1200, 600), [Drawing.Rectangle]::new($sx, $sy, $sw, $sh), [Drawing.GraphicsUnit]::Pixel)
            }
            finally { $graphics.Dispose() }
            $target.Save($Destination, [Drawing.Imaging.ImageFormat]::Jpeg)
        }
        finally { $target.Dispose() }
    }
    finally { $sourceImage.Dispose() }
}

Ensure-Directory $outputRoot
$rawRoot = Join-Path $outputRoot '_deck-media'
Ensure-Directory $rawRoot

$media = @{
    'airbase-card.png' = 'ppt/media/image13.png'
    'f35-card.png'     = 'ppt/media/image15.png'
    'h6-card.png'      = 'ppt/media/image11.png'
    'b52-card.png'     = 'ppt/media/image30.png'
    'us-aew-card.png'  = 'ppt/media/image31.png'
    'prc-aew-card.png' = 'ppt/media/image42.png'
}

foreach ($name in $media.Keys) {
    Copy-DeckMedia $media[$name] (Join-Path $rawRoot $name)
}

Write-Output "Supplied deck imagery extracted under $rawRoot without modifying source documents or image files."
