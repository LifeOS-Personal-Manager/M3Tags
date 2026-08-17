import { describe, expect, it } from 'vitest';
import {
  buildFilename,
  buildFrontMatter,
  generateDocumentId,
  parseCsv,
  recordsToCsv,
  validateRecord,
} from './tagUtils.js';

const date = new Date('2026-08-17T10:00:00+08:00');

describe('tag utilities', () => {
  it('generates an incrementing document id for the current day', () => {
    expect(generateDocumentId([{ documentId: 'WJ2026081701' }], date)).toBe('WJ2026081702');
  });

  it('builds a safe filename without priority emoji', () => {
    const filename = buildFilename({
      title: '2026年Q3理财规划:草稿?',
      domain: '生活统筹',
      subdomain: '资产财务',
      stage: '计划',
      elementType: '计划方案',
      priority: '🔥',
    }, date);
    expect(filename).toBe('20260817_生活统筹-资产财务_计划_计划方案_2026年Q3理财规划草稿');
  });

  it('creates markdown front matter with core tags', () => {
    const frontMatter = buildFrontMatter({
      documentId: 'WJ2026081701',
      title: '个人标签系统设计',
      domain: '系统控制',
      subdomain: '信息档案管理',
      stage: '项目',
      elementType: '模板工具',
      status: '进行中',
      priority: '⭐',
      reviewDate: '2026-08-31',
    });
    expect(frontMatter).toContain('documentId: WJ2026081701');
    expect(frontMatter).toContain('  - 信息档案管理');
  });

  it('validates required fields', () => {
    expect(validateRecord({ title: '', domain: '', stage: '' })).toEqual({
      title: '请输入文档标题',
      domain: '请选择领域',
      stage: '请选择阶段',
    });
  });

  it('round-trips csv export and import', () => {
    const rows = parseCsv(recordsToCsv([{ documentId: 'WJ1', title: 'A,B', domain: '系统控制' }]));
    expect(rows[0].title).toBe('A,B');
  });
});
