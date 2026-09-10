[CmdletBinding()]
param()

gh issue list -a '@me'
$id = Read-Host 'Nhập ID của task để tạo PR (hoặc Enter để hủy)'

if ([string]::IsNullOrWhiteSpace($id)) {
    Write-Host "Đã hủy thao tác."
    exit 0
}

$branch = Read-Host 'Nhập tên nhánh. Enter để TỰ ĐỘNG lấy tên từ Issue'

if ([string]::IsNullOrWhiteSpace($branch)) {
    Write-Host 'Đang tải tên Issue từ GitHub...'
    $title = gh issue view $id --json title -q .title
    
    if (-not $title) {
        Write-Host "Lỗi: Không tìm thấy Issue #$id" -ForegroundColor Red
        exit 1
    }

    $title = $title.ToLower()
    $title = $title -replace 'đ', 'd' -replace 'Đ', 'd'
    
    # Sử dụng .NET để bóc tách và loại bỏ dấu (diacritics)
    $normalized = $title.Normalize([System.Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder
    foreach ($c in $normalized.ToCharArray()) {
        if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($c)
        }
    }
    
    # Thay thế các ký tự không phải chữ/số thành dấu gạch ngang
    $cleanTitle = $builder.ToString() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-|-$', ''
    
    $branch = "$id-$cleanTitle"
}

Write-Host "Đang tạo nhánh: $branch" -ForegroundColor Green
gh issue develop $id -n $branch -c

Write-Host 'Đang tạo commit rỗng...' -ForegroundColor Yellow
git commit --allow-empty -m "chore: start issue #$id"

Write-Host 'Đang đẩy code lên remote...' -ForegroundColor Yellow
git push -u origin HEAD

Write-Host 'Đang tạo PR tự động...' -ForegroundColor Yellow
gh pr create --title "Resolves #$id" --body-file ".github/PULL_REQUEST_TEMPLATE.md"

Write-Host "Hoàn tất! Bạn có thể bắt đầu code." -ForegroundColor Green
