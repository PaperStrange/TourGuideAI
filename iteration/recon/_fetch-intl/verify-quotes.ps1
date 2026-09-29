# Verifies every quoted span in review-source-matrix.md against the fetched source bytes.
# Usage: pwsh -NoProfile -File iteration/recon/_fetch-intl/verify-quotes.ps1
# Convention: HTML/JSON are flattened (tags stripped, entities decoded, whitespace collapsed,
# space before punctuation removed) -- same rendering convention as docs/handOff/evidence/CLAUSES-verbatim.md.
param(
  [string]$Matrix = "D:\All-Downloads\TourGuideAI\iteration\recon\review-source-matrix.md",
  [int]$Window = 25
)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
function Flatten([string]$c){
  $c = [regex]::Replace($c,'(?is)<script.*?</script>',' ')
  $c = [regex]::Replace($c,'(?is)<style.*?</style>',' ')
  $c = [regex]::Replace($c,'(?is)<[^>]+>',' ')
  $c = [System.Net.WebUtility]::HtmlDecode($c)
  return (Norm $c)
}
# Rendering convention: HTML tags / markdown markup removed, entities decoded, whitespace collapsed,
# spaces before punctuation and inside typographic quotes removed (all are tag/markup artefacts).
function Norm([string]$s){
  $s = [regex]::Replace($s,'\[([^\]]+)\]\([^)]*\)','$1')      # markdown link -> link text
  $s = [regex]::Replace($s,'\*\*|__','')                       # bold markers
  $s = [regex]::Replace($s,'\\([_*`\[\]()#])','$1')            # markdown escapes
  $s = [regex]::Replace($s,'\s+',' ')
  $s = [regex]::Replace($s,'\s*([“”‘’])\s*','$1')
  return [regex]::Replace($s,'\s+([.,;:])','$1')
}
$corpus = ""
Get-ChildItem $dir -File | Where-Object { $_.Extension -in ".txt",".md",".html",".json" } | ForEach-Object { $corpus += (Flatten (Get-Content -Raw $_.FullName)) + " " }
$house = "D:\All-Downloads\TourGuideAI\docs\handOff\evidence\google-maps-service-terms.html"
if (Test-Path $house) { $corpus += (Flatten (Get-Content -Raw $house)) }
$lines = Get-Content $Matrix
$ok = 0; $fail = 0; $fails = @()
foreach ($ln in $lines) {
  if ($ln -notmatch '^-\s*>\s') { continue }
  $body = ($ln -replace '^-\s*>\s','')
  foreach ($frag in ($body -split '\s*／\s*')) {
    $q = Norm ($frag -replace '^>\s*','')
    foreach ($part in ($q -split '\[…\]|…')) {
      $p = $part.Trim()
      if ($p.Length -lt $Window) { continue }
      $step = [Math]::Max(1,[int]($Window/2))
      for ($s = 0; $s -le ($p.Length - $Window); $s += $step) {
        $probe = $p.Substring($s,$Window)
        if ($corpus.Contains($probe)) { $ok++ } else { $fail++; $fails += $probe }
      }
    }
  }
}
Write-Output ("matrix lines = {0} (limit 150) ; window = {1}" -f $lines.Count, $Window)
Write-Output ("quote windows verified OK = {0} ; FAIL = {1}" -f $ok, $fail)
$fails | Select-Object -Unique | ForEach-Object { Write-Output ("  FAIL: " + $_) }
