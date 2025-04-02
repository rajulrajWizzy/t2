# Script to fix dynamic route parameters
# Standardize all route parameters to use [id]

# Remove the [userId] directory and its contents
if (Test-Path "src\app\api\admin\users\[userId]") {
    Write-Host "Removing [userId] directory..."
    Remove-Item -Recurse -Force "src\app\api\admin\users\[userId]"
}

# Ensure all API components use the correct path
Write-Host "Updating UserVerification component..."
$userVerificationPath = "src\app\components\admin\UserVerification.tsx"
if (Test-Path $userVerificationPath) {
    $content = Get-Content $userVerificationPath -Raw
    $content = $content -replace '`/api/users/\${userId}/verify-document`', '`/api/users/${userId}/verify-document`'
    $content | Set-Content $userVerificationPath
}

Write-Host "Done fixing routes."
