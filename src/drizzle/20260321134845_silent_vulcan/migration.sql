CREATE TYPE "enum_audit_event" AS ENUM('event.create', 'event.delete', 'event.publish', 'event.unpublish', 'event.edit', 'signup.queuePromote', 'signup.create', 'signup.delete', 'signup.edit', 'user.create', 'user.delete');--> statement-breakpoint
CREATE TYPE "enum_signup_manualPaymentStatus" AS ENUM('none', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "enum_event_payments" AS ENUM('disabled', 'manual', 'online');--> statement-breakpoint
CREATE TYPE "enum_payment_status" AS ENUM('creating', 'pending', 'paid', 'expired', 'creation_failed', 'refunded');--> statement-breakpoint
CREATE TYPE "enum_question_type" AS ENUM('text', 'textarea', 'number', 'select', 'checkbox');--> statement-breakpoint
CREATE TYPE "enum_user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "answer" (
	"id" serial PRIMARY KEY,
	"questionId" char(12) NOT NULL,
	"signupId" char(12) NOT NULL,
	"answer" json NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auditlog" (
	"id" serial PRIMARY KEY,
	"user" varchar(255),
	"ipAddress" varchar(64) NOT NULL,
	"action" "enum_audit_event" NOT NULL,
	"eventId" char(12),
	"eventName" varchar(255),
	"signupId" char(12),
	"signupName" varchar(255),
	"extra" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_editor" (
	"eventId" char(12),
	"userId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_editor_pkey" PRIMARY KEY("eventId","userId")
);
--> statement-breakpoint
CREATE TABLE "event_language" (
	"eventId" char(12),
	"language" varchar(8),
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" varchar(255),
	"location" text,
	"webpageUrl" varchar(2048),
	"verificationEmail" text,
	CONSTRAINT "event_language_pkey" PRIMARY KEY("eventId","language")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" char(12) PRIMARY KEY,
	"slug" varchar(255) NOT NULL UNIQUE,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"description" text,
	"price" varchar(255),
	"location" text,
	"webpageUrl" varchar(2048),
	"verificationEmail" text,
	"date" timestamp with time zone,
	"endDate" timestamp with time zone,
	"registrationStartDate" timestamp with time zone,
	"registrationEndDate" timestamp with time zone,
	"openQuotaSize" integer DEFAULT 0 NOT NULL,
	"category" varchar(255) DEFAULT '' NOT NULL,
	"draft" boolean DEFAULT true NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"signupsPublic" boolean DEFAULT false NOT NULL,
	"nameQuestion" boolean DEFAULT true NOT NULL,
	"emailQuestion" boolean DEFAULT true NOT NULL,
	"payments" "enum_event_payments" DEFAULT 'disabled'::"enum_event_payments" NOT NULL,
	"defaultLanguage" varchar(8) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY,
	"signupId" varchar(255) NOT NULL,
	"stripeCheckoutSessionId" varchar(255) UNIQUE,
	"status" "enum_payment_status" DEFAULT 'creating'::"enum_payment_status" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"products" json NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_language" (
	"questionId" char(12),
	"language" varchar(8),
	"question" varchar(1024) NOT NULL,
	"options" json,
	CONSTRAINT "question_language_pkey" PRIMARY KEY("questionId","language")
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" char(12) PRIMARY KEY,
	"eventId" char(12) NOT NULL,
	"question" varchar(1024) DEFAULT '' NOT NULL,
	"options" json,
	"order" integer NOT NULL,
	"type" "enum_question_type" NOT NULL,
	"prices" json,
	"required" boolean DEFAULT true NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quota_language" (
	"quotaId" char(12),
	"language" varchar(8),
	"title" varchar(255) NOT NULL,
	CONSTRAINT "quota_language_pkey" PRIMARY KEY("quotaId","language")
);
--> statement-breakpoint
CREATE TABLE "quota" (
	"id" char(12) PRIMARY KEY,
	"eventId" char(12) NOT NULL,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"order" integer NOT NULL,
	"size" integer,
	"price" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "signup" (
	"id" char(12) PRIMARY KEY,
	"quotaId" char(12) NOT NULL,
	"firstName" varchar(255),
	"lastName" varchar(255),
	"namePublic" boolean DEFAULT false NOT NULL,
	"email" varchar(255),
	"language" varchar(8),
	"confirmedAt" timestamp(3) with time zone,
	"price" integer,
	"currency" varchar(8),
	"products" json,
	"manualPaymentStatus" "enum_signup_manualPaymentStatus",
	"createdAt" timestamp(3) with time zone NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"role" "enum_user_role" DEFAULT 'user'::"enum_user_role" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_answer_signupId" ON "answer" ("signupId");--> statement-breakpoint
CREATE INDEX "idx_answer_questionId" ON "answer" ("questionId");--> statement-breakpoint
CREATE INDEX "idx_event_editor_userId" ON "event_editor" ("userId");--> statement-breakpoint
CREATE INDEX "idx_payment_signupId" ON "payment" ("signupId");--> statement-breakpoint
CREATE INDEX "idx_question_eventId" ON "question" ("eventId");--> statement-breakpoint
CREATE INDEX "idx_quota_eventId" ON "quota" ("eventId");--> statement-breakpoint
CREATE INDEX "idx_signup_quotaId" ON "signup" ("quotaId");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" ("email");--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_questionId_question_id_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_signupId_signup_id_fkey" FOREIGN KEY ("signupId") REFERENCES "signup"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auditlog" ADD CONSTRAINT "auditlog_eventId_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auditlog" ADD CONSTRAINT "auditlog_signupId_signup_id_fkey" FOREIGN KEY ("signupId") REFERENCES "signup"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "event_editor" ADD CONSTRAINT "event_editor_eventId_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_editor" ADD CONSTRAINT "event_editor_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_language" ADD CONSTRAINT "event_language_eventId_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_signupId_signup_id_fkey" FOREIGN KEY ("signupId") REFERENCES "signup"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question_language" ADD CONSTRAINT "question_language_questionId_question_id_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_eventId_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quota_language" ADD CONSTRAINT "quota_language_quotaId_quota_id_fkey" FOREIGN KEY ("quotaId") REFERENCES "quota"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quota" ADD CONSTRAINT "quota_eventId_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "signup" ADD CONSTRAINT "signup_quotaId_quota_id_fkey" FOREIGN KEY ("quotaId") REFERENCES "quota"("id") ON DELETE CASCADE;