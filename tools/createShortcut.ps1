$w = New-Object -ComObject WScript.Shell
$desk = "C:\Users\Admin\OneDrive\Desktop\Astro-Financial Simulator.lnk"
$sc = $w.CreateShortcut($desk)
$sc.TargetPath = "c:\Users\Admin\Sunil\Trading\start-simulator.bat"
$sc.WorkingDirectory = "c:\Users\Admin\Sunil\Trading"
$sc.IconLocation = "shell32.dll,242"
$sc.Description = "Astro-Financial Trading Simulator"
$sc.Save()
Write-Host "Desktop shortcut created successfully at: $desk"
