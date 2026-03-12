const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');

const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024,
  doc: 8 * 1024 * 1024,
  img: 4 * 1024 * 1024,
};
const MAX_FILE_DATA_LEN = 20_000_000; // base64/data-url in json body

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

function formatMegabytes(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function getFileTypeLabel(tipoFile) {
  if (tipoFile === 'pdf') return 'PDF';
  if (tipoFile === 'doc') return 'DOC/DOCX';
  return 'JPG/PNG';
}

function getFileSizeLimit(tipoFile) {
  return FILE_SIZE_LIMITS[tipoFile] || FILE_SIZE_LIMITS.img;
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
  const materia = String(query.materia || '').trim();
  const lim = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 80;

  const where = [];
  const params = [userId];

  if (q) {
    where.push(`(lower(Notes.title) like ? or lower(Notes.subject) like ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  if (materia) {
    where.push(`lower(trim(Notes.subject)) = lower(trim(?))`);
    params.push(materia);
  }

  params.push(lim);

  const rows = await all(
    `select
       Notes.id as id,
       Notes.userId as userId,
       Notes.title as titolo,
       Notes.subject as materia,
       Notes.fileType as tipoFile,
       Notes.createdAt as createdAt,
       coalesce(Users.nickname, Users.name, 'Studente') as autoreNome,
       case when saved.noteId is not null then 1 else 0 end as isSaved
     from Notes
     left join Users on Users.id = Notes.userId
     left join NoteBookmarks saved
       on saved.noteId = Notes.id and saved.userId = ?
     ${where.length ? `where ${where.join(' and ')}` : ''}
     order by Notes.createdAt desc
     limit ?`,
    params
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    titolo: row.titolo,
    materia: row.materia,
    tipoFile: row.tipoFile,
    autoreNome: row.autoreNome,
    tempoUpload: formatRelativeTime(row.createdAt),
    canDelete: Number(row.userId) === Number(userId),
    isSaved: !!row.isSaved,
  }));

  return mapped;
}

async function listSaved(userId, query = {}) {
  const q = String(query.cerca || '').trim().toLowerCase();
  const materia = String(query.materia || '').trim();
  const lim = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 80;

  const where = [`NoteBookmarks.userId = ?`];
  const params = [userId];

  if (q) {
    where.push(`(lower(Notes.title) like ? or lower(Notes.subject) like ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  if (materia) {
    where.push(`lower(trim(Notes.subject)) = lower(trim(?))`);
    params.push(materia);
  }

  params.push(lim);

  const rows = await all(
    `select
       Notes.id as id,
       Notes.userId as userId,
       Notes.title as titolo,
       Notes.subject as materia,
       Notes.fileType as tipoFile,
       Notes.createdAt as createdAt,
       coalesce(Users.nickname, Users.name, 'Studente') as autoreNome
     from NoteBookmarks
     inner join Notes on Notes.id = NoteBookmarks.noteId
     left join Users on Users.id = Notes.userId
     where ${where.join(' and ')}
     order by NoteBookmarks.createdAt desc
     limit ?`,
    params
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    titolo: row.titolo,
    materia: row.materia,
    tipoFile: row.tipoFile,
    autoreNome: row.autoreNome,
    tempoUpload: formatRelativeTime(row.createdAt),
    canDelete: Number(row.userId) === Number(userId),
    isSaved: true,
  }));

  return mapped;
}

async function listSubjects(userId) {
  const user = await get(
    `select facolta, corso
     from Users
     where id = ?`,
    [userId]
  );

  const faculty = String(user?.facolta || '').trim() || null;
  const course = String(user?.corso || '').trim() || null;

  if (!faculty) return { faculty: null, course, subjects: [] };

  let rows = [];
  if (course) {
    rows = await all(
      `select subjectName as subject
       from ExamSubjects
       where lower(trim(facultyName)) = lower(trim(?))
         and lower(trim(courseName)) = lower(trim(?))
       order by lower(trim(subjectName)) asc`,
      [faculty, course]
    );
  }

  if (!rows.length) {
    rows = await all(
      `select subjectName as subject
       from ExamSubjects
       where lower(trim(facultyName)) = lower(trim(?))
         and trim(coalesce(courseName, '')) = ''
       order by lower(trim(subjectName)) asc`,
      [faculty]
    );
  }

  return {
    faculty,
    course,
    subjects: rows.map((row) => String(row?.subject || '').trim()).filter(Boolean)
  };
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

  const parsedFile = parseDataUrl(fileData, mimeType);
  const actualSizeBytes = parsedFile.buffer.length || sizeBytes;
  const maxSizeBytes = getFileSizeLimit(tipoFile);
  if (actualSizeBytes > maxSizeBytes) {
    throw badRequest(
      `${getFileTypeLabel(tipoFile)} troppo grande. Massimo ${formatMegabytes(maxSizeBytes)}`
    );
  }

  const now = nowIso();

  const out = await run(
    `insert into Notes
      (userId, title, subject, fileName, fileType, mimeType, sizeBytes, fileData, createdAt, updatedAt)
     values
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, titolo, materia, fileName, tipoFile, mimeType, actualSizeBytes, fileData, now, now]
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

async function addBookmark(userId, noteId) {
  const note = await get(
    `select id, userId
     from Notes
     where id = ?`,
    [noteId]
  );

  if (!note) return { added: false, reason: 'NOT_FOUND' };
  if (Number(note.userId) === Number(userId)) {
    throw badRequest('non puoi salvare i tuoi appunti');
  }

  const now = nowIso();
  await run(
    `insert or ignore into NoteBookmarks
      (noteId, userId, createdAt)
     values
      (?, ?, ?)`,
    [noteId, userId, now]
  );

  return { added: true };
}

async function removeBookmark(userId, noteId) {
  await run(
    `delete from NoteBookmarks
     where noteId = ? and userId = ?`,
    [noteId, userId]
  );

  return { removed: true };
}

module.exports = {
  list,
  listSaved,
  listSubjects,
  create,
  getDownload,
  remove,
  addBookmark,
  removeBookmark,
};
