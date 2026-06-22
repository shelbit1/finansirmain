"use client";

import { useState } from "react";
import { Trash2, FolderOpen } from "lucide-react";
import { deleteProjectAction } from "@/app/actions/business";
import { formatDate } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

export function ProjectCard({ project }: { project: Project }) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await deleteProjectAction(project.id);
  }

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3 group min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FolderOpen className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base truncate">{project.name}</p>
          {project.description ? (
            <p className="text-xs sm:text-sm text-text-muted mt-0.5 line-clamp-2">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-0.5 italic">Без описания</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <span className="text-xs text-text-muted">
          Создан {formatDate(project.createdAt)}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          className={
            confirming
              ? "text-xs font-medium text-expense hover:underline"
              : "p-1.5 rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 transition-colors opacity-0 group-hover:opacity-100"
          }
          title={confirming ? undefined : "Удалить проект"}
        >
          {confirming ? "Подтвердить удаление" : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
