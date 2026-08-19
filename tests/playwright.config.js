import { defineConfig } from '@playwright/test';

const isCalendarGate =
    process.env.HPMUD_CALENDAR_E2E ===
    '1';
const baseURL =
    process.env
        .HOGWARTS_E2E_BASE_URL ||
    'http://127.0.0.1:8000';

export default defineConfig({
    testMatch: isCalendarGate
        ? 'hogwarts-mud-calendar.e2e.js'
        : '*.e2e.js',
    outputDir: 'test-results/playwright',
    use: {
        baseURL,
        video: 'only-on-failure',
        screenshot: 'only-on-failure',
        ...(isCalendarGate
            ? {
                browserName:
                    'chromium',
                launchOptions: {
                    args: [
                        '--disable-breakpad',
                        '--disable-crash-reporter',
                    ],
                },
            }
            : {}),
    },
    workers: isCalendarGate
        ? 1
        : 4,
    fullyParallel:
        !isCalendarGate,
});
