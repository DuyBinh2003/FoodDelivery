#!/usr/bin/env node
/**
 * .agents/scripts/remind-ci-gate.js
 * Hook: PostToolUse (write_to_file | replace_file_content | multi_replace_file_content)
 * Nhắc agent chạy Local CI Gate sau khi ghi/sửa file source code.
 *
 * Output (stdout): JSON {} (PostToolUse không cần output gì thêm)
 */

// PostToolUse chỉ cần trả về {}
process.stdout.write(JSON.stringify({}));
