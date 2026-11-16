import express from 'express';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DIST_DIR = path.resolve(__dirname, 'dist');
const FARO_PUBLIC_PATH = path.join(PUBLIC_DIR, 'faro.glb');
const FARO_DIST_PATH = path.join(DIST_DIR, 'faro.glb');

function sanitizeUploadId(id: string): string | null {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id) ? id : null;
}

async function inspectGlbFile(filePath: string): Promise<{ valid: boolean; size: number; declaredLength: number | null }> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size < 12) {
      return { valid: false, size: stat.size, declaredLength: null };
    }
    const handle = await fs.open(filePath, 'r');
    try {
      const header = Buffer.alloc(12);
      await handle.read(header, 0, 12, 0);
      const magic = header.readUInt32LE(0);
      if (magic === 0x46546c67) {
        const declaredLength = header.readUInt32LE(8);
        return {
          valid: declaredLength === stat.size,
          size: stat.size,
          declaredLength,
        };
      }
      // Also allow non-GLB glTF JSON if valid JSON
      return { valid: true, size: stat.size, declaredLength: null };
    } finally {
      await handle.close();
    }
  } catch {
    return { valid: false, size: 0, declaredLength: null };
  }
}

async function startServer() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const app = express();

  app.get('/api/faro-status', async (_req, res) => {
    const targetPath = existsSync(FARO_PUBLIC_PATH)
      ? FARO_PUBLIC_PATH
      : existsSync(FARO_DIST_PATH)
        ? FARO_DIST_PATH
        : FARO_PUBLIC_PATH;
    const status = await inspectGlbFile(targetPath);
    res.json(status);
  });

  app.post('/api/faro-upload/init', express.json(), async (_req, res) => {
    try {
      const uploadId = crypto.randomBytes(16).toString('hex');
      const tmpPath = path.join(PUBLIC_DIR, `.faro-upload-${uploadId}.tmp`);
      await fs.writeFile(tmpPath, Buffer.alloc(0));
      res.json({ uploadId });
    } catch (err) {
      console.error('Upload init error:', err);
      res.status(500).json({ error: 'No se pudo iniciar la subida al servidor.' });
    }
  });

  app.post(
    '/api/faro-upload/chunk',
    express.raw({ type: 'application/octet-stream', limit: '6mb' }),
    async (req, res) => {
      try {
        const rawId = String(req.headers['x-upload-id'] ?? '');
        const uploadId = sanitizeUploadId(rawId);
        if (!uploadId) {
          res.status(400).json({ error: 'ID de subida inválido.' });
          return;
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({ error: 'Fragmento vacío.' });
          return;
        }
        const tmpPath = path.join(PUBLIC_DIR, `.faro-upload-${uploadId}.tmp`);
        if (!existsSync(tmpPath)) {
          res.status(404).json({ error: 'Sesión de subida no encontrada.' });
          return;
        }
        await fs.appendFile(tmpPath, req.body);
        res.json({ ok: true, received: req.body.length });
      } catch (err) {
        console.error('Upload chunk error:', err);
        res.status(500).json({ error: 'Error al guardar fragmento en el servidor.' });
      }
    }
  );

  app.post('/api/faro-upload/finish', express.json(), async (req, res) => {
    try {
      const uploadId = sanitizeUploadId(String(req.body?.uploadId ?? ''));
      if (!uploadId) {
        res.status(400).json({ error: 'ID de subida inválido.' });
        return;
      }
      const tmpPath = path.join(PUBLIC_DIR, `.faro-upload-${uploadId}.tmp`);
      if (!existsSync(tmpPath)) {
        res.status(404).json({ error: 'Archivo temporal no encontrado.' });
        return;
      }
      const check = await inspectGlbFile(tmpPath);
      if (!check.valid) {
        await fs.unlink(tmpPath).catch(() => {});
        res.status(400).json({
          error: `El archivo recibido está incompleto (${check.size} bytes${check.declaredLength ? ` de ${check.declaredLength} esperados` : ''}).`,
        });
        return;
      }

      await fs.rename(tmpPath, FARO_PUBLIC_PATH);
      if (existsSync(DIST_DIR)) {
        await fs.copyFile(FARO_PUBLIC_PATH, FARO_DIST_PATH).catch(() => {});
      }
      res.json({ ok: true, size: check.size });
    } catch (err) {
      console.error('Upload finish error:', err);
      res.status(500).json({ error: 'Error al finalizar la subida.' });
    }
  });

  // Servir /faro.glb sin caché agresiva para reflejar siempre el archivo real
  app.get('/faro.glb', async (_req, res, next) => {
    const filePath = existsSync(FARO_PUBLIC_PATH)
      ? FARO_PUBLIC_PATH
      : existsSync(FARO_DIST_PATH)
        ? FARO_DIST_PATH
        : null;
    if (!filePath) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(filePath);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
