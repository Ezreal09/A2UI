/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useCallback, useMemo, useRef, useEffect, type FormEvent } from 'react';
import {
  A2UIProviderV9,
  A2UIRendererV9,
  useA2UIActionsV9,
  type A2uiMessage,
} from '@a2ui/react';
import {
  createRestaurantListMessagesV9,
  createBookingFormMessagesV9,
  createConfirmationMessagesV9,
} from './mock/restaurantMessagesV9';
import { createRestaurantCatalog } from './catalog/restaurantCatalog';
import './App.css';

const CATALOG_ID = 'restaurant-catalog-v0.9';

const urlParams = new URLSearchParams(window.location.search);
const isMockMode = urlParams.get('mock') !== 'false';

// ── Action log entry ──────────────────────────────────────────────────────────

interface ActionLogEntry {
  id: number;
  timestamp: string;
  name: string;
  context: Record<string, unknown>;
  /** Present when surface was created with sendDataModel:true */
  dataModel?: unknown;
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const catalog = useMemo(() => createRestaurantCatalog(CATALOG_ID), []);
  const processMessagesRef = useRef<((msgs: A2uiMessage[]) => void) | null>(null);

  // Shared action log — populated by handleAction and shown in the debug panel
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const actionIdRef = useRef(0);

  const handleAction = useCallback((action: unknown) => {
    console.log('[A2UI v0.9] Action dispatched:', action);
    const userAction = (action as {
      userAction?: {
        name: string;
        context: Record<string, unknown>;
        dataModel?: unknown;
      };
    }).userAction;
    if (!userAction) return;

    const { name, context, dataModel } = userAction;

    // Append to action log for the debug panel
    setActionLog((prev) => [
      {
        id: actionIdRef.current++,
        timestamp: new Date().toLocaleTimeString(),
        name,
        context,
        dataModel,
      },
      ...prev.slice(0, 9), // keep last 10 entries
    ]);

    let messages: A2uiMessage[] = [];

    if (name === 'book_restaurant') {
      messages = createBookingFormMessagesV9(
        String(context.restaurantName ?? 'Restaurant'),
        String(context.imageUrl ?? ''),
        String(context.address ?? '')
      );
    } else if (name === 'submit_booking') {
      messages = createConfirmationMessagesV9(
        String(context.restaurantName ?? 'Restaurant'),
        String(context.partySize ?? '2'),
        String(context.reservationTime ?? ''),
        String(context.dietary ?? ''),
        String(context.imageUrl ?? '')
      );
    }

    if (messages.length > 0 && processMessagesRef.current) {
      processMessagesRef.current(messages);
    }
  }, []);

  return (
    <A2UIProviderV9 catalogs={[catalog]} onAction={handleAction}>
      <ShellContent processMessagesRef={processMessagesRef} actionLog={actionLog} />
    </A2UIProviderV9>
  );
}

// ── ShellContent ──────────────────────────────────────────────────────────────

interface ShellContentProps {
  processMessagesRef: React.MutableRefObject<((msgs: A2uiMessage[]) => void) | null>;
  actionLog: ActionLogEntry[];
}

