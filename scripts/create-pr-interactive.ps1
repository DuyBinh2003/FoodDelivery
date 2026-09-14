```powershell
# ============================================================
# Git: Create PR
#

# Flow:
#   1. Get issues assigned to current GitHub user
#   2. Select issue with Up / Down / Enter
#   3. Create branch from selected issue
#   4. Create empty commit
#   5. Push branch
#   6. Create Draft PR
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# UTF-8 configuration
# ------------------------------------------------------------
$env:LANG = "C.UTF-8"
$env:LC_ALL = "C.UTF-8"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ------------------------------------------------------------
# Helper: restore cursor before exiting
# ------------------------------------------------------------
function Restore-Cursor {
    [Console]::CursorVisible = $true
}

# ------------------------------------------------------------
# Helper: execute command and check exit code
# ------------------------------------------------------------
function Invoke-CommandChecked {
    param (
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $Command $($Arguments -join ' ')"
    }
}

try {
    # --------------------------------------------------------
    # Get issues assigned to current user
    # --------------------------------------------------------
    Write-Host "Đang tải danh sách issue của bạn..." -ForegroundColor Cyan

    $issuesJson = gh issue list `
        --assignee "@me" `
        --state open `
        --limit 100 `
        --json number,title |
        Out-String

    if ([string]::IsNullOrWhiteSpace($issuesJson)) {
        Write-Host "`nKhông tìm thấy issue nào được giao cho bạn." -ForegroundColor Yellow
        exit 0
    }

    $issues = @(ConvertFrom-Json $issuesJson)

    if ($issues.Count -eq 0) {
        Write-Host "`nKhông tìm thấy issue nào được giao cho bạn." -ForegroundColor Yellow
        exit 0
    }

    # --------------------------------------------------------
    # Interactive issue selection
    # --------------------------------------------------------
    $selectedIndex = 0
    $done = $false

    [Console]::CursorVisible = $false

    while (-not $done) {
        Clear-Host

        Write-Host "Git: Create PR`n" -ForegroundColor Cyan
        Write-Host "Chọn Issue:`n" -ForegroundColor Cyan

        for ($i = 0; $i -lt $issues.Count; $i++) {

            $issueNumber = $issues[$i].number
            $issueTitle = $issues[$i].title

            if ($i -eq $selectedIndex) {
                Write-Host "> #$issueNumber - $issueTitle" -ForegroundColor Green
            }
            else {
                Write-Host "  #$issueNumber - $issueTitle"
            }
        }

        Write-Host "`n↑ / ↓ : Navigate    Enter : Select    Esc : Cancel" `
            -ForegroundColor DarkGray

        $key = [Console]::ReadKey($true)

        switch ($key.Key) {

            "UpArrow" {
                if ($selectedIndex -gt 0) {
                    $selectedIndex--
                }
            }

            "DownArrow" {
                if ($selectedIndex -lt ($issues.Count - 1)) {
                    $selectedIndex++
                }
            }

            "Enter" {
                $done = $true
            }

            "Escape" {
                Restore-Cursor
                Clear-Host
                Write-Host "Đã hủy." -ForegroundColor Yellow
                exit 0
            }
        }
    }

    Restore-Cursor
    Clear-Host

    # --------------------------------------------------------
    # Selected issue
    # --------------------------------------------------------
    $selectedIssue = $issues[$selectedIndex]

    $issueId = $selectedIssue.number
    $issueTitle = $selectedIssue.title

    Write-Host "Issue được chọn:" -ForegroundColor Cyan
    Write-Host "#$issueId - $issueTitle`n" -ForegroundColor Green

    # --------------------------------------------------------
    # Create branch from issue
    # --------------------------------------------------------
    Write-Host "Đang tạo branch cho Issue #$issueId..." -ForegroundColor Cyan

    Invoke-CommandChecked `
        "gh" `
        @("issue", "develop", "$issueId", "-c")

    # --------------------------------------------------------
    # Get current branch
    # --------------------------------------------------------
    $branchName = (git branch --show-current).Trim()

    if ([string]::IsNullOrWhiteSpace($branchName)) {
        throw "Không xác định được branch hiện tại."
    }

    Write-Host "Branch: $branchName" -ForegroundColor Green

    # --------------------------------------------------------
    # Create empty commit
    # --------------------------------------------------------
    Write-Host "`nĐang tạo commit..." -ForegroundColor Cyan

    Invoke-CommandChecked `
        "git" `
        @(
            "commit",
            "--allow-empty",
            "-m",
            "chore: start issue #$issueId"
        )

    # --------------------------------------------------------
    # Push branch
    # --------------------------------------------------------
    Write-Host "`nĐang push branch lên remote..." -ForegroundColor Cyan

    Invoke-CommandChecked `
        "git" `
        @(
            "push",
            "-u",
            "origin",
            "HEAD"
        )

    # --------------------------------------------------------
    # Create Draft PR
    # --------------------------------------------------------
    Write-Host "`nĐang tạo Draft PR..." -ForegroundColor Cyan

    $prBody = @"
## Related Issue

Closes #$issueId

## Description

<!-- Describe your changes here -->

## Checklist

- [ ] Tested locally
- [ ] Added/updated tests if necessary
- [ ] Checked for lint/type errors
"@

    gh pr create `
        --draft `
        --title "$branchName" `
        --body "$prBody"

    if ($LASTEXITCODE -ne 0) {
        throw "Không thể tạo Pull Request."
    }

    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Draft PR đã được tạo thành công!" -ForegroundColor Green
    Write-Host "Issue : #$issueId" -ForegroundColor Green
    Write-Host "Branch: $branchName" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}
catch {
    Restore-Cursor

    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    exit 1
}
finally {
    Restore-Cursor
}
```
