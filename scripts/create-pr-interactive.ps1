$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Đang tải danh sách issue của bạn..." -ForegroundColor Cyan
$issuesJson = gh issue list -a '@me' --json number, title
if (-not $issuesJson) {
    Write-Host "Không tìm thấy issue nào được giao cho bạn."
    exit 0
}

$issues = $issuesJson | ConvertFrom-Json

if ($issues.Count -eq 0) {
    Write-Host "Không tìm thấy issue nào được giao cho bạn."
    exit 0
}

$selectedIndex = 0
$done = $false

# Hide cursor
[console]::CursorVisible = $false

while (-not $done) {
    Clear-Host
    Write-Host "Sử dụng phím Lên/Xuống để điều hướng, Enter để chọn, hoặc Esc để hủy:`n" -ForegroundColor Cyan
    
    for ($i = 0; $i -lt $issues.Count; $i++) {
        if ($i -eq $selectedIndex) {
            Write-Host "> $($issues[$i].number): $($issues[$i].title)" -ForegroundColor Green
        }
        else {
            Write-Host "  $($issues[$i].number): $($issues[$i].title)"
        }
    }
    
    $key = [console]::ReadKey($true)
    if ($key.Key -eq 'UpArrow') {
        if ($selectedIndex -gt 0) { $selectedIndex-- }
    }
    elseif ($key.Key -eq 'DownArrow') {
        if ($selectedIndex -lt ($issues.Count - 1)) { $selectedIndex++ }
    }
    elseif ($key.Key -eq 'Enter') {
        $done = $true
    }
    elseif ($key.Key -eq 'Escape') {
        [console]::CursorVisible = $true
        Write-Host "`nĐã hủy."
        exit 0
    }
}

[console]::CursorVisible = $true
Clear-Host

$selectedIssue = $issues[$selectedIndex]
$id = $selectedIssue.number

Write-Host "Đã chọn Issue #${id}: $($selectedIssue.title)" -ForegroundColor Yellow

Write-Host "Đang tạo nhánh cho Issue #${id}..."
gh issue develop $id -c

Write-Host "Đang tạo commit rỗng..."
git commit --allow-empty -m "chore: start issue #${id}"

Write-Host "Đang đẩy code lên remote..."
git push -u origin HEAD

$branchName = git branch --show-current
Write-Host "Đang tạo PR tự động..."
gh pr create --title "$branchName" --body-file '.github/PULL_REQUEST_TEMPLATE.md'
