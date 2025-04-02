# Script to find all dynamic route folders in the Next.js app
$apiDir = ".\src\app\api"

# Find all directories with square brackets in their names
Write-Host "Finding all dynamic route folders..."
$dynamicRouteFolders = Get-ChildItem -Path $apiDir -Recurse -Directory | Where-Object { $_.Name -match '^\[.*\]$' }

# Display the results
Write-Host "Found dynamic route folders:"
foreach ($folder in $dynamicRouteFolders) {
    Write-Host "- $($folder.FullName)"
}

# Check for conflicting parameter names
Write-Host "`nChecking for conflicting parameter names..."
$paramNames = @{}

foreach ($folder in $dynamicRouteFolders) {
    # Extract the parameter name without brackets
    $paramName = $folder.Name -replace '^\[(.*)\]$', '$1'
    $parentPath = Split-Path -Parent $folder.FullName
    
    if (-not $paramNames.ContainsKey($parentPath)) {
        $paramNames[$parentPath] = @()
    }
    
    $paramNames[$parentPath] += $paramName
}

# Find conflicts
$hasConflicts = $false
foreach ($parentPath in $paramNames.Keys) {
    $uniqueParams = $paramNames[$parentPath] | Select-Object -Unique
    if ($uniqueParams.Count -lt $paramNames[$parentPath].Count) {
        Write-Host "Conflict found in $parentPath:"
        Write-Host "  Parameters: $($paramNames[$parentPath] -join ', ')"
        $hasConflicts = $true
    }
}

if (-not $hasConflicts) {
    Write-Host "No conflicts found!"
} else {
    Write-Host "`nConflicts detected. Please standardize all parameter names to [id]."
}
