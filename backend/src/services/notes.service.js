const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

const MAX_FILE_DATA_LEN = 8_000_000; // base64/data-url in json body

function badRequest(message) {
  const err = new Error(message);
  err.code = 'BAD_REQUEST';
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.code = 'FORBIDDEN';
  return err;
}

function inferFileType({ tipoFile, fileName = '', mimeType = '' }) {
  if (tipoFile === 'pdf' || tipoFile === 'doc' || tipoFile === 'img') {
    return tipoFile;
  }

  const lowerName = String(fileName).toLowerCase();
  const lowerMime = String(mimeType).toLowerCase();

  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return 'pdf';
  if (
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument')
  ) {
    return 'doc';
  }

  return 'img';
}

function formatRelativeTime(isoDate) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'adesso';

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMin < 60) return `${diffMin} min fa`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h fa`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} g fa`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} mesi fa`;
}

async function list(userId, query = {}) {
  const q = String(query.cerca || '').trim().toLowerCase();
  const lim = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 80;

  const rows = await all(
    `select
       id,
       userId,
       title as titolo,
       subject as materia,
       fileType as tipoFile,
       createdAt
     from Notes
     order by createdAt desc
     limit ?`,
    [lim]
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    titolo: row.titolo,
    materia: row.materia,
    tipoFile: row.tipoFile,
    tempoUpload: formatRelativeTime(row.createdAt),
    canDelete: Number(row.userId) === Number(userId),
  }));

  if (!q) return mapped;

  return mapped.filter(
    (row) =>
      row.titolo.toLowerCase().includes(q) ||
      row.materia.toLowerCase().includes(q)
  );
}

async function create(userId, body = {}) {
  const titolo = String(body.titolo || '').trim();
  const materia = String(body.materia || '').trim();
  const fileName = String(body.fileName || '').trim();
  const mimeType = body.mimeType ? String(body.mimeType).trim() : null;
  const fileData = String(body.fileData || '').trim();
  const sizeBytes = Number(body.sizeBytes || 0);
  const tipoFile = inferFileType({
    tipoFile: body.tipoFile,
    fileName,
    mimeType,
  });

  if (!titolo) throw badRequest('titolo obbligatorio');
  if (!materia) throw badRequest('materia obbligatoria');
  if (!fileName) throw badRequest('nome file obbligatorio');
  if (!fileData) throw badRequest('contenuto file obbligatorio');
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw badRequest('dimensione file non valida');
  }
  if (fileData.length > MAX_FILE_DATA_LEN) {
    throw badRequest('file troppo grande');
  }

  const now = nowIso();

  const out = await run(
    `insert into Notes
      (userId, title, subject, fileName, fileType, mimeType, sizeBytes, fileData, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, titolo, materia, fileName, tipoFile, mimeType, sizeBytes, fileData, now, now]
  );

  return { id: out.lastID };
}

function parseDataUrl(fileData, fallbackMimeType) {
  const raw = String(fileData || '');
  const trimmed = raw.trim();

  // default: assume base64 payload
  let mimeType = fallbackMimeType || 'application/octet-stream';
  let base64 = trimmed;

  if (trimmed.startsWith('data:')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex > 0) {
      const meta = trimmed.slice(5, commaIndex); // after "data:"
      base64 = trimmed.slice(commaIndex + 1);
      const mime = meta.split(';')[0];
      if (mime) mimeType = mime;
    }
  }

  // Supports data url body that could be percent-encoded
  try {
    base64 = decodeURIComponent(base64);
  } catch {
    // ignore decode errors and use raw base64
  }

  return { mimeType, buffer: Buffer.from(base64, 'base64') };
}

async function getDownload(noteId) {
  const row = await get(
    `select id, fileName, mimeType, fileData
     from Notes
     where id = ?`,
    [noteId]
  );
  if (!row) return null;

  const parsed = parseDataUrl(row.fileData, row.mimeType);
  return {
    id: row.id,
    fileName: row.fileName || `appunto-${row.id}`,
    mimeType: parsed.mimeType || 'application/octet-stream',
    buffer: parsed.buffer,
  };
}

async function remove(userId, noteId) {
  const current = await get(
    `select id, userId
     from Notes
     where id = ?`,
    [noteId]
  );

  if (!current) return { removed: false, reason: 'NOT_FOUND' };
  if (Number(current.userId) !== Number(userId)) {
    throw forbidden('puoi eliminare solo i tuoi appunti');
  }

  await run(`delete from Notes where id = ?`, [noteId]);
  return { removed: true };
}

module.exports = { list, create, getDownload, remove };
