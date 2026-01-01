"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, RefreshCw, Code, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractThreejsCode, type ThreejsData } from "@/lib/three-utils";

interface ThreePreviewProps {
  data: ThreejsData;
  sceneInput?: string;
  className?: string;
}

// Extract code from markdown fences if present
function cleanThreejsCode(code: string): string {
  // Remove markdown code fences
  let cleaned = code.replace(/^```(?:jsx|javascript|js|tsx)?\n?/gm, "");
  cleaned = cleaned.replace(/\n?```$/gm, "");
  return cleaned.trim();
}

// Encode string to base64 using modern TextEncoder (UTF-8 safe)
// Uses a loop instead of spread operator to avoid stack overflow with large inputs
function encodeToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// HTML template for the sandboxed iframe with Three.js + R3F
function createIframeContent(code: string, sceneInput?: string): string {
  const cleanCode = cleanThreejsCode(code);
  const encodedCode = encodeToBase64(cleanCode);
  const encodedSceneInput = sceneInput ? encodeToBase64(sceneInput) : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="module">
    // Load all dependencies as ES modules with proper bundling
    try {
      const [
        React,
        ReactDOM,
        THREE,
        ReactThreeFiber,
        ReactThreeDrei
      ] = await Promise.all([
        import('https://esm.sh/react@18.2.0'),
        import('https://esm.sh/react-dom@18.2.0'),
        import('https://esm.sh/three@0.160.0'),
        import('https://esm.sh/@react-three/fiber@8.15.12?deps=react@18.2.0,react-dom@18.2.0,three@0.160.0'),
        import('https://esm.sh/@react-three/drei@9.92.7?deps=react@18.2.0,react-dom@18.2.0,three@0.160.0,@react-three/fiber@8.15.12')
      ]);

      // Expose to window for Babel-compiled code
      window.React = React;
      window.ReactDOM = ReactDOM;
      window.THREE = THREE;
      window.ReactThreeFiber = ReactThreeFiber;
      window.ReactThreeDrei = ReactThreeDrei;
      window.__R3F_LOADED__ = true;
    } catch (err) {
      console.error('Failed to load libraries:', err);
      document.getElementById('root').innerHTML =
        '<div class="error-boundary"><h3>Loading Error</h3><pre>' + err.message + '</pre></div>';
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    canvas { display: block; }
    .error-boundary {
      padding: 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      height: 100%;
      overflow: auto;
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
  <script id="scene-input" type="text/plain">${encodedSceneInput}</script>
  <script>
    // Wait for all libraries to load via ES modules
    function waitForLibraries(callback, retries = 100) {
      if (window.__R3F_LOADED__ && window.THREE && window.ReactThreeFiber) {
        callback();
      } else if (retries > 0) {
        setTimeout(() => waitForLibraries(callback, retries - 1), 100);
      } else {
        const missing = [];
        if (!window.THREE) missing.push('Three.js');
        if (!window.ReactThreeFiber) missing.push('React Three Fiber');
        if (!window.ReactThreeDrei) missing.push('React Three Drei');
        document.getElementById('root').innerHTML =
          '<div class="error-boundary"><h3>Loading Error</h3><pre>Failed to load: ' + missing.join(', ') + '</pre></div>';
      }
    }

    waitForLibraries(function() {
      // React is an ES module namespace, get default or use as-is
      const ReactLib = window.React.default || window.React;
      const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } = ReactLib;

      // Get R3F and Drei from globals (also ES module namespaces)
      const ReactThreeFiber = window.ReactThreeFiber;
      const ReactThreeDrei = window.ReactThreeDrei;

      if (!ReactThreeFiber) {
        document.getElementById('root').innerHTML =
          '<div class="error-boundary"><h3>Loading Error</h3><pre>React Three Fiber not loaded</pre></div>';
        return;
      }

      // Extract R3F components (handle both default export and named exports)
      const { Canvas, useFrame, useThree, useLoader } = ReactThreeFiber;

      // Extract Drei components (provide empty object if not loaded)
      const DreiComponents = ReactThreeDrei || {};
      const {
        OrbitControls = () => null,
        Box = 'mesh',
        Sphere = 'mesh',
        Plane = 'mesh',
        Text = () => null,
        Environment = () => null,
        Sky = () => null,
        Stars = () => null,
        Float = ({ children }) => children,
        MeshWobbleMaterial = 'meshStandardMaterial',
        MeshDistortMaterial = 'meshStandardMaterial',
        useTexture = () => null,
        Html = ({ children }) => null,
        Center = ({ children }) => children,
        PerspectiveCamera = () => null,
        Stage = ({ children }) => children,
        ContactShadows = () => null,
        Sparkles = () => null,
        GradientTexture = () => null,
        RoundedBox = Box,
        Torus = 'mesh',
        TorusKnot = 'mesh',
        Cylinder = 'mesh',
        Cone = 'mesh',
        Ring = 'mesh',
        Dodecahedron = 'mesh',
        Icosahedron = 'mesh',
        Octahedron = 'mesh',
        Tetrahedron = 'mesh',
      } = DreiComponents;

      // Decode scene input if provided
      const encodedSceneInput = document.getElementById('scene-input').textContent;
      if (encodedSceneInput) {
        try {
          window.sceneInput = decodeURIComponent(escape(atob(encodedSceneInput)));
        } catch (e) {
          window.sceneInput = '';
        }
      } else {
        window.sceneInput = '';
      }

      // Decode the user code from base64
      const encodedCode = document.getElementById('user-code').textContent;
      let userCode = decodeURIComponent(escape(atob(encodedCode)));

      // Error Boundary Component
      // Get ReactDOM for createRoot (ES module namespace)
      const ReactDOMLib = window.ReactDOM.default || window.ReactDOM;
      const { createRoot } = ReactDOMLib;

      class ErrorBoundary extends ReactLib.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }

        render() {
          if (this.state.hasError) {
            return ReactLib.createElement('div', { className: 'error-boundary' },
              ReactLib.createElement('h3', null, 'Scene Error'),
              ReactLib.createElement('pre', null, this.state.error?.message || 'Unknown error')
            );
          }
          return this.props.children;
        }
      }

      try {
        // Pre-process: Remove import statements
        userCode = userCode.replace(/^\\s*import\\s+.*?['"]/gm, '// ');
        userCode = userCode.replace(/^\\s*import\\s+.*?from\\s+['"].*?['"];?\\s*$/gm, '');

        // Pre-process: Remove export default
        userCode = userCode.replace(/export\\s+default\\s+function\\s+(\\w+)/g, 'function $1');
        userCode = userCode.replace(/export\\s+default\\s+function\\s*\\(/g, 'function Scene(');
        userCode = userCode.replace(/export\\s+default\\s+\\(/g, 'const Scene = (');
        userCode = userCode.replace(/export\\s+default\\s+/g, 'const Scene = ');

        // Transform the JSX code using Babel
        const transformedCode = Babel.transform(userCode, { presets: ['react'] }).code;

        // All the globals we need to pass
        const globals = {
          React: ReactLib,
          useState,
          useEffect,
          useRef,
          useMemo,
          useCallback,
          createContext,
          useContext,
          Fragment,
          THREE: window.THREE.default || window.THREE,
          Canvas,
          useFrame,
          useThree,
          useLoader,
          OrbitControls,
          Box,
          Sphere,
          Plane,
          Text,
          Environment,
          Sky,
          Stars,
          Float,
          MeshWobbleMaterial,
          MeshDistortMaterial,
          useTexture,
          Html,
          Center,
          PerspectiveCamera,
          Stage,
          ContactShadows,
          Sparkles,
          GradientTexture,
          RoundedBox,
          Torus,
          TorusKnot,
          Cylinder,
          Cone,
          Ring,
          Dodecahedron,
          Icosahedron,
          Octahedron,
          Tetrahedron,
          sceneInput: window.sceneInput,
        };

        const globalNames = Object.keys(globals);
        const globalValues = Object.values(globals);

        // Execute the transformed code and capture the component
        let UserComponent = null;

        const executeCode = new Function(
          ...globalNames,
          transformedCode + '; return typeof Scene !== "undefined" ? Scene : (typeof Component !== "undefined" ? Component : null);'
        );

        UserComponent = executeCode(...globalValues);

        // If Scene/Component wasn't found, look for any function declaration
        if (!UserComponent || typeof UserComponent !== 'function') {
          const funcMatch = transformedCode.match(/function\\s+(\\w+)\\s*\\(/);
          if (funcMatch) {
            const funcName = funcMatch[1];
            UserComponent = new Function(
              ...globalNames,
              transformedCode + '; return ' + funcName + ';'
            )(...globalValues);
          }
        }

        if (!UserComponent || typeof UserComponent !== 'function') {
          throw new Error('No valid React Three Fiber scene component found.');
        }

        // Render with error boundary
        const root = createRoot(document.getElementById('root'));
        root.render(
          ReactLib.createElement(ErrorBoundary, null,
            ReactLib.createElement(UserComponent)
          )
        );
      } catch (error) {
        document.getElementById('root').innerHTML =
          '<div class="error-boundary"><h3>Error</h3><pre>' +
          (error.message || error) + '</pre></div>';
        console.error('Three.js Preview Error:', error);
      }
    });
  </script>
</body>
</html>`;
}

export function ThreePreview({ data, sceneInput, className }: ThreePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [key, setKey] = useState(0);

  // Create blob URL for iframe content
  useEffect(() => {
    if (!data.code) {
      setError("No scene code provided");
      return;
    }

    setError(null);

    try {
      const html = createIframeContent(data.code, sceneInput);
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
  }, [data.code, sceneInput, key]);

  const handleRefresh = () => {
    setKey((k) => k + 1);
    setError(null);
  };

  // Extract clean code for display
  const displayCode = cleanThreejsCode(data.code);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          3D Scene Preview
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

      {/* Sandboxed iframe - square aspect ratio for 3D scenes */}
      <div className="relative w-full rounded-md border bg-black overflow-hidden aspect-square">
        <iframe
          ref={iframeRef}
          key={key}
          title="Three.js Scene Preview"
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0 absolute inset-0"
        />
      </div>
    </div>
  );
}
