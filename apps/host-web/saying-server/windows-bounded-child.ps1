param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
[Console]::InputEncoding = New-Object Text.UTF8Encoding($false, $true)

$sourceNames = @("windows-bounded-child-native.cs", "windows-bounded-child.cs")
$sourcePaths = @($sourceNames | ForEach-Object {
  $sourcePath = Join-Path -Path $PSScriptRoot -ChildPath $_
  $sourceItem = Get-Item -LiteralPath $sourcePath -Force
  if ($sourceItem.PSIsContainer -or
      (($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
    throw "Saying launcher source $($_) must be one ordinary non-reparse file."
  }
  $sourceItem.FullName
})
Add-Type -Path $sourcePaths

$requestText = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($requestText) -or $requestText.Length -gt 131072) {
  throw "The saying launcher requires one bounded JSON request on stdin."
}
$request = $requestText | ConvertFrom-Json
$names = @($request.PSObject.Properties.Name)
if ($names.Count -ne 3 -or
    -not ($names -ccontains "command") -or
    -not ($names -ccontains "arguments") -or
    -not ($names -ccontains "stdin")) {
  throw "The saying launcher requires exactly command, arguments, and stdin fields."
}
$command = [string]$request.command
$arguments = @($request.arguments | ForEach-Object { [string]$_ })
$standardInput = [string]$request.stdin
$exitCode = [Badge.Sayings.BoundedChildJob]::Run(
  $command,
  [string[]]$arguments,
  $standardInput,
  [string](Get-Location).ProviderPath
)
exit $exitCode
