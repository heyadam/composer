"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nodeDefinitions, type NodeType } from "@/types/flow";
import {
  Command,
  Code,
  ImageIcon,
  Keyboard,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  Search,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  "preview-output": Square,
  "text-generation": MessageSquare,
  "image-generation": ImageIcon,
  "ai-logic": Sparkles,
  "comment": MessageSquarePlus,
  "react-component": Code,
  "realtime-conversation": Mic,
};

interface NodeToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (nodeType: NodeType) => void;
}

export function NodeToolbar({ isOpen, onClose, onAddNode }: NodeToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredNodes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return nodeDefinitions;
    return nodeDefinitions.filter(
      (node) =>
        node.label.toLowerCase().includes(trimmed) ||
        node.description.toLowerCase().includes(trimmed)
    );
  }, [query]);

  const activeNode = filteredNodes[activeIndex];

  const handleSelect = useCallback(
    (nodeType: NodeType) => {
      onAddNode(nodeType);
      onClose();
    },
    [onAddNode, onClose]
  );

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks on the toggle button (let it handle its own toggle)
      if (target.closest("[data-node-toolbar-toggle]")) {
        return;
      }

      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Delay adding listener to avoid closing on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(0);
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredNodes.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (activeNode) {
          handleSelect(activeNode.type);
        }
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault();
        setAiMode((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeNode, filteredNodes.length, handleSelect, isOpen, onClose]);

  useEffect(() => {
    if (activeIndex > filteredNodes.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, filteredNodes.length]);

  const listVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          ref={toolbarRef}
          className="absolute bottom-24 left-1/2 z-20 w-[520px] -translate-x-1/2"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="p-4 pb-3">
              <div
                className={`rounded-xl ${
                  aiMode
                    ? "bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 p-[1px]"
                    : "border border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 rounded-[11px] bg-zinc-950/80 px-4 py-3">
                  {aiMode ? (
                    <Sparkles className="h-5 w-5 text-purple-300" />
                  ) : (
                    <Search className="h-5 w-5 text-zinc-400" />
                  )}
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      aiMode
                        ? "Ask AI to generate nodes..."
                        : "Search nodes..."
                    }
                    className="flex-1 bg-transparent text-lg font-medium text-white placeholder:text-zinc-500 focus-visible:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setAiMode((prev) => !prev)}
                    className={`rounded-lg border border-transparent ${
                      aiMode
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Command className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="max-h-[400px] overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
              {filteredNodes.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">
                  No nodes found. Try a different search.
                </li>
              ) : (
                filteredNodes.map((node, index) => {
                  const Icon = iconMap[node.type];
                  const isActive = index === activeIndex;
                  return (
                    <motion.li
                      key={node.type}
                      variants={itemVariants}
                      className="relative"
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(node.type)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                          isActive
                            ? "bg-blue-500/10 text-white ring-1 ring-blue-500/20"
                            : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${node.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">
                            {node.label}
                          </span>
                          <span className="block text-xs text-zinc-400">
                            {node.description}
                          </span>
                        </span>
                        {isActive ? (
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-200">
                            Selected
                          </span>
                        ) : null}
                      </button>
                      {isActive ? (
                        <span className="pointer-events-none absolute left-0 top-2 h-[calc(100%-16px)] w-1 rounded-full bg-blue-400/80" />
                      ) : null}
                    </motion.li>
                  );
                })
              )}
            </motion.ul>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-200">
                    ↵
                  </kbd>
                  Insert
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-200">
                    Esc
                  </kbd>
                  Cancel
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3 text-zinc-300 hover:text-white"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-8 px-4"
                  disabled={!activeNode}
                  onClick={() => {
                    if (activeNode) {
                      handleSelect(activeNode.type);
                    }
                  }}
                >
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
