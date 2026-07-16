Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot 'assets\tokens'
$outputRoot = Join-Path $projectRoot 'assets\ui\icons'

function Ensure-Directory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Save-Icon([string]$Side, [string]$Name, [double]$X, [double]$Y, [double]$Width, [double]$Height) {
    $source = Join-Path $sourceRoot "$Side\$Name.png"
    $sideOutput = Join-Path $outputRoot $Side
    Ensure-Directory $sideOutput
    $destination = Join-Path $sideOutput "$Name-cutout.png"
    if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite existing derived icon: $destination" }

    $sourceImage = [Drawing.Image]::FromFile($source)
    try {
        $sourceRect = [Drawing.Rectangle]::new(
            [int][Math]::Round($sourceImage.Width * $X),
            [int][Math]::Round($sourceImage.Height * $Y),
            [int][Math]::Round($sourceImage.Width * $Width),
            [int][Math]::Round($sourceImage.Height * $Height)
        )
        $target = New-Object Drawing.Bitmap 360, 240, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [Drawing.Graphics]::FromImage($target)
            try {
                $graphics.Clear([Drawing.Color]::Transparent)
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sourceImage, [Drawing.Rectangle]::new(0, 0, 360, 240), $sourceRect, [Drawing.GraphicsUnit]::Pixel)
            }
            finally { $graphics.Dispose() }

            # Remove only the near-white card stock. Colored silhouettes, black
            # outlines, and insignia that fall inside the crop remain untouched.
            for ($py = 0; $py -lt $target.Height; $py++) {
                for ($px = 0; $px -lt $target.Width; $px++) {
                    $pixel = $target.GetPixel($px, $py)
                    if ($pixel.A -gt 0 -and $pixel.R -gt 220 -and $pixel.G -gt 220 -and $pixel.B -gt 220) {
                        $target.SetPixel($px, $py, [Drawing.Color]::Transparent)
                    }
                }
            }

            # Keep only the largest connected non-transparent object. This is
            # the aircraft/ship/SAM silhouette; detached stat text and national
            # insignia are removed without redrawing or approximating the unit.
            $widthPx = $target.Width
            $heightPx = $target.Height
            $visited = New-Object 'bool[]' ($widthPx * $heightPx)
            $largest = New-Object 'System.Collections.Generic.List[int]'
            $neighbors = @(@(-1,0), @(1,0), @(0,-1), @(0,1), @(-1,-1), @(1,-1), @(-1,1), @(1,1))
            for ($scanY = 0; $scanY -lt $heightPx; $scanY++) {
                for ($scanX = 0; $scanX -lt $widthPx; $scanX++) {
                    $startIndex = ($scanY * $widthPx) + $scanX
                    if ($visited[$startIndex] -or $target.GetPixel($scanX, $scanY).A -eq 0) { continue }
                    $component = New-Object 'System.Collections.Generic.List[int]'
                    $queue = New-Object 'System.Collections.Generic.Queue[int]'
                    $queue.Enqueue($startIndex)
                    $visited[$startIndex] = $true
                    while ($queue.Count -gt 0) {
                        $index = $queue.Dequeue()
                        $component.Add($index)
                        $cx = $index % $widthPx
                        $cy = [int][Math]::Floor($index / $widthPx)
                        foreach ($delta in $neighbors) {
                            $nx = $cx + $delta[0]
                            $ny = $cy + $delta[1]
                            if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $widthPx -or $ny -ge $heightPx) { continue }
                            $neighborIndex = ($ny * $widthPx) + $nx
                            if (-not $visited[$neighborIndex] -and $target.GetPixel($nx, $ny).A -gt 0) {
                                $visited[$neighborIndex] = $true
                                $queue.Enqueue($neighborIndex)
                            }
                        }
                    }
                    if ($component.Count -gt $largest.Count) { $largest = $component }
                }
            }
            $keep = New-Object 'bool[]' ($widthPx * $heightPx)
            foreach ($index in $largest) { $keep[$index] = $true }
            for ($clearY = 0; $clearY -lt $heightPx; $clearY++) {
                for ($clearX = 0; $clearX -lt $widthPx; $clearX++) {
                    $clearIndex = ($clearY * $widthPx) + $clearX
                    if (-not $keep[$clearIndex]) { $target.SetPixel($clearX, $clearY, [Drawing.Color]::Transparent) }
                }
            }
            $target.Save($destination, [Drawing.Imaging.ImageFormat]::Png)
        }
        finally { $target.Dispose() }
    }
    finally { $sourceImage.Dispose() }
}

Ensure-Directory $outputRoot

foreach ($name in @('f15','f22','f35')) { Save-Icon 'us' $name 0.32 0.20 0.36 0.38 }
foreach ($name in @('j10','j15','j16','j20')) { Save-Icon 'prc' $name 0.32 0.20 0.36 0.38 }

foreach ($name in @('b52','aew','uas','ada')) { Save-Icon 'us' $name 0.20 0.20 0.60 0.36 }
foreach ($name in @('h6','aew','uas','ada')) { Save-Icon 'prc' $name 0.20 0.20 0.60 0.36 }

Save-Icon 'us' 'ddg' 0.27 0.25 0.46 0.27
Save-Icon 'prc' 'ddg' 0.27 0.25 0.46 0.27

Write-Output "Exact icons derived from supplied token cards under $outputRoot."
