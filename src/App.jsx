import { useEffect, useMemo, useState } from 'react';
import config from './tagConfig.json';
import {
  buildFilename,
  buildFrontMatter,
  buildTags,
  emptyRecord,
  generateDocumentId,
  parseCsv,
  recordsToCsv,
  validateRecord,
} from './tagUtils.js';
import { deleteRecord, listRecords, replaceRecords, saveRecord, storageMode } from './storage.js';

const copyLabels = {
  filename: '复制文件名',
  frontMatter: '复制标签头',
  full: '复制完整模板',
};

export default function App() {
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState(emptyRecord);
  const [editingId, setEditingId] = useState('');
  const [filters, setFilters] = useState({ query: '', domain: '', stage: '', status: '', reviewDue: false });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    listRecords()
      .then((loaded) => {
        setRecords(loaded);
        setRecord((current) => ({
          ...current,
          documentId: generateDocumentId(loaded),
        }));
      })
      .catch((error) => setMessage(`读取记录失败：${error.message}`));
  }, []);

  const subdomainOptions = config.subdomains[record.domain] || [];
  const selectedSubdomain = subdomainOptions.find((item) => item.name === record.subdomain);
  const filename = buildFilename(record);
  const frontMatter = buildFrontMatter(record);
  const tags = buildTags(record);
  const otherCount = records.filter((item) => item.subdomain === '其他').length;

  const filteredRecords = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return records.filter((item) => {
      const matchQuery = !filters.query || `${item.title}${item.documentId}${item.note}`.toLowerCase().includes(filters.query.toLowerCase());
      const matchDomain = !filters.domain || item.domain === filters.domain;
      const matchStage = !filters.stage || item.stage === filters.stage;
      const matchStatus = !filters.status || item.status === filters.status;
      const matchReview = !filters.reviewDue || (item.reviewDate && item.reviewDate <= today);
      return matchQuery && matchDomain && matchStage && matchStatus && matchReview;
    });
  }, [records, filters]);

  function updateField(key, value) {
    setRecord((current) => {
      const next = { ...current, [key]: value };
      if (key === 'domain') {
        next.subdomain = config.subdomains[value]?.[0]?.name || '';
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateRecord(record);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const toSave = {
      ...record,
      id: editingId || record.id,
      documentId: record.documentId || generateDocumentId(records),
    };
    const saved = await saveRecord(toSave);
    const next = records.some((item) => item.id === saved.id)
      ? records.map((item) => (item.id === saved.id ? saved : item))
      : [saved, ...records];
    setRecords(next);
    setRecord({ ...emptyRecord, documentId: generateDocumentId(next) });
    setEditingId('');
    setMessage('已保存标签记录');
  }

  function startEdit(item) {
    setRecord(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function removeRecord(item) {
    await deleteRecord(item.id);
    setRecords(records.filter((recordItem) => recordItem.id !== item.id));
    setMessage('已删除记录');
  }

  async function copyText(type) {
    const content = {
      filename,
      frontMatter,
      full: `${filename}\n\n${frontMatter}`,
    }[type];
    await navigator.clipboard.writeText(content);
    setMessage(copyLabels[type]);
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const imported = file.name.endsWith('.json') ? JSON.parse(text) : parseCsv(text);
    const normalized = await replaceRecords(imported);
    setRecords(normalized);
    setRecord({ ...emptyRecord, documentId: generateDocumentId(normalized) });
    setMessage(`已导入 ${normalized.length} 条记录`);
    event.target.value = '';
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">M3 Tags</p>
            <h1>标签生成系统</h1>
          </div>
          <div className="storage-pill">{storageMode === 'supabase' ? '云端保存' : '本地保存'}</div>
        </header>

        <form className="tool-grid" onSubmit={handleSubmit}>
          <section className="panel form-panel" aria-label="新建标签">
            <div className="panel-head">
              <h2>{editingId ? '编辑标签' : '新建标签'}</h2>
              <button type="button" className="ghost-button" onClick={() => setRecord({ ...emptyRecord, documentId: generateDocumentId(records) })}>
                清空
              </button>
            </div>

            <div className="field-row two">
              <Field label="文档ID" hint="自动生成">
                <input value={record.documentId} readOnly />
              </Field>
              <Field label="文档标题" error={errors.title}>
                <input value={record.title} onChange={(event) => updateField('title', event.target.value)} placeholder="例如：2026年Q3理财规划" />
              </Field>
            </div>

            <div className="field-row three">
              <Field label="领域" error={errors.domain}>
                <select value={record.domain} onChange={(event) => updateField('domain', event.target.value)}>
                  {config.domains.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="子领域">
                <select value={record.subdomain} onChange={(event) => updateField('subdomain', event.target.value)}>
                  {subdomainOptions.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="阶段" error={errors.stage}>
                <select value={record.stage} onChange={(event) => updateField('stage', event.target.value)}>
                  {config.stages.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="field-row three">
              <Field label="要素类型">
                <select value={record.elementType} onChange={(event) => updateField('elementType', event.target.value)}>
                  <option value="">不选择</option>
                  {config.elementTypes.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="处理状态">
                <select value={record.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="">不选择</option>
                  {config.statuses.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="回顾日期">
                <input type="date" value={record.reviewDate} onChange={(event) => updateField('reviewDate', event.target.value)} />
              </Field>
            </div>

            <Field label="优先级">
              <div className="segmented">
                <button type="button" className={!record.priority ? 'active' : ''} onClick={() => updateField('priority', '')}>无</button>
                {config.priorities.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    title={item.description}
                    className={record.priority === item.name ? 'active' : ''}
                    onClick={() => updateField('priority', item.name)}
                  >
                    <span>{item.name}</span>
                    <small>{item.label}</small>
                  </button>
                ))}
              </div>
            </Field>

            <div className="field-row two">
              <Field label="下一步">
                <textarea value={record.nextAction} onChange={(event) => updateField('nextAction', event.target.value)} placeholder="写下最小可行动作" />
              </Field>
              <Field label="备注">
                <textarea value={record.note} onChange={(event) => updateField('note', event.target.value)} placeholder="交叉领域、判断依据、补充上下文" />
              </Field>
            </div>

            <button className="primary-button" type="submit">{editingId ? '保存修改' : '保存标签记录'}</button>
          </section>

          <section className="panel preview-panel" aria-label="生成结果">
            <div className="panel-head">
              <h2>实时预览</h2>
              {message && <span className="toast">{message}</span>}
            </div>

            <PreviewBlock title="标准文件名" value={filename || '填写标题后生成文件名'} onCopy={() => copyText('filename')} />
            <PreviewBlock title="Markdown 标签头" value={frontMatter} multiline onCopy={() => copyText('frontMatter')} />

            <div className="tag-line">
              {tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
            <button type="button" className="secondary-button" onClick={() => copyText('full')}>复制完整模板</button>

            {selectedSubdomain && (
              <div className="rule-box">
                <h3>{record.domain} / {selectedSubdomain.name}</h3>
                <p>{selectedSubdomain.positioning}</p>
                <dl>
                  <div><dt>示例</dt><dd>{selectedSubdomain.examples}</dd></div>
                  <div><dt>边界</dt><dd>{selectedSubdomain.boundary}</dd></div>
                </dl>
              </div>
            )}
          </section>
        </form>

        <section className="panel history-panel">
          <div className="panel-head">
            <h2>历史记录</h2>
            <div className="actions">
              <button type="button" className="ghost-button" onClick={() => download('m3-tags.json', JSON.stringify(records, null, 2), 'application/json')}>导出 JSON</button>
              <button type="button" className="ghost-button" onClick={() => download('m3-tags.csv', recordsToCsv(records), 'text/csv;charset=utf-8')}>导出 CSV</button>
              <label className="file-button">
                导入
                <input type="file" accept=".json,.csv" onChange={handleImport} />
              </label>
            </div>
          </div>

          <div className="filters">
            <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="搜索标题、ID、备注" />
            <select value={filters.domain} onChange={(event) => setFilters({ ...filters, domain: event.target.value })}>
              <option value="">全部领域</option>
              {config.domains.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
            <select value={filters.stage} onChange={(event) => setFilters({ ...filters, stage: event.target.value })}>
              <option value="">全部阶段</option>
              {config.stages.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">全部状态</option>
              {config.statuses.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
            <label className="check-filter">
              <input type="checkbox" checked={filters.reviewDue} onChange={(event) => setFilters({ ...filters, reviewDue: event.target.checked })} />
              到期回顾
            </label>
          </div>

          {otherCount >= 3 && (
            <div className="warning">“其他”已使用 {otherCount} 次，建议复盘是否需要新增或调整子领域。</div>
          )}

          <div className="record-list">
            {filteredRecords.map((item) => (
              <article className="record-card" key={item.id}>
                <div>
                  <p className="record-id">{item.documentId}</p>
                  <h3>{item.title}</h3>
                  <p>{[item.domain, item.subdomain, item.stage, item.elementType, item.status].filter(Boolean).join(' / ')}</p>
                </div>
                <div className="record-meta">
                  {item.priority && <span>{item.priority}</span>}
                  {item.reviewDate && <span>{item.reviewDate}</span>}
                  <button type="button" onClick={() => startEdit(item)}>编辑</button>
                  <button type="button" onClick={() => removeRecord(item)}>删除</button>
                </div>
              </article>
            ))}
            {!filteredRecords.length && <p className="empty-state">暂无匹配记录。</p>}
          </div>
        </section>

        <section className="rules-grid">
          {config.coverageRules.map((rule) => (
            <div className="rule-item" key={rule.rule}>
              <strong>{rule.rule}</strong>
              <span>{rule.description}</span>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}

function PreviewBlock({ title, value, multiline, onCopy }) {
  return (
    <div className="preview-block">
      <div className="preview-title">
        <span>{title}</span>
        <button type="button" onClick={onCopy}>复制</button>
      </div>
      <pre className={multiline ? 'multiline' : ''}>{value}</pre>
    </div>
  );
}
