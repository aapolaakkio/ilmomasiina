"use client";

import type { HookActionStatus } from "next-safe-action/hooks";

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
  proceedActionStatus: HookActionStatus;
  onCancel: () => void;
  onProceed: () => void | Promise<void>;
};

export function EditorMoveToQueueAlert({ labels, proceedActionStatus, onCancel, onProceed }: Props) {
  return (
    <Alert variant="danger" className="mb-4">
      <p className="mb-2 font-semibold">{labels.title}</p>
      <p className="mb-3 text-sm">{labels.info}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="small" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button variant="danger" size="small" actionStatus={proceedActionStatus} onClick={() => void onProceed()}>
          {labels.proceed}
        </Button>
      </div>
    </Alert>
  );
}
