import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const serverDir = join(process.cwd(), 'dist', 'server');
await mkdir(serverDir, { recursive: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

await writeFile(
  join(process.cwd(), 'dist', 'config.js'),
  `window.M3_TAGS_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseAnonKey }, null, 2)};\n`,
  'utf8',
);

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
