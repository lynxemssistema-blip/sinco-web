$source = (Resolve-Path 'PublicacaoSite').Path
$dest = (Join-Path (Resolve-Path '.').Path 'SINCO_Deploy.zip')

Remove-Item -Path $dest -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($dest, 'Create')

$files = Get-ChildItem -Path $source -Recurse -File | Where-Object {
    ($_.FullName -notmatch 'node_modules') -and ($_.FullName -notmatch '\\logs\\')
}

foreach ($file in $files) {
    $entryName = $file.FullName.Substring($source.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName) | Out-Null
}

$zip.Dispose()
Write-Host "ZIP criado! Tamanho: $([Math]::Round((Get-Item $dest).Length / 1MB, 2)) MB"
