import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Convert from 'ansi-to-html';

import { editor } from '#preload';
import { createCircularBuffer } from '/shared/circular-buffer';

import '/@/themes';

const container = document.getElementById('debugger')!;
const root = createRoot(container);

function getDebuggerPath() {
  const url = new URL(window.location.href);
  return url.searchParams.get('path');
}

const MAX_LOGS = 1000;
const convert = new Convert();
const logsBuffer = createCircularBuffer<string>(MAX_LOGS);

function Debugger() {
  const debuggerPath = getDebuggerPath();
  const logsRef = useRef<HTMLDivElement>(null);
  const [attachStatus, setAttachStatus] = useState<'loading' | 'attached' | 'failed'>('loading');
  const [, forceUpdate] = useState(0);

  const log = useCallback((messages: string[] | string) => {
    messages = Array.isArray(messages) ? messages : [messages];

    if (messages.length === 0) return;

    for (const message of messages) {
      logsBuffer.push(message);
    }
    forceUpdate(prev => prev + 1);

    // Auto-scroll to the bottom
    requestAnimationFrame(() => {
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    if (!debuggerPath) return;

    let dettachFromSceneDebugger: (() => void) | undefined;
    editor
      .attachSceneDebugger(debuggerPath, log)
      .then(({ cleanup }) => {
        dettachFromSceneDebugger = cleanup;
        setAttachStatus('attached');
      })
      .catch(() => {
        setAttachStatus('failed');
      });

    return () => {
      dettachFromSceneDebugger?.();
    };
  }, []);

  const logs = logsBuffer.getAll();

  return (
    <main className="Debugger">
      {attachStatus === 'loading' ? (
        'Loading'
      ) : attachStatus === 'failed' || !debuggerPath ? (
        'Failed to attach. Please close this window and launch debugger again'
      ) : (
        <>
          <div
            className="logs"
            ref={logsRef}
          >
            {logs.map(($, i) => (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: convert.toHtml($) }}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

root.render(
  <React.StrictMode>
    <Debugger />
  </React.StrictMode>,
);
