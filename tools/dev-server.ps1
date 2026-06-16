param(
  [int]$Port = 4173,
  [string]$Root = (Resolve-Path "$PSScriptRoot\..").Path
)

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host "BlueTgolf SG Lite dev server listening on http://127.0.0.1:$Port/"
Write-Host "Serving $Root"

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))

  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = "index.html"
  }

  $candidate = Join-Path $Root $requestPath
  $resolved = $null

  if (Test-Path -LiteralPath $candidate -PathType Leaf) {
    $resolved = (Resolve-Path -LiteralPath $candidate).Path
  }

  if ($resolved -and $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $extension = [System.IO.Path]::GetExtension($resolved)
    $context.Response.ContentType = $contentTypes[$extension]
    if (-not $context.Response.ContentType) {
      $context.Response.ContentType = "application/octet-stream"
    }

    $bytes = [System.IO.File]::ReadAllBytes($resolved)
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $context.Response.StatusCode = 404
    $message = [System.Text.Encoding]::UTF8.GetBytes("Not found")
    $context.Response.OutputStream.Write($message, 0, $message.Length)
  }

  $context.Response.OutputStream.Close()
}
