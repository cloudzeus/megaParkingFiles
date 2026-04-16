"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { HiOutlineFolder, HiOutlineFolderOpen, HiOutlineChevronRight, HiOutlineChevronDown } from "react-icons/hi2";

type FolderNode = {
  id: number;
  name: string;
  path: string;
  isDepartmentRoot: boolean;
  children: FolderNode[];
};

type Props = {
  currentFolderId: number | null;
  onMoveFileToFolder?: (fileId: number, targetFolderId: number) => void;
  isDropTarget?: number | null;
  onDropTargetChange?: (id: number | null) => void;
};

/** Collect folder IDs from root down to targetId (path to open). */
function pathToFolderId(nodes: FolderNode[], targetId: number, path: number[] = []): number[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [...path, n.id];
    const found = pathToFolderId(n.children, targetId, [...path, n.id]);
    if (found) return found;
  }
  return null;
}

/** Path from root to folder (id + name) for display. */
function pathToFolderNodes(nodes: FolderNode[], targetId: number, acc: { id: number; name: string }[] = []): { id: number; name: string }[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [...acc, { id: n.id, name: n.name }];
    const found = pathToFolderNodes(n.children, targetId, [...acc, { id: n.id, name: n.name }]);
    if (found) return found;
  }
  return null;
}

function TreeItem({
  node,
  currentFolderId,
  level,
  expandedIds,
  onToggleExpand,
  onMoveFileToFolder,
  isDropTarget,
  onDropTargetChange,
  activeRowRef,
}: {
  node: FolderNode;
  currentFolderId: number | null;
  level: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onMoveFileToFolder?: (fileId: number, targetFolderId: number) => void;
  isDropTarget?: number | null;
  onDropTargetChange?: (id: number | null) => void;
  activeRowRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const isActive = currentFolderId === node.id;
  const isTarget = isDropTarget === node.id;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  function handleRowClick() {
    router.push(`/dashboard/files?folderId=${node.id}`);
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleExpand(node.id);
  }

  function handleDragOver(e: React.DragEvent) {
    if (onDropTargetChange && e.dataTransfer.types.includes("application/filesharex-file-id")) {
      e.preventDefault();
      e.stopPropagation();
      onDropTargetChange(node.id);
    }
  }

  function handleDragLeave() {
    onDropTargetChange?.(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    onDropTargetChange?.(null);
    const fileIdStr = e.dataTransfer.getData("application/filesharex-file-id");
    if (fileIdStr && onMoveFileToFolder) onMoveFileToFolder(Number(fileIdStr), node.id);
  }

  return (
    <div className="select-none" style={{ paddingLeft: level * 8 }} ref={isActive && activeRowRef ? activeRowRef : undefined}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => e.key === "Enter" && handleRowClick()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 transition ${
          isActive
            ? "bg-[var(--primary)]/15 font-medium text-[var(--primary)] [&_svg]:text-[var(--primary)]"
            : "text-[var(--foreground)]/90 hover:bg-[var(--muted)] [&_svg]:text-[var(--foreground)]/70"
        } ${isTarget ? "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--card)]" : ""}`}
        style={{ fontSize: "var(--text-caption)" }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleChevronClick}
            className="shrink-0 rounded p-0.5 hover:bg-[var(--foreground)]/10"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Σύμπτυξη" : "Ανάπτυξη"}
          >
            {isExpanded ? (
              <HiOutlineChevronDown className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <HiOutlineChevronRight className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" aria-hidden />
        )}
        {isExpanded && hasChildren ? (
          <HiOutlineFolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <HiOutlineFolder className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            currentFolderId={currentFolderId}
            level={level + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onMoveFileToFolder={onMoveFileToFolder}
            isDropTarget={isDropTarget}
            onDropTargetChange={onDropTargetChange}
            activeRowRef={activeRowRef}
          />
        ))}
    </div>
  );
}

export function FileBrowserSidebar({
  currentFolderId,
  onMoveFileToFolder,
  isDropTarget,
  onDropTargetChange,
}: Props) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/folders/tree")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.tree) setTree(data.tree);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-expand ancestors so current folder is visible (Windows-style)
  useEffect(() => {
    if (currentFolderId == null || tree.length === 0) return;
    const path = pathToFolderId(tree, currentFolderId);
    if (path) {
      queueMicrotask(() => {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          path.slice(0, -1).forEach((id) => next.add(id)); // expand ancestors only
          return next;
        });
      });
    }
  }, [currentFolderId, tree]);

  // Scroll selected folder into view once tree is expanded
  useEffect(() => {
    if (currentFolderId == null || !activeRowRef.current) return;
    const t = setTimeout(() => {
      activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 100);
    return () => clearTimeout(t);
  }, [currentFolderId, expandedIds]);

  const onToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pathNodes = currentFolderId != null ? pathToFolderNodes(tree, currentFolderId) ?? [] : [];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--outline)] bg-[var(--surface)]">
      <div className="border-b border-[var(--outline)] px-2 py-1.5 font-semibold text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
        {el.fileBrowserRoot}
      </div>
      {pathNodes.length > 0 && (
        <div className="border-b border-[var(--outline)] px-2 py-1.5 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }} title={pathNodes.map((p) => p.name).join(" / ")}>
          <span className="block truncate">{pathNodes.map((p) => p.name).join(" → ")}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push("/dashboard/files")}
          onKeyDown={(e) => e.key === "Enter" && router.push("/dashboard/files")}
          className={`mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition ${
            currentFolderId === null
              ? "bg-[var(--primary)]/15 font-medium text-[var(--primary)] [&_svg]:text-[var(--primary)]"
              : "text-[var(--foreground)]/90 hover:bg-[var(--muted)] [&_svg]:text-[var(--foreground)]/70"
          }`}
          style={{ fontSize: "var(--text-caption)" }}
        >
          <HiOutlineFolder className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {el.rootLevel}
        </div>
        {loading ? (
          <p className="px-1.5 py-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
            Φόρτωση…
          </p>
        ) : (
          tree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              currentFolderId={currentFolderId}
              level={0}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onMoveFileToFolder={onMoveFileToFolder}
              isDropTarget={isDropTarget}
              onDropTargetChange={onDropTargetChange}
              activeRowRef={activeRowRef}
            />
          ))
        )}
      </div>
    </aside>
  );
}
