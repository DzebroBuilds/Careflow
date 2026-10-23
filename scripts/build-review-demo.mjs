import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Build from an explicit file allowlist. Never copy env files or server routes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = await mkdtemp(join(root, '.pages-review-'));
const basePath = process.env.CAREFLOW_REVIEW_BASE_PATH || '/Careflow';
if (!/^\/[A-Za-z0-9_-]+$/.test(basePath)) throw new Error('Invalid review base path');
await mkdir(join(stage, 'src/app'), { recursive: true });
for (const name of ['src/components', 'src/lib', 'src/app/demo', 'src/app/login', 'src/app/reset-password', 'src/app/verify', 'src/app/dashboard', 'public']) {
  await cp(join(root, name), join(stage, name), { recursive: true });
}
for (const name of ['package.json', 'tsconfig.json', 'src/app/globals.css', 'src/app/careflow-vertex.css', 'src/app/favicon.ico']) {
  await cp(join(root, name), join(stage, name));
}
const layout = (await readFile(join(root, 'src/app/layout.tsx'), 'utf8'))
  .replace('{children}</body>', '<aside style={{background:"#e8f0ea",color:"#234d3b",padding:"10px 20px",textAlign:"center",fontSize:14}}>CareFlow review demo · Fictional data only · Sample edits stay in this browser · Private test accounts use Supabase · AI assistants are prototypes</aside>{children}</body>');
await writeFile(join(stage, 'src/app/layout.tsx'), layout);
const page = await readFile(join(root, 'src/app/page.tsx'), 'utf8');
await writeFile(join(stage, 'src/app/page.tsx'), page);
await mkdir(join(stage, 'src/app/setup'), { recursive: true });
await writeFile(join(stage, 'src/app/setup/page.tsx'), `import Link from 'next/link';
export default function ReviewInfo(){return <main className="cf-gate"><section className="cf-panel max-w-xl"><p className="cf-eyebrow">CAREFLOW / PRODUCT PREVIEW</p><h1 className="text-3xl mt-4">Explore the sample workspace</h1><p className="mt-4">This public preview uses fictional examples only. Changes are saved in your own browser. The sample dashboard saves edits in your browser. Private test accounts use Supabase and fictional data only. Live AI agents are not enabled.</p><p className="mt-4">Try creating a sample record, filtering the review queue, approving a record, and preparing a Weekly owner review. Use Access & settings to reset your sample edits.</p><Link className="cf-primary mt-6" href="/demo">Open the demo</Link></section></main>}`);
// Explicit publishable-only test configuration; never copy local env files or enable real data.
const supabase = `import { createClient } from '@supabase/supabase-js';
import { reviewAuth } from './review-auth';
import { authStorage, authStorageKey } from './auth-storage';
export const configured = reviewAuth.enabled;
export const productionEnabled = reviewAuth.enabled;
export const sampleDataOnly = true;
export const authReturnType = typeof window === 'undefined' ? null : new URLSearchParams(window.location.hash.slice(1)).get('type');
export const supabase = configured ? createClient(reviewAuth.url, reviewAuth.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:authStorageKey,storage:typeof window==='undefined'?undefined:authStorage}}) : null;`;
await writeFile(join(stage, 'src/lib/supabase.ts'), supabase);
await writeFile(join(stage, 'next.config.mjs'), `export default {outputFileTracingRoot:process.cwd(),output:'export',env:{NEXT_PUBLIC_CAREFLOW_BASE_PATH:${JSON.stringify(basePath)}},basePath:${JSON.stringify(basePath)},trailingSlash:true,images:{unoptimized:true},reactCompiler:true,experimental:{cpus:1,webpackBuildWorker:false,staticGenerationMaxConcurrency:1}};`);
const result = spawnSync(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], { cwd: stage, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
await writeFile(join(stage, 'out/.nojekyll'), '');
await writeFile(join(root, '.pages-review-output'), join(stage, 'out'));
console.log(`Review export: ${join(stage, 'out')}`);
