"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        <Plus className="w-4 h-4" />
        Новый проект
      </button>
      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
