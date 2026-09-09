'use client';

import React, { useState, useMemo } from 'react';
import errorCodesData from '../data/error_registry.json';

interface ErrorCodeItem {
  code: number;
  slug: string;
  category: string;
  httpStatus: number;
  retryable: boolean;
  message: string;
  remedy: string;
}

const CATEGORIES = ['ALL', 'PROTOCOL', 'HORIZON', 'SOROBAN', 'PAYWALL', 'REPLAY', 'CLIENT', 'DEX'];

export function ErrorRegistryViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [retryableFilter, setRetryableFilter] = useState<'ALL' | 'RETRYABLE' | 'PERMANENT'>('ALL');
  const [selectedCode, setSelectedCode] = useState<ErrorCodeItem | null>(null);

  const filteredCodes = useMemo(() => {
    return (errorCodesData as ErrorCodeItem[]).filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (retryableFilter === 'RETRYABLE' && !item.retryable) {
        return false;
      }
      if (retryableFilter === 'PERMANENT' && item.retryable) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          item.code.toString().includes(term) ||
          item.slug.toLowerCase().includes(term) ||
          item.message.toLowerCase().includes(term) ||
          item.remedy.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [searchTerm, selectedCategory, retryableFilter]);

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Universal 250 Error Codes Registry
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Standardized, machine-readable taxonomy covering Protocol, Horizon, Soroban, Paywall, Replay, Client, and DEX errors.
          </p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 600 }}>
          Showing {filteredCodes.length} of 250 codes
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by code (e.g. 1120), slug, message, or remedy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: 260,
              padding: '10px 16px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {(['ALL', 'RETRYABLE', 'PERMANENT'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setRetryableFilter(mode)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: retryableFilter === mode ? 'var(--accent-stellar)' : 'var(--bg-card)',
                  color: retryableFilter === mode ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {mode === 'ALL' ? 'All Types' : mode === 'RETRYABLE' ? 'Retryable' : 'Permanent'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--border)',
                backgroundColor: selectedCategory === cat ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-card)',
                color: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Error Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 16
      }}>
        {filteredCodes.slice(0, 60).map((item) => (
          <div
            key={item.code}
            onClick={() => setSelectedCode(selectedCode?.code === item.code ? null : item)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid',
              borderColor: selectedCode?.code === item.code ? 'var(--accent-cyan)' : 'var(--border)',
              borderRadius: 10,
              padding: 16,
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: 4
              }}>
                #{item.code}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: item.retryable ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                  color: item.retryable ? '#3fb950' : '#f85149'
                }}>
                  {item.retryable ? 'RETRYABLE' : 'PERMANENT'}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: 'rgba(139, 148, 158, 0.15)',
                  color: 'var(--text-secondary)'
                }}>
                  HTTP {item.httpStatus}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {item.slug}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {item.message}
            </p>

            <div style={{
              marginTop: 4,
              padding: 10,
              borderRadius: 6,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-primary)'
            }}>
              <span style={{ color: 'var(--accent-stellar)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                Remedy:
              </span>
              {item.remedy}
            </div>
          </div>
        ))}
      </div>

      {filteredCodes.length > 60 && (
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          Displaying first 60 results. Use search or category filters to narrow down.
        </div>
      )}
    </section>
  );
}
