import { PaymentStatus, type SignupID } from "@/db/schema";
import type { SignupForEditResponse } from "@/db/zod";

import { db } from "../../db";
import { getSignupForEdit } from "../signups/getSignupForEdit";
import { PaymentNotComplete, PaymentNotFound } from "./errors";
import { refreshCheckoutSession } from "./stripe";

/** Complete a payment and return the updated signup info. */
export async function completePayment(signupId: SignupID): Promise<SignupForEditResponse> {
  const payment = await db.query.payments.findFirst({
    where: {
      signupId: { eq: signupId },
      status: {
        in: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID],
      },
    },
  });

  if (!payment) throw new PaymentNotFound("No active payment found for signup");

  if (payment.status === PaymentStatus.PENDING) {
    const session = await refreshCheckoutSession(payment);
    if (session.status !== "complete") throw new PaymentNotComplete("Payment session is not complete");
  }

  return getSignupForEdit(signupId);
}
