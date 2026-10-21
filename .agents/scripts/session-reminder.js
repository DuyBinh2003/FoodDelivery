#!/usr/bin/env node
/**
 * .agents/scripts/session-reminder.js
 * Hook: PreInvocation — nhắc agent đọc skills cần thiết đầu mỗi session.
 *
 * Input  (stdin): JSON với common fields (conversationId, workspacePaths, ...)
 * Output (stdout): JSON { injectSteps: [...] }
 */

const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8') || '{}');

// Chỉ inject reminder ở invocation đầu tiên (invocationNum === 1)
if (input.invocationNum !== 1) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const reminder = `[SESSION START REMINDER]
Bạn đang làm việc trên dự án FoodDelivery. Trước khi bắt đầu bất kỳ task nào:
1. Đọc AGENTS.md ở root để nắm quy trình vòng tròn khép kín (Closed-Loop Pipeline).
2. Kích hoạt skill 'general-project-policy' cho mọi task.
3. Kích hoạt skill tương ứng: nestjs-patterns (Backend), nextjs-patterns + ui-ux-pro-max (Frontend), database-schema-policy (DB).
4. Tuân thủ tuyệt đối: cấm any, cấm nuốt exception, cấm fallback ngầm, import tuyệt đối (@/).`;

process.stdout.write(JSON.stringify({
  injectSteps: [
    { ephemeralMessage: reminder }
  ]
}));
