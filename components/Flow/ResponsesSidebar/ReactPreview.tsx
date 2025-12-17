"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, RefreshCw, Code, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractReactCode, type ReactComponentData } from "@/lib/react-utils";

interface ReactPreviewProps {
  data: ReactComponentData;
  className?: string;
}

// HTML template for the sandboxed iframe
function createIframeContent(code: string): string {
  // Extract clean code from markdown fences and encode as base64
  const cleanCode = extractReactCode(code);
  const encodedCode = btoa(unescape(encodeURIComponent(cleanCode)));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    #root { min-height: 100vh; }
    .error-boundary {
      padding: 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
    }
    .error-boundary h3 { font-weight: 600; margin-bottom: 8px; }
    .error-boundary pre {
      background: #fee2e2;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="user-code" type="text/plain">${encodedCode}</script>
  <script>
    (function() {
      const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } = React;

      // Decode the user code from base64
      const encodedCode = document.getElementById('user-code').textContent;
      let userCode = decodeURIComponent(escape(atob(encodedCode)));

      // Error Boundary Component
      class ErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }

        render() {
          if (this.state.hasError) {
            return React.createElement('div', { className: 'error-boundary' },
              React.createElement('h3', null, 'Component Error'),
              React.createElement('pre', null, this.state.error?.message || 'Unknown error')
            );
          }
          return this.props.children;
        }
      }

      try {
        // Pre-process: Remove export default before Babel transformation
        // Handle: export default function X() or export default function() or export default () =>
        userCode = userCode.replace(/export\\s+default\\s+function\\s+(\\w+)/g, 'function $1');
        userCode = userCode.replace(/export\\s+default\\s+function\\s*\\(/g, 'function Component(');
        userCode = userCode.replace(/export\\s+default\\s+\\(/g, 'const Component = (');
        userCode = userCode.replace(/export\\s+default\\s+/g, 'const Component = ');

        // Transform the JSX code using Babel
        const transformedCode = Babel.transform(userCode, { presets: ['react'] }).code;

        // Execute the transformed code and capture the component
        let UserComponent = null;

        // Try to execute and find the component
        const executeCode = new Function(
          'React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'createContext', 'useContext', 'Fragment',
          transformedCode + '; return typeof Component !== "undefined" ? Component : null;'
        );

        UserComponent = executeCode(React, useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment);

        // If Component wasn't found, look for any function declaration
        if (!UserComponent || typeof UserComponent !== 'function') {
          const funcMatch = transformedCode.match(/function\\s+(\\w+)\\s*\\(/);
          if (funcMatch) {
            const funcName = funcMatch[1];
            UserComponent = new Function(
              'React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'createContext', 'useContext', 'Fragment',
              transformedCode + '; return ' + funcName + ';'
            )(React, useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment);
          }
        }

        if (!UserComponent || typeof UserComponent !== 'function') {
          throw new Error('No valid React component found. Make sure your code exports a function component.');
        }

        // Render with error boundary
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
          React.createElement(ErrorBoundary, null,
            React.createElement(UserComponent)
          )
        );

        // Give Tailwind CDN time to process the new classes
        setTimeout(() => {
          if (window.tailwind && typeof window.tailwind.refresh === 'function') {
            window.tailwind.refresh();
          }
        }, 100);
      } catch (error) {
        document.getElementById('root').innerHTML =
          '<div class="error-boundary"><h3>Error</h3><pre>' +
          (error.message || error) + '</pre></div>';
        console.error('React Preview Error:', error);
      }
    })();
  </script>
</body>
</html>`;
}

export function ReactPreview({ data, className }: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [key, setKey] = useState(0);

  // Create blob URL for iframe content
  useEffect(() => {
    if (!data.code) {
      setError("No component code provided");
      return;
    }

    setError(null);

    try {
      const html = createIframeContent(data.code);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      if (iframeRef.current) {
        iframeRef.current.src = url;
      }

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create preview");
    }
  }, [data.code, key]);

  const handleRefresh = () => {
    setKey((k) => k + 1);
    setError(null);
  };

  // Extract clean code for display (strips markdown fences)
  const displayCode = extractReactCode(data.code);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          React Preview
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCodeExpanded(!isCodeExpanded)}
            className="h-6 px-2 text-xs"
          >
            <Code className="h-3 w-3 mr-1" />
            {isCodeExpanded ? "Hide" : "View"} Code
            {isCodeExpanded ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Code View (collapsible) */}
      {isCodeExpanded && (
        <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto border">
          <code>{displayCode}</code>
        </pre>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Sandboxed iframe */}
      <div className="relative w-full rounded-md border bg-white overflow-hidden aspect-[4/3]">
        <iframe
          ref={iframeRef}
          key={key}
          title="React Component Preview"
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0 absolute inset-0"
        />
      </div>
    </div>
  );
}
