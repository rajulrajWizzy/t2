# PowerShell script to remove all script files except organize-scripts.js and create-migration.js
$filesToKeep = @("organize-scripts.js", "create-migration.js")
$scriptsDir = "scripts"

# Get all .js files in the scripts directory
$allFiles = Get-ChildItem -Path $scriptsDir -Filter "*.js"

# Loop through each file and remove it if it's not in the filesToKeep list
foreach ($file in $allFiles) {
    if ($filesToKeep -notcontains $file.Name) {
        Write-Host "Removing $($file.FullName)"
        Remove-Item $file.FullName -Force
    } else {
        Write-Host "Keeping $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nCleanup completed. Only the following files remain:" -ForegroundColor Cyan
Get-ChildItem -Path $scriptsDir -Filter "*.js" | ForEach-Object {
    Write-Host "- $($_.Name)" -ForegroundColor Yellow
} 