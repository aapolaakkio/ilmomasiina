import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { env } from "@/env";

const mailTransporter: Transporter = (() => {
  if (env.NODE_ENV === "test") {
    return nodemailer.createTransport({
      name: "console fallback",
      version: "0",
      send(mail, callback) {
        // Ignore emails in test environment
        const { message } = mail;
        const envelope = message.getEnvelope();
        const messageId = message.messageId();
        setImmediate(() =>
          callback(null, {
            envelope,
            messageId,
          } as unknown as SMTPTransport.SentMessageInfo),
        );
      },
    });
  }

  if (env.SMTP_HOST) {
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
      throw new Error("Invalid email config: SMTP_USER and SMTP_PASSWORD must be set with SMTP_HOST.");
    }
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? undefined,
      secure: env.SMTP_TLS,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  console.warn("SMTP is not configured. Falling back to debug mail service.");
  return nodemailer.createTransport({
    name: "console fallback",
    version: "0",
    send(mail, callback) {
      const { message } = mail;
      const envelope = message.getEnvelope();
      const messageId = message.messageId();
      const input = message.createReadStream();
      let data = "";
      input.on("data", (chunk) => {
        data += chunk;
      });
      input.on("end", () => {
        console.log(data);
        callback(null, {
          envelope,
          messageId,
        } as SMTPTransport.SentMessageInfo);
      });
    },
  });
})();

export default mailTransporter;
