param(
  [string]$Endpoint = "http://192.168.178.100/",
  [int]$Requests = 20
)

$successes = 0
$failures = 0

for ($index = 1; $index -le $Requests; $index += 1) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Endpoint -TimeoutSec 4
    if ($response.StatusCode -eq 200) {
      $successes += 1
      Write-Output "#$index OK"
    } else {
      $failures += 1
      Write-Output "#$index HTTP $($response.StatusCode)"
    }
  } catch {
    $failures += 1
    Write-Output "#$index FAILED: $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 250
}

Write-Output "RESULT successes=$successes failures=$failures"
if ($failures -gt 0) { exit 1 }
