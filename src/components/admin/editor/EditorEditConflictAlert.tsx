"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Labels = {
  title: string;
  info: string;
  cancel: string;
  revert: string;
  overwrite: string;
};

type Props = {
  labels: Labels;
  onCancel: () => void;
  onRevert: () => void;
  onOverwrite: () => void;
};

export function EditorEditConflictAlert({ labels, onCancel, onRevert, onOverwrite }: Props) {
  return (
    <Alert variant="danger" className="mb-4">
      <p className="mb-2 font-semibold">{labels.title}</p>
      <p className="mb-3 text-sm">{labels.info}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="small" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button variant="secondary" size="small" onClick={onRevert}>
          {labels.revert}
        </Button>
        <Button variant="danger" size="small" onClick={onOverwrite}>
          {labels.overwrite}
        </Button>
      </div>
    </Alert>
  );
}
