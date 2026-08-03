$p = 'd:\NutriScan-mainn\Frontend\src\components\PrivacyPolicy.jsx'
$raw = [System.IO.File]::ReadAllText($p)

# Sections 3..13 shift by one because "What we do not collect" was inserted as 3.
# Applied high-to-low so a renamed number is never rewritten twice.
$map = [ordered]@{
  "title: '13. Scores are not medical advice'"    = "title: '14. Scores are not medical advice'"
  "title: '12. International transfers'"          = "title: '13. International transfers'"
  "title: `"11. Children's privacy`""             = "title: `"12. Children's privacy`""
  "title: '10. How we protect it'"                = "title: '11. How we protect it'"
  "title: '9. Your rights'"                       = "title: '10. Your rights'"
  "title: '8. How long we keep it'"               = "title: '9. How long we keep it'"
  "title: '7. Legal basis (GDPR and similar laws)'" = "title: '8. Legal basis (GDPR and similar laws)'"
  "title: '6. Cookies and on-device storage'"     = "title: '7. Cookies and on-device storage'"
  "title: '5. Who else processes it'"             = "title: '6. Who else processes it'"
  "title: '4. Why we use it'"                     = "title: '5. Why we use it'"
  "title: '3. What other users can see'"          = "title: '4. What other users can see'"
}

foreach ($k in $map.Keys) {
  if (-not $raw.Contains($k)) { Write-Output ("MISS: " + $k) }
  $raw = $raw.Replace($k, $map[$k])
}

[System.IO.File]::WriteAllText($p, $raw, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "renumbered"
