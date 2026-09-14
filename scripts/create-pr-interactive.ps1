# ============================================================
# Git: Create PR
#
# Flow:
#   1. Get open issues assigned to current GitHub user
#   2. Select issue with Up / Down / Enter (arrow-key menu)
#   3. Create branch from selected issue
#   4. Create empty commit
#   5. Push branch
#   6. Create Draft PR and link it to the issue
#
# Compatibility:
#   - VS Code integrated terminal (pwsh 7+)
#   - Windows Terminal / ConEmu / plain pwsh
#   - Uses $host.UI.RawUI.ReadKey + ANSI escapes for rendering
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# UTF-8 configuration
# ------------------------------------------------------------
$env:LANG = "C.UTF-8"
$env:LC_ALL = "C.UTF-8"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Enable ANSI / VT100 sequences (pwsh 7+ / Windows 10+)
try { $PSStyle.OutputRendering = 'Ansi' } catch {}

# ------------------------------------------------------------
# ANSI escape helpers
# ------------------------------------------------------------
$ESC = [char]27

function Write-Ansi {
    param ([string]$Text)
    [Console]::Write($Text)
}

function Move-CursorUp {
    param ([int]$Lines)
    if ($Lines -gt 0) {
        Write-Ansi "$ESC[$($Lines)A"
    }
}

function Clear-Below {
    Write-Ansi "$ESC[J"
}

function Do-CarriageReturn {
    Write-Ansi "`r"
}

# ------------------------------------------------------------
# Helper: restore cursor visibility
# ------------------------------------------------------------
function Restore-Cursor {
    try { [Console]::CursorVisible = $true } catch {}
}

# ------------------------------------------------------------
# Helper: run command and check exit code
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

# ------------------------------------------------------------
# Helper: read a single key (works in VS Code terminal)
# ------------------------------------------------------------
function Read-SingleKey {
    $opts = [System.Management.Automation.Host.ReadKeyOptions]::NoEcho -bor [System.Management.Automation.Host.ReadKeyOptions]::IncludeKeyDown
    return $host.UI.RawUI.ReadKey($opts)
}

# ------------------------------------------------------------
# Helper: render the issue list menu
# ------------------------------------------------------------
function Render-Menu {
    param (
        [array]$Issues,
        [int]$SelectedIndex,
        [int]$PageSize,
        [int]$ScrollOffset
    )

    $lines = @()
    $lines += "$ESC[36mGit: Create PR$ESC[0m"
    $lines += ""
    $lines += "$ESC[36mChon Issue:$ESC[0m"
    $lines += ""

    $visibleEnd = [Math]::Min($ScrollOffset + $PageSize, $Issues.Count)

    if ($ScrollOffset -gt 0) {
        $lines += "$ESC[90m  ... ($ScrollOffset issue phia tren)$ESC[0m"
    }

    for ($i = $ScrollOffset; $i -lt $visibleEnd; $i++) {
        $num = $Issues[$i].number
        $title = $Issues[$i].title
        $maxLen = 80
        if ($title.Length -gt $maxLen) {
            $title = $title.Substring(0, $maxLen - 3) + "..."
        }
        if ($i -eq $SelectedIndex) {
            $lines += "$ESC[32m> #$num - $title$ESC[0m"
        }
        else {
            $lines += "  #$num - $title"
        }
    }

    if ($visibleEnd -lt $Issues.Count) {
        $remaining = $Issues.Count - $visibleEnd
        $lines += "$ESC[90m  ... ($remaining issue phia duoi)$ESC[0m"
    }

    $lines += ""
    $lines += "$ESC[90mUp/Down: Di chuyen    Enter: Chon    Esc: Huy$ESC[0m"

    return $lines
}

