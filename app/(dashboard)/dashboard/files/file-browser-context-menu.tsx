"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function FileBrowserContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[100] min-w-[180px] rounded-lg border border-[var(--outline)] bg-[var(--card)] py-1 shadow-lg"
      style={{ left: x, top: y, fontSize: "var(--text-body2)" }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
