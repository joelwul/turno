$root = Join-Path $PWD "turno"
$f = Join-Path $root "frontend\api\mp-create-subscription.ts"
$c = [IO.File]::ReadAllText($f)
$old = "payer_email: ownerEmail,"
$new = "payer_email: process.env.MP_PAYER_EMAIL || ownerEmail,"
if ($c.Contains($old)) { [IO.File]::WriteAllText($f, $c.Replace($old, $new)); Write-Host "~ payer_email con override de test" } else { Write-Host "! anchor no encontrado" }
Write-Host "Listo. Corre Subir.bat"