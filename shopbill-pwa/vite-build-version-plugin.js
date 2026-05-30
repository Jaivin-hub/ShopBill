import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

/** Writes public/version.json and injects __APP_BUILD_VERSION__ for in-app update detection. */
export default function buildVersionPlugin() {
  let version = '';

  const versionPayload = () => ({
    version,
    builtAt: new Date().toISOString(),
  });

  const writeVersionFile = (root, subdir = 'public') => {
    const dir = resolve(root, subdir);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      /* exists */
    }
    writeFileSync(resolve(dir, 'version.json'), JSON.stringify(versionPayload()));
  };

  return {
    name: 'pocketpos-build-version',
    config(_config, { command }) {
      version = `${command === 'build' ? 'b' : 'd'}-${Date.now().toString(36)}`;
      return {
        define: {
          __APP_BUILD_VERSION__: JSON.stringify(version),
        },
      };
    },
    buildStart() {
      writeVersionFile(process.cwd(), 'public');
    },
    closeBundle() {
      writeVersionFile(process.cwd(), 'dist');
    },
    configureServer(server) {
      writeVersionFile(server.config.root, 'public');
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/version.json') return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.end(JSON.stringify(versionPayload()));
      });
    },
  };
}
