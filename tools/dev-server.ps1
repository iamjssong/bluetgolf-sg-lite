param(
  [int]$Port = 4173,
  [string]$Root = (Resolve-Path "$PSScriptRoot\..").Path
)

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".xml" = "application/xml; charset=utf-8"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
}

function Write-HttpResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$Reason,
    [string]$ContentType,
    [byte[]]$Body
  )

  $headers = "HTTP/1.1 $StatusCode $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

$listener.Start()
Write-Host "BlueTgolf SG Lite dev server listening on http://127.0.0.1:$Port/"
Write-Host "Serving $rootPath"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq "") {
          break
        }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Bad request")
        Write-HttpResponse $stream 400 "Bad Request" "text/plain; charset=utf-8" $body
        continue
      }

      $parts = $requestLine.Split(" ")
      if ($parts.Count -lt 2 -or $parts[0] -ne "GET") {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
        Write-HttpResponse $stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $body
        continue
      }

      $rawPath = $parts[1].Split("?")[0]
      $requestPath = [Uri]::UnescapeDataString($rawPath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $candidate = Join-Path $rootPath $requestPath
      $resolved = $null
      if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        $resolved = (Resolve-Path -LiteralPath $candidate).Path
      }

      if ($resolved -and $resolved.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $extension = [System.IO.Path]::GetExtension($resolved)
        $contentType = $contentTypes[$extension]
        if (-not $contentType) {
          $contentType = "application/octet-stream"
        }

        $bytes = [System.IO.File]::ReadAllBytes($resolved)
        Write-HttpResponse $stream 200 "OK" $contentType $bytes
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Write-HttpResponse $stream 404 "Not Found" "text/plain; charset=utf-8" $body
      }
    } catch {
      if ($stream) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
        Write-HttpResponse $stream 500 "Internal Server Error" "text/plain; charset=utf-8" $body
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
