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
  const [showAllCodes, setShowAllCodes] = useState(false);

  const filteredCodes = useMemo(() => {
    return (errorCodesData as ErrorCodeItem[]).filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
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
  }, [searchTerm, selectedCategory]);

  // When not searching and showAllCodes is false, display 3 featured sample errors
  const displayedCodes = useMemo(() => {
    if (searchTerm.trim() || showAllCodes) {
      return filteredCodes;
    }
    // Default featured error codes
    return (errorCodesData as ErrorCodeItem[]).filter(item => 
      [1120, 1160, 1190].includes(item.code)
    );
  }, [filteredCodes, searchTerm, showAllCodes]);

  return (
    <section style={{ marginTop: 56, marginBottom: 56 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent-blue)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 6
          }}>
            <span>Machine-Readable Diagnostics</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Universal 250 Error Codes Registry
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Exhaustive machine-readable error classification across all 7 protocol domains with deterministic remedies.
          </p>
        </div>

        <a
          href="https://emeditweb.gitbook.io/x402/error-registry/error-codes"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--accent-blue)',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease'
          }}
        >
          View Full Directory on GitBook &rarr;
        </a>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20
      }}>
        {/* Search & Category Filter */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search error codes by ID (e.g. 1120), slug, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: 260,
                padding: '10px 14px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    backgroundColor: active ? '#21262d' : 'transparent',
                    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
          <span>
            {searchTerm.trim()
              ? `Found ${filteredCodes.length} matching error code(s)`
              : showAllCodes
              ? `Displaying all ${filteredCodes.length} error codes`
              : 'Featured Common Error Codes'}
          </span>
          <button
            onClick={() => setShowAllCodes(!showAllCodes)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showAllCodes ? 'Show Compact View' : 'Browse All 250 Codes Inline'}
          </button>
        </div>

        {/* Error Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 12,
          marginTop: 16,
          maxHeight: showAllCodes ? '560px' : 'auto',
          overflowY: showAllCodes ? 'auto' : 'visible'
        }}>
          {displayedCodes.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No error codes found matching "{searchTerm}".
            </div>
          ) : (
            displayedCodes.map((item) => (
              <div
                key={item.code}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: 'var(--accent-blue)'
                    }}>
                      #{item.code}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}>
                      {item.category}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: item.retryable ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                    color: item.retryable ? '#3fb950' : '#f85149',
                    fontWeight: 600
                  }}>
                    {item.retryable ? 'Retryable' : 'Permanent'}
                  </span>
                </div>

                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)'
                }}>
                  {item.slug}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.message}
                </div>

                <div style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-muted)',
                  paddingTop: 6,
                  marginTop: 2
                }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Remedy: </strong>
                  {item.remedy}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
