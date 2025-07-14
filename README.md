<div align="center">

# 🚀 WrenchTrack

**Modern, full-stack workshop & invoice manager**  
Built with **React 18, Vite, Firebase, Tailwind CSS & Chart.js**  

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)
[![Build](https://img.shields.io/github/actions/workflow/status/yourusername/wrenchtrack/ci.yml?label=build)](https://github.com/yourusername/wrenchtrack/actions)
[![Demo](https://img.shields.io/badge/demo-live-green?logo=vercel)](https://wrenchtrack.vercel.app)

</div>

---

## ✨ Why WrenchTrack?

* **All-in-one dashboard** – invoices, parts, vehicles, customers, analytics.
* **Realtime sync** with Firebase v10 (no refreshes).
* **Dark / light theme** with a single click.
* **PWA-ready** – install it on tablets in the shop.
* **Granular role control** – techs, service writers, owners.
* **Zero config deploy** – push to Vercel or Netlify and you’re online.

<p align="center">
  <img src="docs/readme/dashboard-light.png" width="45%" alt="Dashboard light mode"/>
  <img src="docs/readme/dashboard-dark.png" width="45%" alt="Dashboard dark mode"/>
</p>

---

## ⚙️ Tech Stack

| Layer            | What we use                                |
|------------------|--------------------------------------------|
| **Frontend**     | React 18 · Vite · Tailwind CSS · Lucide icons · Framer Motion |
| **Data / API**   | Firebase Auth & Firestore 10 · Cloud Functions (optional) |
| **State**        | TanStack Query · React Context hooks (`useAuth`, `useInvoice`, `useTheme`, `useJobLog`) |
| **Charts**       | Chart.js 4 + `react-chartjs-2` |
| **Testing**      | Jest · React-Testing-Library |
| **CI / CD**      | GitHub Actions · Vercel preview deploys |
| **Lint / Format**| ESLint · Prettier · Husky pre-commit hooks |

---

## 🚀 Quick Start

```bash
git clone https://github.com/yourusername/wrenchtrack.git
cd wrenchtrack_vite_final

# 1 Install
npm i          # or pnpm i / yarn

# 2 Config ⬇
cp .env.example .env
# → add your Firebase keys + optional envs

# 3 Dev server
npm run dev

# open http://localhost:5173 💥
