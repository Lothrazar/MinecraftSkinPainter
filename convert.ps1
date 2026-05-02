$bytes = [IO.File]::ReadAllBytes(".\assets\alex.png")
$b64 = [Convert]::ToBase64String($bytes)
"data:image/png;base64,$b64" | Set-Clipboard
