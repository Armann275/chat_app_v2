import path from 'node:path';
import fs from 'node:fs';
import * as attachmentService from '../services/attachment.service.js';
import * as attachmentRepo from '../repositories/attachment.repository.js';
import { NotFoundError } from '../errors/errors.js';

const UPLOAD_DIR = path.resolve('uploads');

export async function upload(req, res) {
  if (!req.file) {
    res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'No file uploaded (field "file")' });
    return;
  }
  const urlPath = `/uploads/files/${req.file.filename}`;
  const dto = await attachmentService.uploadFile(req.user.id, {
    mime: req.file.mimetype,
    size: req.file.size,
    originalName: req.file.originalname,
    urlPath,
    width: req.body.width ? Number(req.body.width) : undefined,
    height: req.body.height ? Number(req.body.height) : undefined,
    durationSeconds: req.body.durationSeconds ? Number(req.body.durationSeconds) : undefined,
    waveformPeaks: req.body.waveformPeaks ? JSON.parse(req.body.waveformPeaks) : undefined,
  });
  res.status(201).json({ success: true, data: { attachment: dto } });
}

export async function serve(req, res) {
  const filename = req.params.filename;
  if (!filename || filename.includes('..') || filename.includes('/')) {
    throw new NotFoundError('File not found');
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  let stats;
  try {
    stats = await fs.promises.stat(filePath);
  } catch {
    throw new NotFoundError('File not found');
  }

  const urlPath = `/uploads/files/${filename}`;
  const row = await attachmentRepo.getByUrl(urlPath);
  const contentType = row?.mime ?? 'application/octet-stream';

  // Stream manually so the Content-Type from the DB isn't overwritten by
  // Express's send library (which always derives Content-Type from the file
  // extension — e.g. .webm voice notes get labeled video/webm and break
  // <audio> playback).
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stats.size - 1;
    if (start >= stats.size || end >= stats.size || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${stats.size}`);
      res.end();
      return;
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
    res.setHeader('Content-Length', end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', stats.size);
  fs.createReadStream(filePath).pipe(res);
}
