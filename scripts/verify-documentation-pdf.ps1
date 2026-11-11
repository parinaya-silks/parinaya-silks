$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType=WindowsRuntime] | Out-Null
$operationTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$actionTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
function Wait-Result($operation, $type) { $task=$operationTask.MakeGenericMethod($type).Invoke($null,@($operation)); $task.GetAwaiter().GetResult() }
$manifest = Get-Content -LiteralPath '.cache/documentation-export/manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$totalPages=0
$samples=@('00_Documentation_Index.pdf','docs__FLAT_SHIPPING.pdf','docs__technical__api-reference.pdf','docs__technical__firestore-security.pdf','docs__SHIPPING.pdf')
$results=@()
foreach($record in $manifest.records) {
 $file=Wait-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync($record.path)) ([Windows.Storage.StorageFile])
 $pdf=Wait-Result ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
 if($pdf.PageCount -lt 1) { throw ('No pages: '+$record.pdf) }
 $totalPages += $pdf.PageCount
 $results += @{file=$record.pdf;pages=$pdf.PageCount;bytes=(Get-Item -LiteralPath $record.path).Length}
 if($samples -contains $record.pdf) {
  $page=$pdf.GetPage(0)
  $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
  $options=[Windows.Data.Pdf.PdfPageRenderOptions]::new();$options.DestinationWidth=1100
  $task=$actionTask.Invoke($null,@($page.RenderToStreamAsync($stream,$options)));$task.GetAwaiter().GetResult()
  $stream.Seek(0)
  $reader=[Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
  $loaded=Wait-Result ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
  $bytes=New-Object byte[] $loaded;$reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes((Join-Path (Get-Location) ('.cache/documentation-export/'+$record.pdf+'.png')),$bytes)
  $reader.Dispose();$stream.Dispose();$page.Dispose()
 }
}
@{pdfs=$results.Count;pages=$totalPages;documents=$results} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.cache/documentation-export/verification.json' -Encoding UTF8
Write-Output ('Parsed '+$results.Count+' PDFs with '+$totalPages+' pages; rendered '+$samples.Count+' representative PDFs.')
