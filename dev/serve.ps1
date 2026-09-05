# Local dev server for Riffly.
$root = Split-Path -Parent $PSScriptRoot
$php = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $php) {
  $php = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
}
& $php -c (Join-Path $root 'dev\php.ini') -S 127.0.0.1:8001 -t (Join-Path $root 'public')
