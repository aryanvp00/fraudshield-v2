const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { guard } = require('../middleware/auth');

const ML_DIR = path.join(__dirname, '../../ml');
const PYTHON = process.env.PYTHON_PATH || 'python3';
fs.mkdirSync(path.join(ML_DIR, 'uploads'), { recursive: true });
const upload = multer({ dest: path.join(ML_DIR, 'uploads/') });

// GET /api/model/metadata
router.get('/metadata', (req, res) => {
  const metaPath = path.join(ML_DIR, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Model not trained yet. Please train first.' });
  }
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  res.json(metadata);
});

// GET /api/model/status
router.get('/status', (req, res) => {
  const modelExists = fs.existsSync(path.join(ML_DIR, 'model.pkl'));
  res.json({ trained: modelExists });
});

// POST /api/model/train — upload CSV and train
router.post('/train', guard('admin'), upload.single('dataset'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const csvPath = req.file.path;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const py = spawn(PYTHON, [path.join(ML_DIR, 'train.py'), csvPath]);

  py.stdout.on('data', d => {
    const lines = d.toString().split('\n').filter(Boolean);
    lines.forEach(line => res.write(`data: ${line}\n\n`));
  });

  py.stderr.on('data', d => {
    res.write(`data: [LOG] ${d.toString().trim()}\n\n`);
  });

  py.on('close', code => {
    if (code === 0) {
      res.write(`data: TRAINING_COMPLETE\n\n`);
    } else {
      res.write(`data: TRAINING_FAILED\n\n`);
    }
    try { fs.unlinkSync(csvPath); } catch {}
    res.end();
  });
});

module.exports = router;
