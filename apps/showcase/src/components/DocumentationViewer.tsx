'use client';

import React, { useState, useMemo, useEffect } from 'react';
import docsData from '../data/docs_data.json';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';

import {
  BookOpen,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Layers,
  Shield,
  Zap,
  Terminal,
  FileText,
  Cpu,
  Boxes,
  Bot,
  Coins,
  DollarSign,
  CheckCircle2,
  Info,
  ArrowLeftRight,
  Fuel,
  Clock,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface Article {
  slug: string;
  group: string;
  title: string;
  description: string;
  content: string;
}

interface CardItemData {
  title: string;
  icon?: string;
  href?: string;
  body: string;
}

interface CodeTab {
  lang: string;
  label: string;
  code: string;
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightSyntax(code: string, language: string): string {
  const lang = (language || 'typescript').toLowerCase().trim().split(/\s+/)[0];
  let grammar = Prism.languages[lang];
  if (!grammar) {
    if (lang === 'ts' || lang === 'tsx' || lang === 'typescript') {
      grammar = Prism.languages.typescript;
    } else if (lang === 'js' || lang === 'jsx' || lang === 'javascript') {
      grammar = Prism.languages.javascript;
    } else if (lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'zsh') {
      grammar = Prism.languages.bash;
    } else if (lang === 'json') {
      grammar = Prism.languages.json;
    } else if (lang === 'rust' || lang === 'rs') {
      grammar = Prism.languages.rust;
    } else if (lang === 'yaml' || lang === 'yml') {
      grammar = Prism.languages.yaml;
    } else if (lang === 'toml') {
      grammar = Prism.languages.toml;
    } else {
      grammar = Prism.languages.typescript || Prism.languages.javascript;
    }
  }
  if (!grammar) return escapeHtml(code);
  try {
    return Prism.highlight(code, grammar, lang);
  } catch {
    return escapeHtml(code);
  }
}

function getCardIconElement(iconName?: string): React.ReactNode {
  switch (iconName) {
    case 'bolt':
      return <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />;
    case 'diagram-project':
      return <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />;
    case 'coins':
      return <Coins size={18} style={{ color: '#e3b341' }} />;
    case 'robot':
      return <Bot size={18} style={{ color: 'var(--accent-stellar)' }} />;
    case 'dollar-sign':
      return <DollarSign size={18} style={{ color: '#2ea043' }} />;
    case 'shuffle':
      return <ArrowLeftRight size={18} style={{ color: 'var(--accent-cyan)' }} />;
    case 'gas-pump':
      return <Fuel size={18} style={{ color: '#f85149' }} />;
    case 'clock':
      return <Clock size={18} style={{ color: 'var(--accent-purple)' }} />;
    case 'check':
      return <CheckCircle2 size={18} style={{ color: '#2ea043' }} />;
    case 'circle-info':
      return <Info size={18} style={{ color: 'var(--accent-stellar)' }} />;
    case 'shield':
      return <Shield size={18} style={{ color: 'var(--accent-cyan)' }} />;
    default:
      return <FileText size={18} style={{ color: 'var(--accent-cyan)' }} />;
  }
}

export function DocumentationViewer() {
  const articles: Article[] = docsData as Article[];
  const [selectedSlug, setSelectedSlug] = useState<string>('introduction');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sidebar folding states
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  // Auto-expand group of current article
  useEffect(() => {
    if (currentArticle && collapsedGroups[currentArticle.group]) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [currentArticle.group]: false
      }));
    }
  }, [currentArticle, collapsedGroups]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const collapseAllGroups = () => {
    const all: Record<string, boolean> = {};
    for (const k of Object.keys(groupedArticles)) {
      all[k] = true;
    }
    setCollapsedGroups(all);
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const handleNavigate = (targetSlug: string) => {
    const clean = targetSlug.replace(/^\//, '');
    setSelectedSlug(clean);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  const renderCardBody = (body: string): React.ReactNode => {
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const hasBullets = lines.some((l) => l.startsWith('- ') || l.startsWith('* '));
    if (hasBullets) {
      return (
        <ul style={{ listStyleType: 'disc', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((l, idx) => {
            const clean = l.replace(/^[-*]\s*/, '');
            return (
              <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                {renderInlineMarkdown(clean)}
              </li>
            );
          })}
        </ul>
      );
    }
    return <span>{renderInlineMarkdown(body)}</span>;
  };

  const renderCodeBlock = (code: string, language: string, id: string) => {
    const highlighted = highlightSyntax(code, language);
    return (
      <div key={id} style={{
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
          <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)' }}>
            {language || 'text'}
          </span>
          <button
            onClick={() => handleCopy(code, id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copiedCode === id ? 'var(--success)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12
            }}
          >
            {copiedCode === id ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode === id ? 'Copied' : 'Copy'}</span>
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
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    );
  };

  const CodeGroupViewer = ({ tabs, blockId }: { tabs: CodeTab[]; blockId: string }) => {
    const [activeTabIdx, setActiveTabIdx] = useState(0);
    const activeTab = tabs[activeTabIdx] || tabs[0];
    const highlighted = highlightSyntax(activeTab.code, activeTab.lang);
    const tabCopyId = `${blockId}-tab-${activeTabIdx}`;

    return (
      <div style={{
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
          padding: '0 8px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTabIdx(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTabIdx === idx ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  color: activeTabIdx === idx ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: activeTabIdx === idx ? 600 : 400,
                  fontSize: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleCopy(activeTab.code, tabCopyId)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copiedCode === tabCopyId ? 'var(--success)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 10px'
            }}
          >
            {copiedCode === tabCopyId ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode === tabCopyId ? 'Copied' : 'Copy'}</span>
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
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    );
  };

  const renderCardGroup = (groupText: string, groupIdx: number) => {
    const colsMatch = groupText.match(/cols=\{?(\d+)\}?/);
    const cols = colsMatch ? parseInt(colsMatch[1], 10) : 2;

    const cardRegex = /<Card\s+([^>]*?)>([\s\S]*?)<\/Card>/g;
    const cards: CardItemData[] = [];
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(groupText)) !== null) {
      const attrStr = match[1];
      const body = match[2].trim();
      const titleMatch = attrStr.match(/title="([^"]*)"/);
      const iconMatch = attrStr.match(/icon="([^"]*)"/);
      const hrefMatch = attrStr.match(/href="([^"]*)"/);

      cards.push({
        title: titleMatch ? titleMatch[1] : 'Guide',
        icon: iconMatch ? iconMatch[1] : undefined,
        href: hrefMatch ? hrefMatch[1] : undefined,
        body
      });
    }

    return (
      <div
        key={`cardgroup-${groupIdx}`}
        style={{
          display: 'grid',
          gridTemplateColumns: cols === 3 ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          margin: '24px 0'
        }}
      >
        {cards.map((card, cIdx) => {
          const isClickable = Boolean(card.href);
          return (
            <div
              key={cIdx}
              onClick={() => {
                if (card.href) {
                  if (card.href.startsWith('/')) {
                    handleNavigate(card.href);
                  } else {
                    window.open(card.href, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: isClickable ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (isClickable) {
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (isClickable) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getCardIconElement(card.icon)}
                </div>
                {isClickable && (
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <div>
                <h4 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  {card.title}
                </h4>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {renderCardBody(card.body)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
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
      const trimmed = line.trim();

      // Detect <CardGroup> block
      if (trimmed.startsWith('<CardGroup')) {
        let j = i;
        while (j < lines.length && !lines[j].includes('</CardGroup>')) {
          j++;
        }
        const groupText = lines.slice(i, j + 1).join('\n');
        elements.push(renderCardGroup(groupText, i));
        i = j;
        continue;
      }

      // Ignore stray closing or opening Card tags
      if (
        trimmed === '</CardGroup>' ||
        trimmed.startsWith('</Card>') ||
        trimmed.startsWith('<Card') ||
        trimmed === '</CodeGroup>'
      ) {
        continue;
      }

      // Detect <CodeGroup> block
      if (trimmed.startsWith('<CodeGroup')) {
        let j = i;
        while (j < lines.length && !lines[j].includes('</CodeGroup>')) {
          j++;
        }
        const groupText = lines.slice(i, j + 1).join('\n');
        const blockRegex = /```(\w+)(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
        const tabs: CodeTab[] = [];
        let bMatch: RegExpExecArray | null;

        while ((bMatch = blockRegex.exec(groupText)) !== null) {
          tabs.push({
            lang: bMatch[1],
            label: bMatch[2] || bMatch[1],
            code: bMatch[3].trim()
          });
        }

        if (tabs.length > 0) {
          elements.push(<CodeGroupViewer key={`codegroup-${i}`} tabs={tabs} blockId={`cg-${i}`} />);
        }
        i = j;
        continue;
      }

      // Detect standard code blocks
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
          elements.push(renderCodeBlock(codeText, codeLanguage, codeId));
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Markdown tables
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

      // Callouts
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
            border: '1px solid rgba(255,255,255,0.08)'
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

      // Headings
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

      // Bullet lists
      if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li key={`li-${i}`} style={{ marginLeft: 20, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
        continue;
      }

      // Numbered lists
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

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 73px)', width: '100%', position: 'relative' }}>
      {/* Collapsible Sidebar */}
      {sidebarOpen && (
        <aside style={{
          width: 320,
          borderRight: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 73px)',
          position: 'sticky',
          top: 73,
          flexShrink: 0
        }}>
          {/* Top header with search and collapse button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '7px 8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Expand / Collapse All Quick Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 4px',
            fontSize: 11,
            color: 'var(--text-muted)'
          }}>
            <span>CATEGORIES</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={expandAllGroups}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Expand All
              </button>
              <span>|</span>
              <button
                onClick={collapseAllGroups}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Accordion Categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(groupedArticles).map(([groupName, groupList]) => {
              const isCollapsed = Boolean(collapsedGroups[groupName]);
              return (
                <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => toggleGroup(groupName)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em'
                    }}>
                      {GROUP_ICONS[groupName] || <FileText size={14} />}
                      <span>{groupName}</span>
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-secondary)'
                      }}>
                        {groupList.length}
                      </span>
                    </div>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 6 }}>
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
                              padding: '7px 12px',
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
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Main Documentation Content */}
      <main style={{
        flex: 1,
        maxWidth: 960,
        margin: '0 auto',
        padding: '36px 36px 80px 36px',
        overflowY: 'auto',
        width: '100%'
      }}>
        {/* Toggle open button if sidebar is folded */}
        {!sidebarOpen && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <PanelLeftOpen size={14} />
              <span>Show Navigation Sidebar</span>
            </button>
          </div>
        )}

        {/* Breadcrumb row */}
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

        {/* Header */}
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

        {/* Markdown Content */}
        <div style={{ color: 'var(--text-secondary)' }}>
          {renderMarkdown(currentArticle.content)}
        </div>

        {/* Previous and Next Navigation Footer */}
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
