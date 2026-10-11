# MediLens: Smart Summaries

Build "MediLens", a mobile-first responsive healthcare web app (works from 360px phones to desktop, no horizontal scroll, installable PWA). Tagline: "Smarter Medical Summaries and Faster Decisions". Stack: React + TypeScript + Tailwind + shadcn/ui + React Router. Style: teal/blue (#0EA5A4 / #2563EB), rounded-2xl cards, Inter font, light/dark mode.

Connect Supabase and use Supabase Auth with real email:

- Landing page (/) with hero, 4-step flow (Upload → Extract → Summarize → Verify), features, footer crediting "M. Chandrakanth Reddy, Domala Poojitha, Katta Poojitha – CSE (AI & ML), CVR College of Engineering".

- Sign In (/login): email, password with show/hide, forgot password link, Google sign-in.

- Sign Up (/register): name, email, password + confirm with strength meter, role dropdown (Patient, Doctor, Specialist, Medical Coder, Researcher, Insurance Provider), extra license number field for Doctor/Specialist. Save role in a `profiles` table with RLS.

- Verify Email (/verify-email): 6-box OTP input (numeric keypad, paste support, 60s resend timer) using verifyOtp, also supports the confirmation link via /auth/callback.

- Forgot Password (/forgot-password): sends reset email via resetPasswordForEmail with a neutral success message. Then /verify-reset (6-digit OTP) and /reset-password (new + confirm password, strength meter, updateUser, then redirect to login with a toast).

- Auth screens: split layout on desktop, compact full-width card on mobile.

- Protected routes redirect to /login; add 404 and 403 pages.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e498efcd-21f2-44f7-b4ca-8598b721f6b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
