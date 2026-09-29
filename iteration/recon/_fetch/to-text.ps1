param(
  [Parameter(Mandatory=$true)][string]$In,
  [string]$Out = "",
  [string]$Grep = "",
  [int]$Max = 400000
)
$c = Get-Content -LiteralPath $In -Raw
if ($null -eq $c) { $c = "" }
$c = $c -replace '(?is)<script.*?</script>', ' '
$c = $c -replace '(?is)<style.*?</style>', ' '
$c = $c -replace '(?is)<noscript.*?</noscript>', ' '
$c = $c -replace '(?is)<br\s*/?>', "`n"
$c = $c -replace '(?is)</(p|div|li|tr|h[1-6]|section|article)>', "`n"
$c = $c -replace '(?is)<[^>]+>', ' '
$c = [System.Net.WebUtility]::HtmlDecode($c)
$c = $c -replace '[ \t\r\f\v\u00a0]+', ' '
$c = $c -replace '(\s*\n\s*){2,}', "`n"
$c = $c.Trim()
if ($Grep -ne "") {
  $lines = $c -split "`n"
  $keep = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $Grep) { $keep += ("[" + $i + "] " + $lines[$i].Trim()) }
  }
  $c = ($keep -join "`n")
  if ($c.Length -eq 0) { $c = "GREP_NOMATCH" }
}
if ($c.Length -gt $Max) { $c = $c.Substring(0, $Max) + "`n...[TRUNCATED]" }
if ($Out -ne "") { Set-Content -LiteralPath $Out -Value $c -Encoding UTF8 }
Write-Output $c
