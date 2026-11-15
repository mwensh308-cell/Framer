// Builds the Arabic site (web/) and assembles public/: site at the root, admin dashboard at /admin.
import { execSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';

execSync('npm --prefix web run build', { stdio: 'inherit' });
rmSync('public', { recursive: true, force: true });
cpSync('web/dist', 'public', { recursive: true });
cpSync('admin', 'public/admin', { recursive: true });
console.log('public/ ready');
