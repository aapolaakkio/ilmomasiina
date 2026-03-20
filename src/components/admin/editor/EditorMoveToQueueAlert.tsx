"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Labels = {
  title: string;
  info: string;
  cancel: string;
  proceed: string;
};

type Props = {
  labels: Labels;
  submitting: boolean;
  onCancel: () => void;
  onProceed: () => void | Promise<void>;
};

export function EditorMoveToQueueAlert({ labels, submitting, onCancel, onProceed }: Props) {
  return (
    <Alert variant="danger" className="mb-4">
      <p className="mb-2 font-semibold">{labels.title}</p>
      <p className="mb-3 text-sm">{labels.info}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="small" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button variant="danger" size="small" disabled={submitting} onClick={() => void onProceed()}>
          {labels.proceed}
        </Button>
      </div>
    </Alert>
  );
}
