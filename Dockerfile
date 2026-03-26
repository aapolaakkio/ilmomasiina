FROM node:24-alpine AS base

ARG NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT=Ilmomasiina
ARG NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT=Ilmomasiina
ARG NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT=Tietosuoja
ARG NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK=https://example.com
ARG NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT=Example.com
ARG NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK=https://example.com
ARG NEXT_PUBLIC_BRANDING_CANCELLATION_LINK=https://example.com
ARG NEXT_PUBLIC_DEFAULT_LANGUAGE=fi
ARG NEXT_PUBLIC_APP_TIMEZONE=Europe/Helsinki
ARG NODE_ENV=production

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --ignore-scripts

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT=${NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT}
ENV NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT=${NEXT_PUBLIC_BRANDING_HEADER_TITLE_TEXT_SHORT}
ENV NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT=${NEXT_PUBLIC_BRANDING_FOOTER_GDPR_TEXT}
ENV NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK=${NEXT_PUBLIC_BRANDING_FOOTER_GDPR_LINK}
ENV NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT=${NEXT_PUBLIC_BRANDING_FOOTER_HOME_TEXT}
ENV NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK=${NEXT_PUBLIC_BRANDING_FOOTER_HOME_LINK}
ENV NEXT_PUBLIC_BRANDING_CANCELLATION_LINK=${NEXT_PUBLIC_BRANDING_CANCELLATION_LINK}
ENV NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE}
ENV NEXT_PUBLIC_APP_TIMEZONE=${NEXT_PUBLIC_APP_TIMEZONE}
ENV NODE_ENV=${NODE_ENV}

ARG SKIP_ENV_VALIDATION
ARG DATABASE_URL
ENV SKIP_ENV_VALIDATION=${SKIP_ENV_VALIDATION}
ENV DATABASE_URL=${DATABASE_URL}
RUN corepack enable pnpm && pnpm run build

# Remove prerendered RSC/meta files that contain build-time data
# https://github.com/vercel/next.js/discussions/46544#discussioncomment-11136615
RUN find . -type f -name '*.meta' -exec rm -f {} \;
RUN find . -type f -name '*.rsc' -exec rm -f {} \;

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=${NODE_ENV}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone Next.js build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
