$ErrorActionPreference = 'Stop'
$auditDir = 'D:\rclone\research\ruang-belajar-2026-10-21'
$pdfDir = Join-Path $auditDir 'pdf'
New-Item -ItemType Directory -Path $pdfDir -Force | Out-Null
$items = Get-Content -Raw -LiteralPath (Join-Path $auditDir 'index.json') | ConvertFrom-Json
$selections = @(
    @{ Match='SM ITB 25-26 Pixelindo/Matematika Dasar Materi/2. Integral.pdf'; Local='drive-integral.pdf' },
    @{ Match='SM ITB 25-26 Pixelindo/Matematika Dasar Materi/7. Vektor.pdf'; Local='drive-vektor.pdf' },
    @{ Match='SM ITB 25-26 Pixelindo/Matematika Dasar Materi/13. Polinomial.pdf'; Local='drive-polinomial.pdf' },
    @{ Match='SM ITB 25-26 Pixelindo/Matematika Dasar Materi/22. Lingkaran.pdf'; Local='drive-lingkaran.pdf' },
    @{ Match='*/06 Lit Bhs Inggris*/*04a Materi Paragraph Following and Preceding*.pdf'; Local='drive-paragraph-following-preceding.pdf' },
    @{ Match='*/05 Lit Bhs Indo*/*03a Materi Evaluasi dan Refleksi*.pdf'; Local='drive-evaluasi-refleksi.pdf' },
    @{ Match='*/07 PM*/*03a Materi Data dan Ketidakpastian*.pdf'; Local='drive-data-ketidakpastian.pdf' },
    @{ Match='SIMAK UI/*/03 Bahasa Inggris*/01 Materi Bahasa Inggris*.pdf'; Local='drive-bahasa-inggris.pdf' },
    @{ Match='*/01 PU*/*04a Materi Bahasa Buatan dan Pola Bilangan*.pdf'; Local='drive-bahasa-buatan-pola.pdf' }
)
$manifest = @()
foreach ($selection in $selections) {
    $found = @($items | Where-Object { -not $_.IsDir -and $_.Path -like $selection.Match })
    if ($found.Count -ne 1) { throw "Expected one match for $($selection.Match), got $($found.Count)" }
    $item = $found[0]
    $target = Join-Path $pdfDir $selection.Local
    if (-not (Test-Path -LiteralPath $target)) {
        & 'D:\rclone\rclone.exe' copyto ('gshared,root_folder_id=1ZSaGixqJ28Q9J9gb0CDdS5ypq6YeEtIp,team_drive=:' + $item.Path) $target --config 'D:\rclone\rclone.conf' --contimeout 20s --timeout 90s --retries 2 --low-level-retries 2 --log-file (Join-Path $auditDir 'download-samples.log') --log-level NOTICE
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $($item.Path)" }
    }
    $manifest += [ordered]@{ LocalPath=$target; SourcePath=$item.Path; DriveID=$item.ID; SourceURL=('https://drive.google.com/file/d/' + (($item.ID -split "`t")[-1]) + '/view'); Bytes=$item.Size; MD5=$item.Hashes.md5 }
    Write-Output "Downloaded $($selection.Local)"
}
$official = @(
    @{Local='cambridge-9709-2026-2027.pdf'; URL='https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf'},
    @{Local='cambridge-9694-2026-2027.pdf'; URL='https://www.cambridgeinternational.org/Images/697412-2026-2027-syllabus.pdf'},
    @{Local='cambridge-9093-2027-2028.pdf'; URL='https://www.cambridgeinternational.org/Images/721359-2027-2028-syllabus.pdf'}
)
foreach ($item in $official) {
    $target = Join-Path $pdfDir $item.Local
    if (-not (Test-Path -LiteralPath $target)) { Invoke-WebRequest -Uri $item.URL -OutFile $target }
    $manifest += [ordered]@{ LocalPath=$target; SourceURL=$item.URL }
    Write-Output "Downloaded $($item.Local)"
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 -LiteralPath (Join-Path $auditDir 'pdf-manifest.json')
