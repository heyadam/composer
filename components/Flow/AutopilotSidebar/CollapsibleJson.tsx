"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Code, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/ai-elements/shimmer";

/**
 * Synchronous JSON syntax highlighter
 */
function highlightJson(json: string): string {
  let result = '';
  let i = 0;

  while (i < json.length) {
    const char = json[i];

    // String
    if (char === '"') {
      const start = i;
      i++;
      while (i < json.length && (json[i] !== '"' || json[i - 1] === '\\')) {
        i++;
      }
      i++; // Include closing quote
      const str = json.slice(start, i);

      // Check if this is a key (followed by :)
      let j = i;
      while (j < json.length && /\s/.test(json[j])) j++;
      const isKey = json[j] === ':';

      if (isKey) {
        result += `<span class="text-sky-400">${escapeHtml(str)}</span>`;
      } else {
        result += `<span class="text-amber-300">${escapeHtml(str)}</span>`;
      }
      continue;
    }

    // Number
    if (/[-\d]/.test(char)) {
      const start = i;
      if (char === '-') i++;
      while (i < json.length && /[\d.]/.test(json[i])) i++;
      // Check for exponent
      if (json[i] === 'e' || json[i] === 'E') {
        i++;
        if (json[i] === '+' || json[i] === '-') i++;
        while (i < json.length && /\d/.test(json[i])) i++;
      }
      result += `<span class="text-purple-400">${escapeHtml(json.slice(start, i))}</span>`;
      continue;
    }

    // Boolean or null
    if (char === 't' && json.slice(i, i + 4) === 'true') {
      result += `<span class="text-orange-400">true</span>`;
      i += 4;
      continue;
    }
    if (char === 'f' && json.slice(i, i + 5) === 'false') {
      result += `<span class="text-orange-400">false</span>`;
      i += 5;
      continue;
    }
    if (char === 'n' && json.slice(i, i + 4) === 'null') {
      result += `<span class="text-gray-500">null</span>`;
      i += 4;
      continue;
    }

    // Brackets and braces
    if (char === '{' || char === '}') {
      result += `<span class="text-yellow-300">${char}</span>`;
      i++;
      continue;
    }
    if (char === '[' || char === ']') {
      result += `<span class="text-yellow-300">${char}</span>`;
      i++;
      continue;
    }

    // Colon and comma
    if (char === ':') {
      result += `<span class="text-gray-500">:</span>`;
      i++;
      continue;
    }
    if (char === ',') {
      result += `<span class="text-gray-500">,</span>`;
      i++;
      continue;
    }

    // Whitespace and other characters
    result += escapeHtml(char);
    i++;
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

interface CollapsibleJsonProps {
  json: string;
  isStreaming?: boolean;
}

export function CollapsibleJson({ json, isStreaming }: CollapsibleJsonProps) {
  const [userToggled, setUserToggled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  // Auto-collapse when streaming finishes (only if user hasn't manually toggled)
  const wasStreaming = useRef(isStreaming);
  useEffect(() => {
    if (wasStreaming.current && !isStreaming && !userToggled) {
      setIsExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, userToggled]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && isExpanded && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [json, isStreaming, isExpanded]);

  // Count lines for display
  const lineCount = json.split("\n").length;

  const handleToggle = () => {
    setUserToggled(true);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="my-2">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            !isExpanded && "-rotate-90"
          )}
        />
        <Code className="h-3 w-3" />
        {isStreaming ? (
          <Shimmer as="span" duration={1.5}>
            Composer Agent Running
          </Shimmer>
        ) : (
          <span>Composer Agent ({lineCount} lines)</span>
        )}
      </button>

      {isExpanded && (
        <div className="group relative mt-1">
          <pre
            ref={preRef}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-[8px] leading-[1.2] font-mono max-h-[200px] overflow-auto text-foreground"
            dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
          />
          <CopyButton text={json} />
        </div>
      )}
    </div>
  );
}

interface ParsedContent {
  textBefore: string;
  jsonBlocks: string[];
  textAfter: string;
  hasOpenCodeBlock: boolean;
}

/**
 * Parse message content to extract JSON blocks and regular text.
 * Handles partial/streaming content with open code blocks.
 */
export function parseMessageContent(content: string): ParsedContent {
  // Check for open code block (started but not closed)
  const openBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*)$/);

  // If there's an open block at the end (no closing ```)
  const hasOpenCodeBlock = openBlockMatch !== null &&
    !content.endsWith('```') &&
    (content.match(/```/g) || []).length % 2 === 1;

  const jsonBlocks: string[] = [];
  let textBefore = "";
  let textAfter = "";

  if (hasOpenCodeBlock && openBlockMatch) {
    // Split at the open code block
    const blockStart = content.lastIndexOf('```');
    textBefore = content.slice(0, blockStart).trim();

    // Extract partial JSON (everything after ```json or ```)
    const partialJson = openBlockMatch[1].trim();
    if (partialJson) {
      jsonBlocks.push(partialJson);
    }
  } else {
    // Handle closed code blocks
    const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
    let lastIndex = 0;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      // Text before this block
      if (lastIndex === 0) {
        textBefore = content.slice(0, match.index).trim();
      }

      const jsonStr = match[1].trim();
      if (jsonStr) {
        jsonBlocks.push(jsonStr);
      }
      lastIndex = match.index + match[0].length;
    }

    // Text after last block
    if (lastIndex > 0) {
      textAfter = content.slice(lastIndex).trim();
    } else {
      // No code blocks found
      textBefore = content;
    }
  }

  return { textBefore, jsonBlocks, textAfter, hasOpenCodeBlock };
}
