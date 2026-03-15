import { QuestionType } from "@/models";

export function normalizeQuestionOptions(attrs: {
  type?: string;
  options?: string[] | null;
  prices?: number[] | null;
}) {
  const output: { options?: string[] | null; prices?: number[] | null } = {};
  if (
    (attrs.type !== QuestionType.CHECKBOX && attrs.type !== QuestionType.SELECT) ||
    !attrs.options ||
    attrs.options.length === 0
  ) {
    output.options = null;
    output.prices = null;
  }
  if (attrs.prices?.every((price) => price === 0)) {
    output.prices = null;
  }
  return output;
}
