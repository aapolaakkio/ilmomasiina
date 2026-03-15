import type { SignupForEditResponse, SignupID } from "@/models";

import { db } from "../../db";
import { getSignupForEdit } from "../signups/getSignupForEdit";
import { PaymentNotComplete, PaymentNotFound } from "./errors";
import { refreshCheckoutSession } from "./stripe";
import { PaymentStatus } from "@/models";

/** Complete a payment and return the updated signup info. */
// eslint-disable-next-line import/prefer-default-export
export async function completePayment(signupId: SignupID): Promise<SignupForEditResponse> {
  const payment = await db.query.payments.findFirst({
    where: {
      signupId,
      status: { in: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID] },
    },
  });

  if (!payment) throw new PaymentNotFound("No active payment found for signup");

  if (payment.status === PaymentStatus.PENDING) {
    const session = await refreshCheckoutSession(payment);
    if (session.status !== "complete") throw new PaymentNotComplete("Payment session is not complete");
  }

  return getSignupForEdit(signupId);
}
