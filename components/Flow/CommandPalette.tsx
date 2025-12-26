"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Sparkles,
  Keyboard,
  Square,
  MessageSquare,
  ImageIcon,
  Upload,
  MessageSquarePlus,
  Code,
  Mic,
  AudioWaveform,
  FileAudio,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nodeDefinitions, type NodeType } from "@/types/flow";
import { springs } from "@/lib/motion/presets";

// Icon mapping for node types
const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  "audio-input": AudioWaveform,
  "preview-output": Square,
  "text-generation": MessageSquare,
  "image-generation": ImageIcon,
  "ai-logic": Sparkles,
  "comment": MessageSquarePlus,
  "react-component": Code,
  "realtime-conversation": Mic,
  "audio-transcription": FileAudio,
};

// Extended node definitions with categories
const categorizedNodes = [
  {
    category: "Inputs",
    nodes: nodeDefinitions.filter((n) =>
      ["text-input", "image-input", "audio-input"].includes(n.type)
    ),
  },
  {
    category: "AI Generation",
    nodes: nodeDefinitions.filter((n) =>
      ["text-generation", "image-generation", "react-component", "realtime-conversation", "audio-transcription"].includes(n.type)
    ),
  },
  {
    category: "Logic",
    nodes: nodeDefinitions.filter((n) =>
      ["ai-logic"].includes(n.type)
    ),
  },
  {
    category: "Output & Annotation",
    nodes: nodeDefinitions.filter((n) =>
      ["preview-output", "comment"].includes(n.type)
    ),
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNode: (nodeType: NodeType) => void;
  onAIGenerate?: (prompt: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onAddNode,
  onAIGenerate,
}: CommandPaletteProps) {
  const [mode, setMode] = useState<"search" | "ai">("search");
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [listKey, setListKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get filtered nodes based on search, in visual (categorized) order
  const filteredNodes = React.useMemo(() => {
    // Flatten categorizedNodes to get visual order
    const visualOrderNodes = categorizedNodes.flatMap((cat) => cat.nodes);

    if (!search) return visualOrderNodes;
    const query = search.toLowerCase();
    return visualOrderNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
    );
  }, [search]);

  // Memoize color class extraction for performance
  const getColorClasses = useCallback((colorString: string) => {
    const classes = colorString.split(" ");
    return {
      icon: classes.filter((c) => c.startsWith("text-")).join(" "),
      bg: classes.filter((c) => c.startsWith("bg-")).join(" "),
    };
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setMode("search");
      setSelectedIndex(0);
      setListKey((k) => k + 1); // Force list remount to re-trigger animations
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (mode === "search") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredNodes.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredNodes.length - 1
          );
        } else if (e.key === "Enter" && filteredNodes[selectedIndex]) {
          e.preventDefault();
          onAddNode(filteredNodes[selectedIndex].type);
          onOpenChange(false);
        } else if (e.key === "Tab") {
          e.preventDefault();
          setMode(mode === "search" ? "ai" : "search");
          setSearch("");
        }
      } else if (mode === "ai") {
        if (e.key === "Enter" && !e.shiftKey && search.trim()) {
          e.preventDefault();
          onAIGenerate?.(search);
          onOpenChange(false);
        } else if (e.key === "Tab") {
          e.preventDefault();
          setMode("search");
          setSearch("");
        }
      }
    },
    [mode, filteredNodes, selectedIndex, search, onAddNode, onAIGenerate, onOpenChange]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Handle clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-command-palette]")) {
        onOpenChange(false);
      }
    };

    // Delay to prevent immediate close during animation
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onOpenChange]);

  // Global keyboard shortcut to open
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === "INPUT" ||
                            target.tagName === "TEXTAREA" ||
                            target.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          onOpenChange(!open);
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 glass-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* Palette Container */}
          <motion.div
            data-command-palette
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-[560px] -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={springs.snappy}
          >
            <div
              className={cn(
                "glass-panel",
                // AI mode gradient border
                mode === "ai" && "ring-1 ring-purple-500/30"
              )}
            >
              {/* Search Input */}
              <div
                className={cn(
                  "relative flex items-center gap-3 border-b glass-divider px-4",
                  mode === "ai" &&
                    "bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5"
                )}
              >
                {/* Mode Icon */}
                <div className="flex items-center">
                  {mode === "search" ? (
                    <Search className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <motion.div
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={springs.bouncy}
                    >
                      <Sparkles className="h-5 w-5 text-purple-400" />
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-label={mode === "search" ? "Search nodes" : "AI generation prompt"}
                  aria-expanded={mode === "search" && filteredNodes.length > 0}
                  aria-controls={mode === "search" ? "command-palette-list" : undefined}
                  aria-activedescendant={
                    mode === "search" && filteredNodes[selectedIndex]
                      ? `node-${filteredNodes[selectedIndex].type}`
                      : undefined
                  }
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === "search"
                      ? "Search nodes..."
                      : "Ask AI to generate nodes..."
                  }
                  className={cn(
                    "flex-1 bg-transparent py-4 text-base text-white",
                    "placeholder:text-zinc-500",
                    "outline-none focus:outline-none",
                    "font-medium"
                  )}
                />

                {/* Mode Toggle */}
                <button
                  onClick={() => {
                    setMode(mode === "search" ? "ai" : "search");
                    setSearch("");
                    inputRef.current?.focus();
                  }}
                  aria-label={`Switch to ${mode === "search" ? "AI" : "search"} mode`}
                  aria-pressed={mode === "ai"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    mode === "search"
                      ? "text-zinc-400 hover:text-white hover:bg-white/5"
                      : "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                  )}
                >
                  {mode === "search" ? (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>AI</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3 w-3" />
                      <span>Search</span>
                    </>
                  )}
                  <kbd className="ml-1 rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-500">
                    Tab
                  </kbd>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-md p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results List (Search Mode) */}
              {mode === "search" && (
                <div
                  ref={listRef}
                  id="command-palette-list"
                  role="listbox"
                  aria-label="Available nodes"
                  className="max-h-[400px] overflow-y-auto overscroll-contain py-2"
                >
                  {filteredNodes.length === 0 ? (
                    <div className="py-8 text-center text-sm text-zinc-500">
                      No nodes found for &ldquo;{search}&rdquo;
                    </div>
                  ) : (
                    <motion.div
                      key={listKey}
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          transition: {
                            staggerChildren: 0.03,
                          },
                        },
                      }}
                    >
                      {categorizedNodes.map((category) => {
                        const visibleNodes = category.nodes.filter((node) =>
                          filteredNodes.some((fn) => fn.type === node.type)
                        );

                        if (visibleNodes.length === 0) return null;

                        return (
                          <div key={category.category} className="mb-2">
                            <div className="px-4 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                              {category.category}
                            </div>
                            {visibleNodes.map((node) => {
                              const nodeIndex = filteredNodes.findIndex(
                                (n) => n.type === node.type
                              );
                              const isSelected = nodeIndex === selectedIndex;
                              const Icon = iconMap[node.type];
                              const { icon: iconColorClass, bg: bgColorClass } = getColorClasses(node.color);

                              return (
                                <motion.button
                                  key={node.type}
                                  id={`node-${node.type}`}
                                  role="option"
                                  aria-selected={isSelected}
                                  data-selected={isSelected}
                                  onClick={() => {
                                    onAddNode(node.type);
                                    onOpenChange(false);
                                  }}
                                  onMouseEnter={() =>
                                    setSelectedIndex(nodeIndex)
                                  }
                                  className={cn(
                                    "relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
                                    "group cursor-pointer",
                                    isSelected
                                      ? "bg-white/5"
                                      : "hover:bg-white/[0.02]"
                                  )}
                                  variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1 },
                                  }}
                                  transition={springs.snappy}
                                >
                                  {/* Selection Indicator */}
                                  <div
                                    className={cn(
                                      "absolute left-0 w-0.5 h-6 rounded-full transition-all",
                                      isSelected
                                        ? "bg-blue-500"
                                        : "bg-transparent"
                                    )}
                                  />

                                  {/* Icon */}
                                  <div
                                    className={cn(
                                      "flex items-center justify-center w-9 h-9 rounded-lg",
                                      bgColorClass || "bg-zinc-800"
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        "h-4 w-4",
                                        iconColorClass || "text-zinc-400"
                                      )}
                                    />
                                  </div>

                                  {/* Text Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white">
                                      {node.label}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                      {node.description}
                                    </div>
                                  </div>

                                  {/* Arrow indicator on selection */}
                                  <ArrowRight
                                    className={cn(
                                      "h-4 w-4 transition-all",
                                      isSelected
                                        ? "opacity-100 text-blue-400 translate-x-0"
                                        : "opacity-0 -translate-x-2"
                                    )}
                                  />
                                </motion.button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              )}

              {/* AI Mode Content */}
              {mode === "ai" && (
                <div className="p-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-4">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Generate with AI
                    </h3>
                    <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-4">
                      Describe what you want to build and AI will generate the
                      nodes for you.
                    </p>
                    {search.trim() && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          onAIGenerate?.(search);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                          "bg-purple-600 hover:bg-purple-500 text-white",
                          "font-medium text-sm transition-colors"
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Flow
                        <kbd className="ml-2 rounded bg-purple-700/50 px-1.5 py-0.5 text-xs">
                          Enter
                        </kbd>
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t glass-divider px-4 py-2.5 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium">
                      ↑
                    </kbd>
                    <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium">
                      ↓
                    </kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium">
                      ↵
                    </kbd>
                    <span className="ml-1">Insert</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium">
                    Esc
                  </kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