function ShellContent({ processMessagesRef, actionLog }: ShellContentProps) {
  const { processMessages, getSurface } = useA2UIActionsV9();

  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ordered list of active surface IDs (newest last so they render top→bottom)
  const [surfaceIds, setSurfaceIds] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) document.body.classList.add('dark');
    return prefersDark;
  });

  // Expose processMessages to the action handler living in the parent
  const loadSurfaces = useCallback((messages: A2uiMessage[]) => {
    const newIds: string[] = [];
    for (const msg of messages) {
      if ('createSurface' in msg && msg.createSurface) {
        newIds.push(msg.createSurface.surfaceId);
      }
    }
    if (newIds.length > 0) {
      // Replace: each action flow shows only its own surfaces
      setSurfaceIds(newIds);
    }
  }, []);

  useEffect(() => {
    processMessagesRef.current = (msgs: A2uiMessage[]) => {
      processMessages(msgs);
      loadSurfaces(msgs);
    };
  }, [processMessages, loadSurfaces, processMessagesRef]);

  const sendAndProcess = useCallback(
    async (_query: string) => {
      try {
        setRequesting(true);
        setError(null);

        let messages: A2uiMessage[];

        if (isMockMode) {
          await new Promise<void>((res) => setTimeout(res, 600));
          messages = createRestaurantListMessagesV9();
          console.log('[A2UI v0.9] Mock messages:', messages);
        } else {
          throw new Error('Real agent mode not implemented. Add ?mock=true or connect an agent.');
        }

        processMessages(messages);
        loadSurfaces(messages);
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setRequesting(false);
      }
    },
    [processMessages, loadSurfaces]
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formData.get('query') as string;
      if (!query.trim()) return;
      void sendAndProcess(query);
    },
    [sendAndProcess]
  );

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.body.classList.toggle('dark', next);
      document.body.classList.toggle('light', !next);
      return next;
    });
  }, []);

  const existingSurfaceIds = surfaceIds.filter((id) => getSurface(id) !== undefined);
  const hasSurfaces = existingSurfaceIds.length > 0;
  const showForm = !requesting && !hasSearched;

  return (
    <div className="shell">
      {/* Version badge */}
      <div className="version-badge">A2UI v0.9</div>

      {/* Mock mode indicator */}
      {isMockMode && (
        <div
          style={{
            position: 'fixed', top: 12, left: 80,
            background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)',
            color: 'rgb(161,120,0)', borderRadius: '20px', fontSize: '11px',
            fontWeight: 700, padding: '4px 10px', zIndex: 100,
          }}
        >
          Mock Mode
        </div>
      )}

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={toggleDarkMode}>
        <span className="g-icon filled-heavy">
          {isDarkMode ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      {/* Action log toggle button */}
      <button
        onClick={() => setShowLog((v) => !v)}
        style={{
          position: 'fixed', top: 12, right: 56,
          background: actionLog.length > 0 ? 'rgba(19,127,236,0.15)' : 'rgba(128,128,128,0.1)',
          border: '1px solid rgba(128,128,128,0.2)',
          borderRadius: '20px', fontSize: '11px', fontWeight: 700,
          padding: '4px 10px', zIndex: 100, cursor: 'pointer', color: 'inherit',
        }}
      >
        Actions {actionLog.length > 0 ? `(${actionLog.length})` : ''}
      </button>

      {/* Search form */}
      {showForm && (
        <form className="search-form" onSubmit={handleSubmit}>
          <h1 className="app-title">Restaurant Finder</h1>
          <p className="app-subtitle">
            Powered by A2UI v0.9 — fine-grained Signal-based updates
          </p>
          <div className="input-row">
            <input
              required
              defaultValue="Top 5 Chinese restaurants in New York."
              autoComplete="off"
              id="query"
              name="query"
              type="text"
              disabled={requesting}
              placeholder="Ask about restaurants..."
            />
            <button type="submit" disabled={requesting}>
              <span className="g-icon filled-heavy">send</span>
            </button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {requesting && (
        <div className="pending">
          <div className="spinner" />
          <div className="loading-text">Finding the best spots for you...</div>
        </div>
      )}

      {/* Error display */}
      {error && <div className="error">{error}</div>}

      {/* Surfaces */}
      {!requesting && hasSurfaces && (
        <section className="surfaces">
          {existingSurfaceIds.map((surfaceId) => (
            <A2UIRendererV9 key={surfaceId} surfaceId={surfaceId} />
          ))}
        </section>
      )}

      {/* Ask another button */}
      {!requesting && hasSearched && !showForm && (
        <button
          onClick={() => { setHasSearched(false); setSurfaceIds([]); setError(null); }}
          style={{
            marginTop: '24px', padding: '10px 24px', borderRadius: '8px',
            border: '1.5px solid rgba(128,128,128,0.3)', background: 'transparent',
            color: 'inherit', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '14px', fontWeight: 600,
          }}
        >
          Ask Another Question
        </button>
      )}

      {/* Action log panel — validates sendDataModel and action dispatch */}
      {showLog && (
        <ActionLogPanel entries={actionLog} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}

// ── ActionLogPanel ────────────────────────────────────────────────────────────
// Shows dispatched actions; when sendDataModel:true the full snapshot is shown.

function ActionLogPanel({
  entries,
  onClose,
}: {
  entries: ActionLogEntry[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '360px',
        background: 'rgba(15,15,20,0.97)', borderLeft: '1px solid rgba(128,128,128,0.2)',
        overflowY: 'auto', zIndex: 200, padding: '16px', fontFamily: 'monospace',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>Action Log</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>

      {entries.length === 0 && (
        <p style={{ color: '#64748b', fontSize: '12px' }}>No actions dispatched yet.</p>
      )}

      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            marginBottom: '12px', padding: '10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(128,128,128,0.1)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>{entry.name}</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{entry.timestamp}</span>
          </div>

          {/* Context */}
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: entry.dataModel !== undefined ? '6px' : 0 }}>
            <span style={{ color: '#64748b' }}>context: </span>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          </div>

          {/* DataModel snapshot — only present when sendDataModel:true */}
          {entry.dataModel !== undefined && (
            <div style={{ fontSize: '10px', color: '#86efac' }}>
              <span style={{ fontWeight: 700 }}>📦 dataModel (sendDataModel:true):</span>
              <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#4ade80' }}>
                {JSON.stringify(entry.dataModel, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
