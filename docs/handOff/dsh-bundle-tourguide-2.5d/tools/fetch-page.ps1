param(
  [Parameter(Mandatory=$true)][string]$Url,
  [int]$Max = 8000,
  [string]$Grep = ""
)
$ErrorActionPreference = "Stop"
$h = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"; "Accept-Language" = "en-US,en;q=0.9" }
try {
  $r = Invoke-WebRequest -Uri $Url -Headers $h -TimeoutSec 60 -UseBasicParsing
} catch {
  Write-Output ("FETCH_ERR: " + $_.Exception.Message)
  exit 1
}
$c = $r.Content
if ($c -is [byte[]]) { $c = [System.Text.Encoding]::UTF8.GetString($c) }
# strip script/style
$c = [regex]::Replace($c, '(?is)<script.*?</script>', ' ')
$c = [regex]::Replace($c, '(?is)<style.*?</style>', ' ')
$c = [regex]::Replace($c, '(?is)<noscript.*?</noscript>', ' ')
$c = [regex]::Replace($c, '(?is)<[^>]+>', ' ')
$c = [System.Net.WebUtility]::HtmlDecode($c)
$c = [regex]::Replace($c, '[ \t\r\f\v]+', ' ')
$c = [regex]::Replace($c, '(\s*\n\s*){2,}', "`n")
$c = $c.Trim()
if ($Grep -ne "") {
  $lines = $c -split "`n"
  $out = @()
  foreach ($ln in $lines) { if ($ln -match $Grep) { $out += $ln.Trim() } }
  $c = ($out -join "`n")
  if ($c.Length -eq 0) { Write-Output "GREP_NOMATCH" ; exit 0 }
}
if ($c.Length -gt $Max) { $c = $c.Substring(0, $Max) + "`n...[TRUNCATED]" }
Write-Output $c
