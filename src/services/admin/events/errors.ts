/* eslint-disable max-classes-per-file */
import { ErrorCode, type QuestionID, type QuotaID } from "@/db/schema";
import type { EditConflictError, WouldMoveSignupsToQueueError } from "@/db/zod";

import CustomError from "../../../util/customError";

export class EditConflict extends CustomError implements EditConflictError {
  public readonly updatedAt: Date;
  public readonly deletedQuotas: QuotaID[];
  public readonly deletedQuestions: QuestionID[];

  constructor(updatedAt: Date, deletedQuotas: QuotaID[], deletedQuestions: QuestionID[]) {
    super(409, ErrorCode.EDIT_CONFLICT, `the event was updated separately at ${updatedAt.toISOString()}`);
    this.updatedAt = updatedAt;
    this.deletedQuotas = deletedQuotas;
    this.deletedQuestions = deletedQuestions;
  }
}

export class WouldMoveSignupsToQueue extends CustomError implements WouldMoveSignupsToQueueError {
  public readonly count: number;

  constructor(count: number) {
    super(409, ErrorCode.WOULD_MOVE_SIGNUPS_TO_QUEUE, `this change would move ${count} signups into the queue`);
    this.count = count;
  }
}
