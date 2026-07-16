$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $root 'AFWI.html'
$dataPath = Join-Path $root 'data\authoritative_content.json'
$manifestPath = Join-Path $root 'SHA256_MANIFEST.json'
$html = Get-Content -LiteralPath $htmlPath -Raw

$scriptMatch = [regex]::Match($html, '(?s)<script>(.*)</script>')
if (-not $scriptMatch.Success) { throw 'Embedded JavaScript was not found.' }
$syntaxPath = Join-Path ([IO.Path]::GetTempPath()) 'afwi-phase1-syntax.js'
[IO.File]::WriteAllText($syntaxPath, $scriptMatch.Groups[1].Value, [Text.UTF8Encoding]::new($false))
& node --check $syntaxPath
if ($LASTEXITCODE -ne 0) { throw 'Embedded JavaScript syntax validation failed.' }

$content = Get-Content -LiteralPath $dataPath -Raw | ConvertFrom-Json
if ($content.cards.Count -ne 88) { throw "Expected 88 authoritative cards; found $($content.cards.Count)." }
$duplicateIds = $content.cards | Group-Object ID | Where-Object Count -gt 1
if ($duplicateIds) { throw "Duplicate authoritative card IDs: $($duplicateIds.Name -join ', ')." }

$remoteUrls = [regex]::Matches($html, 'https?://[^\s''"<]+')
if ($remoteUrls.Count -ne 0) { throw 'Remote runtime dependency detected in AFWI.html.' }

$assetRefs = [regex]::Matches($html, 'assets/[A-Za-z0-9_./-]+') | ForEach-Object Value | Sort-Object -Unique
$missingAssets = @()
foreach ($assetRef in $assetRefs) {
    $assetPath = Join-Path $root ($assetRef -replace '/', '\')
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) { $missingAssets += $assetRef }
}
if ($missingAssets.Count) { throw "Missing assets: $($missingAssets -join ', ')." }

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$hashFailures = @()
foreach ($entry in $manifest.PSObject.Properties) {
    $filePath = Join-Path $root ($entry.Name -replace '/', '\')
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) { $hashFailures += "$($entry.Name) missing"; continue }
    $actual = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $entry.Value) { $hashFailures += "$($entry.Name) hash mismatch" }
}
if ($hashFailures.Count) { throw "Manifest validation failed: $($hashFailures -join '; ')." }

[pscustomobject]@{
    result = 'PASS'
    authoritativeCards = $content.cards.Count
    localAssets = $assetRefs.Count
    remoteRuntimeDependencies = $remoteUrls.Count
    manifestEntries = @($manifest.PSObject.Properties).Count
} | ConvertTo-Json
