$skip = 'node_modules|\\coverage\\|\\dist\\|\\.git\\|package-lock|\\platforms\\|\\plugins\\|\\mobile\\www\\|agent-memory|__tmp_'
$files = Get-ChildItem -Path 'd:\NutriScan-mainn' -Recurse -File -Include *.js,*.jsx,*.json,*.html,*.xml,*.css,*.webmanifest,_headers |
  Where-Object { $_.FullName -notmatch $skip }

# Capitalised display name -> safe to rename
$files | Select-String -Pattern 'FitScore' -CaseSensitive |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Replace('d:\NutriScan-mainn\',''), $_.LineNumber, $_.Line.Trim() } |
  Set-Content -Path 'd:\NutriScan-mainn\__tmp_display.txt' -Encoding UTF8

# lowercase identifiers -> must be reviewed individually
$files | Select-String -Pattern 'fitscore|fitscan' -CaseSensitive |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Replace('d:\NutriScan-mainn\',''), $_.LineNumber, $_.Line.Trim() } |
  Set-Content -Path 'd:\NutriScan-mainn\__tmp_ident.txt' -Encoding UTF8

Write-Output ("display: " + @(Get-Content 'd:\NutriScan-mainn\__tmp_display.txt').Count)
Write-Output ("ident:   " + @(Get-Content 'd:\NutriScan-mainn\__tmp_ident.txt').Count)
