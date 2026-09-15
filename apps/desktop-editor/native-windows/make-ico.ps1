Add-Type -AssemblyName System.Drawing

$pngPath = "c:\Users\saavi\Desktop\180workspace\apps\frontend\public\icons\icon-512x512.png"
$icoPath = "c:\Users\saavi\Desktop\180workspace\apps\desktop-editor\native-windows\app.ico"

$src = [System.Drawing.Bitmap]::FromFile($pngPath)
$sizes = @(16, 32, 48, 64, 128, 256)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)

$pngStreams = @()
foreach ($size in $sizes) {
    $resized = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    
    $pMs = New-Object System.IO.MemoryStream
    $resized.Save($pMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += $pMs
    $resized.Dispose()
}

$offset = 6 + ($sizes.Count * 16)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $w = $sizes[$i]
    $dimByte = [byte]0
    if ($w -lt 256) { $dimByte = [byte]$w }
    $bw.Write($dimByte) # Width
    $bw.Write($dimByte) # Height
    $bw.Write([byte]0) # Color palette
    $bw.Write([byte]0) # Reserved
    $bw.Write([UInt16]1) # Color planes
    $bw.Write([UInt16]32) # Bits per pixel
    $bw.Write([UInt32]$pngStreams[$i].Length)
    $bw.Write([UInt32]$offset)
    $offset += $pngStreams[$i].Length
}

foreach ($pMs in $pngStreams) {
    $bw.Write($pMs.ToArray())
    $pMs.Dispose()
}

$src.Dispose()
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose()
$ms.Dispose()

$len = (Get-Item $icoPath).Length
Write-Host "ICO successfully generated: $len bytes"
