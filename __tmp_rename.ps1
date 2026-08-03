# Renames the DISPLAY name FitScore -> NutriScore (case-sensitive, capitalised only).
#
# Excluded on purpose:
#   cordova-plugin-fitscore-play-integrity/**  -> "FitScorePlayIntegrity" is a Java
#     class name, a <clobbers> target, a <feature> name and an android-package. It
#     maps to src/android/FitScorePlayIntegrity.java. Renaming it is an Android
#     refactor that breaks the build unless the file + java package move too, and
#     it is invisible to users. Handled separately for its two description strings.
#   Lowercase fitscore/fitscan identifiers are NOT touched by this script at all
#     (hostnames, cookie names, JWT issuer/audience, storage keys, Play product ids,
#     Cloudinary preset, CSS class names, Android package id).

$skip = 'node_modules|\\coverage\\|\\dist\\|\\.git\\|package-lock|\\platforms\\|\\plugins\\|\\mobile\\www\\|agent-memory|__tmp_|cordova-plugin-fitscore-play-integrity|\.css-index\.json'

$files = Get-ChildItem -Path 'd:\NutriScan-mainn' -Recurse -File -Include *.js,*.jsx,*.json,*.html,*.xml,*.css,*.webmanifest,_headers |
  Where-Object { $_.FullName -notmatch $skip }

$changed = 0
foreach ($f in $files) {
  $raw = [System.IO.File]::ReadAllText($f.FullName)
  if ($raw -cmatch 'FitScore') {
    $new = $raw -creplace 'FitScore', 'NutriScore'
    [System.IO.File]::WriteAllText($f.FullName, $new, (New-Object System.Text.UTF8Encoding($false)))
    $changed++
    Write-Output ("renamed: " + $f.FullName.Replace('d:\NutriScan-mainn\',''))
  }
}
Write-Output ("files changed: " + $changed)