try {
    # --------------------------------------------------------
    # Get issues assigned to current GitHub user
    # --------------------------------------------------------
    Write-Host "Dang tai danh sach issue cua ban..." -ForegroundColor Cyan

    $issuesJson = gh issue list --assignee "@me" --state open --limit 100 --json number,title | Out-String

    if ([string]::IsNullOrWhiteSpace($issuesJson)) {
        Write-Host "`nKhong tim thay issue nao duoc giao cho ban." -ForegroundColor Yellow
        exit 0
    }

    $issues = @(ConvertFrom-Json $issuesJson | Sort-Object number -Descending)

    if ($issues.Count -eq 0) {
        Write-Host "`nKhong tim thay issue nao duoc giao cho ban." -ForegroundColor Yellow
        exit 0
    }

    # --------------------------------------------------------
    # Interactive issue selection (arrow-key menu)
    # --------------------------------------------------------
    $selectedIndex = 0
    $done = $false
    $pageSize = [Math]::Min(15, $issues.Count)
    $scrollOffset = 0
    $lastRenderLineCount = 0

    try { [Console]::CursorVisible = $false } catch {}

    # Clear the "loading" message
    Write-Ansi "`r$ESC[2K"
    Move-CursorUp 1
    Write-Ansi "$ESC[2K"

    while (-not $done) {
        # Move cursor back to top of menu area
        if ($lastRenderLineCount -gt 0) {
            Move-CursorUp $lastRenderLineCount
            Do-CarriageReturn
            Clear-Below
        }

        # Ensure selectedIndex is visible
        if ($selectedIndex -lt $scrollOffset) {
            $scrollOffset = $selectedIndex
        }
        elseif ($selectedIndex -ge ($scrollOffset + $pageSize)) {
            $scrollOffset = $selectedIndex - $pageSize + 1
        }

        # Render menu
        $menuLines = Render-Menu -Issues $issues -SelectedIndex $selectedIndex -PageSize $pageSize -ScrollOffset $scrollOffset

        foreach ($line in $menuLines) {
            [Console]::WriteLine($line)
        }

        $lastRenderLineCount = $menuLines.Count

        # Read key
        $keyInfo = Read-SingleKey

        switch ($keyInfo.VirtualKeyCode) {
            38 {
                # UpArrow
                if ($selectedIndex -gt 0) { $selectedIndex-- }
            }
            40 {
                # DownArrow
                if ($selectedIndex -lt ($issues.Count - 1)) { $selectedIndex++ }
            }
            13 {
                # Enter
                $done = $true
            }
            27 {
                # Escape
                Restore-Cursor
                Move-CursorUp $lastRenderLineCount
                Do-CarriageReturn
                Clear-Below
                Write-Host "Da huy." -ForegroundColor Yellow
                exit 0
            }
        }
    }

    Restore-Cursor

    # Clear menu area
    Move-CursorUp $lastRenderLineCount
    Do-CarriageReturn
    Clear-Below

    # --------------------------------------------------------
    # Selected issue
    # --------------------------------------------------------
    $selectedIssue = $issues[$selectedIndex]
    $issueId = $selectedIssue.number
    $issueTitle = $selectedIssue.title

    Write-Host "Issue duoc chon:" -ForegroundColor Cyan
    Write-Host "#$issueId - $issueTitle`n" -ForegroundColor Green

    # --------------------------------------------------------
    # Create branch from issue
    # --------------------------------------------------------
    Write-Host "Dang tao branch cho Issue #$issueId..." -ForegroundColor Cyan

    Invoke-CommandChecked "gh" @("issue", "develop", "$issueId", "-c")

    # --------------------------------------------------------
    # Get current branch
    # --------------------------------------------------------
    $branchName = (git branch --show-current).Trim()

    if ([string]::IsNullOrWhiteSpace($branchName)) {
        throw "Khong xac dinh duoc branch hien tai."
    }

    Write-Host "Branch: $branchName" -ForegroundColor Green

    # --------------------------------------------------------
    # Create empty commit
    # --------------------------------------------------------
    Write-Host "`nDang tao commit..." -ForegroundColor Cyan

    Invoke-CommandChecked "git" @("commit", "--allow-empty", "-m", "chore: start issue #$issueId")

    # --------------------------------------------------------
    # Push branch
    # --------------------------------------------------------
    Write-Host "`nDang push branch len remote..." -ForegroundColor Cyan

    Invoke-CommandChecked "git" @("push", "-u", "origin", "HEAD")

    # --------------------------------------------------------
    # Create Draft PR
    # --------------------------------------------------------
    Write-Host "`nDang tao Draft PR..." -ForegroundColor Cyan

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

    gh pr create --draft --title "$branchName" --body "$prBody"

    if ($LASTEXITCODE -ne 0) {
        throw "Khong the tao Pull Request."
    }

    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Draft PR da duoc tao thanh cong!" -ForegroundColor Green
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