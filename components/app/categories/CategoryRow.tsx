"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryDto } from "./CategoryForm";

export type RowAction = "edit" | "delete" | "addChild";

export type DragState = {
  dragId: string | null;
  overId: string | null;
  overPos: "before" | "after" | null;
};

export type DragHandlers = {
  onDragStart: (id: string, parentId: string | null) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, id: string, parentId: string | null) => void;
  onDrop: (id: string, parentId: string | null) => void;
  onDragEnd: () => void;
};

export function CategoryRow({
  category,
  expanded,
  onToggle,
  hasChildren,
  isChild,
  onAction,
  drag,
  dragState,
  parentScope,
}: {
  category: CategoryDto;
  expanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  isChild?: boolean;
  onAction: (action: RowAction) => void;
  drag: DragHandlers;
  dragState: DragState;
  /** Уровень DnD: null = корень, либо id родителя */
  parentScope: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, [menuOpen]);

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;
  const color = category.color ?? "#94A3B8";

  const isDragging = dragState.dragId === category.id;
  const isOver = dragState.overId === category.id && dragState.dragId !== category.id;
  const showTop = isOver && dragState.overPos === "before";
  const showBottom = isOver && dragState.overPos === "after";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", category.id);
        drag.onDragStart(category.id, parentScope);
      }}
      onDragOver={(e) => drag.onDragOver(e, category.id, parentScope)}
      onDrop={(e) => {
        e.preventDefault();
        drag.onDrop(category.id, parentScope);
      }}
      onDragEnd={drag.onDragEnd}
      className={cn(
        "group card card-hover flex items-center gap-3 px-3 py-3",
        isChild && "bg-bg/30",
        isDragging && "opacity-40",
        showTop && "shadow-[inset_0_2px_0_0_var(--color-primary)]",
        showBottom && "shadow-[inset_0_-2px_0_0_var(--color-primary)]",
      )}
    >
      <span
        aria-hidden
        className="text-text-muted/60 cursor-grab active:cursor-grabbing shrink-0 select-none"
        title="Перетащите для смены порядка"
      >
        <GripVertical className="w-4 h-4" />
      </span>

      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text shrink-0"
        >
          <ChevronIcon className="w-4 h-4" />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
      >
        {category.icon ?? "•"}
      </div>

      <p className="font-medium flex-1 truncate text-sm">{category.name}</p>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Действия"
          className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface",
            "md:opacity-0 md:group-hover:opacity-100 md:transition-opacity",
            menuOpen && "md:opacity-100 bg-surface",
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-20 w-56 card shadow-lg border border-border py-1"
          >
            <MenuItem
              icon={<Pencil className="w-3.5 h-3.5 text-text-muted" />}
              label="Изменить"
              onClick={() => {
                setMenuOpen(false);
                onAction("edit");
              }}
            />
            {!isChild && (
              <MenuItem
                icon={<FolderPlus className="w-3.5 h-3.5 text-text-muted" />}
                label="Добавить подкатегорию"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("addChild");
                }}
              />
            )}
            <MenuItem
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label="Удалить"
              danger
              onClick={() => {
                setMenuOpen(false);
                onAction("delete");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg text-left",
        danger && "text-expense",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
