param(
  [Parameter(Mandatory=$true)][string]$File,
  [int]$Max = 20000,
  [string]$Grep = ""
)
$c = Get-Content -Raw -Path $File
$c = [regex]::Replace($c, '(?is)<script.*?</script>', ' ')
$c = [regex]::Replace($c, '(?is)<style.*?</style>', ' ')
$c = [regex]::Replace($c, '(?is)<noscript.*?</noscript>', ' ')
$c = [regex]::Replace($c, '(?is)<br\s*/?>', "`n")
$c = [regex]::Replace($c, '(?is)</(p|div|li|tr|h[1-6]|td|section)>', "`n")
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
