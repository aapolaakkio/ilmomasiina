export enum SignupState {
  disabled = "disabled",
  not_opened = "not_opened",
  open = "open",
  closed = "closed",
}

export type SignupStateInfo =
  | { state: SignupState.disabled }
  | { state: SignupState.not_opened; opens: Date }
  | { state: SignupState.open; closes: Date }
  | { state: SignupState.closed; closed: Date };

export function signupState(opens: Date | null, closes: Date | null): SignupStateInfo {
  if (opens === null || closes === null) {
    return { state: SignupState.disabled };
  }

  const now = new Date();

  if (now < opens) {
    return { state: SignupState.not_opened, opens };
  }

  if (now < closes) {
    return { state: SignupState.open, closes };
  }

  return { state: SignupState.closed, closed: closes };
}
