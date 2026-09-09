'use client';

import React, { useState, useMemo } from 'react';
import docsData from '../data/docs_data.json';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Layers,
  Shield,
  Zap,
  Terminal,
  FileText,
  Cpu,
  Boxes
} from 'lucide-react';

interface Article {
  slug: string;
  group: string;
  title: string;
  description: string;
  content: string;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'Overview': <BookOpen size={16} />,
  'Payment Modalities': <Zap size={16} />,
  'Web & Server Integrations': <Layers size={16} />,
  'Agent Framework Adapters': <Boxes size={16} />,
  'Soroban Contracts & Gas': <Cpu size={16} />,
  'Reference Applications': <Terminal size={16} />,
  'Tooling & Errors': <Shield size={16} />,
};

export function DocumentationViewer() {
  const articles: Article[] = docsData as Article[];
  const [selectedSlug, setSelectedSlug] = useState<string>('introduction');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  const groupedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    for (const article of filteredArticles) {
      if (!groups[article.group]) {
        groups[article.group] = [];
      }
      groups[article.group].push(article);
    }
    return groups;
  }, [filteredArticles]);

  const currentArticleIndex = articles.findIndex((a) => a.slug === selectedSlug);
  const currentArticle = articles[currentArticleIndex] || articles[0];
  const prevArticle = currentArticleIndex > 0 ? articles[currentArticleIndex - 1] : null;
  const nextArticle = currentArticleIndex < articles.length - 1 ? articles[currentArticleIndex + 1] : null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: number) => {
      if (tableRows.length === 0) return null;
      const headers = tableRows[0];
      const rows = tableRows.slice(1);
      const tableElem = (
        <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '2px solid var(--border)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return tableElem;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          if (inTable) elements.push(flushTable(i));
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          const codeText = codeLines.join('\n');
          const codeId = `code-${i}`;
          elements.push(
            <div key={codeId} style={{
              margin: '20px 0',
              borderRadius: 8,
              backgroundColor: '#0a0d14',
              border: '1px solid var(--border)',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 14px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)'
              }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {codeLanguage || 'text'}
                </span>
                <button
                  onClick={() => handleCopy(codeText, codeId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedCode === codeId ? 'var(--success)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12
                  }}
                >
                  {copiedCode === codeId ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode === codeId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre style={{
                padding: '16px',
                overflowX: 'auto',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#e6edf3',
                margin: 0
              }}>
                <code>{codeText}</code>
              </pre>
            </div>
          );
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (line.startsWith('|') && line.endsWith('|')) {
        if (!line.includes('---')) {
          const cells = line.slice(1, -1).split('|');
          tableRows.push(cells);
          inTable = true;
        }
        continue;
      } else if (inTable) {
        elements.push(flushTable(i));
      }

      if (line.startsWith('> [!NOTE]') || line.startsWith('> [!IMPORTANT]') || line.startsWith('> [!TIP]')) {
        const type = line.includes('NOTE') ? 'NOTE' : line.includes('TIP') ? 'TIP' : 'IMPORTANT';
        const color = type === 'TIP' ? 'var(--success)' : type === 'NOTE' ? 'var(--accent-stellar)' : 'var(--warning)';
        const textLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && lines[j].startsWith('>')) {
          textLines.push(lines[j].replace(/^>\s?/, ''));
          j++;
        }
        i = j - 1;
        elements.push(
          <div key={`callout-${i}`} style={{
            margin: '20px 0',
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: 'rgba(62, 123, 250, 0.08)',
            borderLeft: `4px solid ${color}`,
            border: `1px solid rgba(255,255,255,0.08)`
          }}>
            <strong style={{ color, fontSize: 13, display: 'block', marginBottom: 6 }}>
              {type}
            </strong>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {textLines.join(' ')}
            </div>
          </div>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} style={{ fontSize: 18, fontWeight: 600, margin: '28px 0 12px 0', color: 'var(--text-primary)' }}>
            {line.slice(4)}
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} style={{ fontSize: 22, fontWeight: 700, margin: '36px 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: 8, color: 'var(--text-primary)' }}>
            {line.slice(3)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} style={{ fontSize: 28, fontWeight: 800, margin: '24px 0 16px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {line.slice(2)}
          </h1>
        );
        continue;
      }

      if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li key={`li-${i}`} style={{ marginLeft: 20, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
        continue;
      }

      const numMatch = line.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 8, marginLeft: 8 }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 14 }}>{numMatch[1]}.</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              {renderInlineMarkdown(numMatch[2])}
            </span>
          </div>
        );
        continue;
      }

      if (!line.trim()) {
        continue;
      }

      elements.push(
        <p key={`p-${i}`} style={{ margin: '14px 0', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    if (inTable) {
      elements.push(flushTable(lines.length));
    }

    return elements;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={match.index} style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: 'var(--accent-cyan)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 13
          }}>
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('[') && token.includes('](')) {
        const linkText = token.slice(1, token.indexOf(']('));
        const linkUrl = token.slice(token.indexOf('](') + 2, -1);
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target={linkUrl.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-stellar)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {linkText}
          </a>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 73px)', width: '100%' }}>
      <aside style={{
        width: 320,
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 73px)',
        position: 'sticky',
        top: 73
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedArticles).map(([groupName, groupList]) => (
            <div key={groupName}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                paddingLeft: 8
              }}>
                {GROUP_ICONS[groupName] || <FileText size={14} />}
                <span>{groupName}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {groupList.map((art) => {
                  const isSelected = art.slug === selectedSlug;
                  return (
                    <button
                      key={art.slug}
                      onClick={() => setSelectedSlug(art.slug)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                        border: isSelected ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {art.title}
                      </span>
                      {isSelected && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main style={{
        flex: 1,
        maxWidth: 960,
        margin: '0 auto',
        padding: '40px 36px 80px 36px',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Docs</span>
            <ChevronRight size={12} />
            <span>{currentArticle.group}</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{currentArticle.title}</span>
          </div>

          <a
            href={`https://github.com/stellar-x402-mcp/docs/blob/main/${currentArticle.slug}.mdx`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-secondary)',
              fontSize: 12
            }}
          >
            <span>Edit on GitHub</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            {currentArticle.title}
          </h1>
          {currentArticle.description && (
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {currentArticle.description}
            </p>
          )}
        </div>

        <div style={{ color: 'var(--text-secondary)' }}>
          {renderMarkdown(currentArticle.content)}
        </div>

        <div style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          {prevArticle ? (
            <button
              onClick={() => setSelectedSlug(prevArticle.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <ChevronLeft size={18} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Previous</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{prevArticle.title}</div>
              </div>
            </button>
          ) : <div />}

          {nextArticle && (
            <button
              onClick={() => setSelectedSlug(nextArticle.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'right'
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Next</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{nextArticle.title}</div>
              </div>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
