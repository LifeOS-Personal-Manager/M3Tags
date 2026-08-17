import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const serverDir = join(process.cwd(), 'dist', 'server');
await mkdir(serverDir, { recursive: true });

await writeFile(
  join(serverDir, 'index.js'),
  `export default {
  async fetch(request, env) {
    if (env.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response("M3 Tags static assets binding is unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
`,
  'utf8',
);
