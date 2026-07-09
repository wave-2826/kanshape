// same as vite config but with testing config
import { defineConfig } from "vitest/config";
import { playwright } from '@vitest/browser-playwright'

import { sveltekit } from "@sveltejs/kit/vite";
// @ts-ignore
import fs from "fs";

// detect if we're running inside docker and set the backend accordingly
const pocketbase_url = fs.existsSync("/.dockerenv")
    ? "http://pb:8090" // docker-to-docker
    : "http://127.0.0.1:8090"; // localhost-to-localhost

export default defineConfig({
    plugins: [sveltekit()],
    build: {
        target: "esnext"
    },
    server: {
        allowedHosts: true,
        proxy: {
            // proxy "/api" and "/_" to pocketbase_url
            "/api": {
                target: pocketbase_url,
                changeOrigin: true,
                ws: true
            },
            "/_": pocketbase_url,
        },
    },
    test: {
        projects: [
            {
                test: {
                    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
                    exclude: ["tests/**/*.browser.test.ts", "src/**/*.browser.test.ts"],
                    name: "node",
                }
            },
            {
                test: {
                    include: ["tests/**/*.browser.test.ts", "src/**/*.browser.test.ts"],
                    name: "browser",
                    browser: {
                        provider: playwright(),
                        enabled: true,
                        instances: [{
                            browser: 'chromium',
                            headless: true,
                            viewport: { width: 1280, height: 768 },
                            execArgv: ['--no-sandbox']
                        }]
                    },
                }
            }
        ],
    }
});