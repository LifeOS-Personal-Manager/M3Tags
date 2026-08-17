export const emptyRecord = {
  documentId: '',
  title: '',
  domain: '生活统筹',
  subdomain: '日常事务',
  stage: '收集',
  elementType: '',
  status: '待处理',
  priority: '',
  nextAction: '',
  reviewDate: '',
  note: '',
};

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function generateDocumentId(records, date = new Date()) {
  const day = todayKey(date);
  const maxSeq = records
    .map((record) => record.documentId || '')
    .filter((id) => id.startsWith(`WJ${day}`))
    .map((id) => Number(id.slice(-2)))
    .filter((num) => Number.isFinite(num))
    .reduce((max, num) => Math.max(max, num), 0);

  return `WJ${day}${String(maxSeq + 1).padStart(2, '0')}`;
}

export function sanitizeFilenamePart(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|#%{}$!'@+`=]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 80);
}

export function buildTags(record) {
  return [
    record.domain,
    record.subdomain,
    record.stage,
    record.elementType,
    record.status,
  ].filter(Boolean);
}

export function buildFilename(record, date = new Date()) {
  const day = todayKey(date);
  const domainPart = [record.domain, record.subdomain].filter(Boolean).join('-');
  const parts = [
    day,
    domainPart,
    record.stage,
    record.elementType,
    record.title,
  ].filter(Boolean);

  return parts.map(sanitizeFilenamePart).filter(Boolean).join('_');
}

export function buildFrontMatter(record) {
  const tags = buildTags(record);
  const lines = [
    '---',
    `documentId: ${record.documentId || ''}`,
    `title: "${escapeYaml(record.title)}"`,
    `domain: ${record.domain || ''}`,
    `subdomain: ${record.subdomain || ''}`,
    `stage: ${record.stage || ''}`,
    record.elementType ? `elementType: ${record.elementType}` : '',
    record.status ? `status: ${record.status}` : '',
    record.priority ? `priority: "${record.priority}"` : '',
    record.reviewDate ? `reviewDate: ${record.reviewDate}` : '',
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
    record.nextAction ? `nextAction: "${escapeYaml(record.nextAction)}"` : '',
    record.note ? `note: "${escapeYaml(record.note)}"` : '',
    '---',
  ].filter((line) => line !== '');

  return lines.join('\n');
}

export function escapeYaml(value) {
  return String(value || '').replace(/"/g, '\\"');
}

export function validateRecord(record) {
  const errors = {};
  if (!record.title.trim()) errors.title = '请输入文档标题';
  if (!record.domain) errors.domain = '请选择领域';
  if (!record.stage) errors.stage = '请选择阶段';
  return errors;
}

export function toStorageRecord(record) {
  return {
    document_id: record.documentId,
    title: record.title,
    domain: record.domain,
    subdomain: record.subdomain,
    stage: record.stage,
    element_type: record.elementType,
    status: record.status,
    priority: record.priority,
    next_action: record.nextAction,
    review_date: record.reviewDate || null,
    note: record.note,
  };
}

export function fromStorageRecord(record) {
  return {
    id: record.id || record.document_id || record.documentId,
    documentId: record.document_id || record.documentId || '',
    title: record.title || '',
    domain: record.domain || '',
    subdomain: record.subdomain || '',
    stage: record.stage || '',
    elementType: record.element_type || record.elementType || '',
    status: record.status || '',
    priority: record.priority || '',
    nextAction: record.next_action || record.nextAction || '',
    reviewDate: record.review_date || record.reviewDate || '',
    note: record.note || '',
    createdAt: record.created_at || record.createdAt || '',
    updatedAt: record.updated_at || record.updatedAt || '',
  };
}

export function recordsToCsv(records) {
  const headers = [
    'documentId',
    'title',
    'domain',
    'subdomain',
    'stage',
    'elementType',
    'status',
    'priority',
    'nextAction',
    'reviewDate',
    'note',
  ];
  const rows = records.map((record) =>
    headers.map((header) => csvCell(record[header] || '')).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function csvCell(value) {
  const text = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${text}"` : text;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    headers.reduce((record, header, index) => {
      record[header] = dataRow[index] || '';
      return record;
    }, {}),
  );
}
