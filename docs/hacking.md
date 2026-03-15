# Hacking Ilmomasiina

This document presents a few ways you might want to use Ilmomasiina outside our pre-packaged image.

## API models

You can implement a custom API client by using the Zod schemas from `src/models/schema/` as a reference
for the API request and response shapes.

## App customization

**If you only wish to change colors and texts,** you might want to avoid forking our repo. Branding
is configurable via environment variables (header title, footer links, login placeholder) and
CSS variables (`--color-brand-*`). See [.env.example](../.env.example) for available options.

For deeper customization, fork the repository and modify the source code. Translations are in
`src/i18n/fi.ts` and `src/i18n/en.ts`.

Don't forget to submit a PR if your code might be useful to others!
