<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366F1,50:8B5CF6,100:06B6D4&height=220&section=header&text=Strides%20Intern%20Management%20AI&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Onboard%20%E2%80%A2%20Assign%20%E2%80%A2%20Track%20%E2%80%A2%20Evaluate%20%E2%80%94%20powered%20by%20AI&descAlignY=58&descSize=18" alt="Strides Intern Management AI banner" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=8B5CF6&center=true&vCenter=true&width=720&lines=Manage+interns+smarter%2C+not+harder;AI-assisted+task+tracking+%26+insights;Real-time+dashboards+%26+analytics;Built+with+Next.js+16+%7C+React+19+%7C+TypeScript" alt="Typing animation" />
</a>

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-Runtime-FBF0DF?style=for-the-badge&logo=bun&logoColor=black)

![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/siddheshsalve77/Strides-Intern-Management-AI?style=flat-square&color=8B5CF6)
![Stars](https://img.shields.io/github/stars/siddheshsalve77/Strides-Intern-Management-AI?style=flat-square&color=FFCA28)

</div>

---

## 📖 Overview

**Strides Intern Management AI** is a modern web platform that helps organizations run their internship programs end to end. It brings interns, mentors and admins into one place — with task boards, progress analytics, real-time updates and an AI assistant that removes the repetitive work of managing a cohort.

> 💡 **Why it exists:** spreadsheets and chat threads don't scale. Strides gives every intern a clear path and gives every manager a live picture of how the program is going.

---

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 🧑‍🎓 | **Intern Management** | Profiles, cohorts, roles and onboarding in a single workspace |
| 📋 | **Drag-and-Drop Task Boards** | Kanban-style task tracking powered by `dnd-kit` |
| 🤖 | **AI Assistant** | Generates summaries, feedback and suggestions with Markdown-rendered responses |
| 📊 | **Analytics Dashboards** | Progress, performance and workload charts built with Recharts |
| ⚡ | **Real-Time Updates** | WebSocket mini-service keeps every screen in sync |
| 🔐 | **Secure Data Layer** | Firestore & Storage security rules, plus Supabase and Prisma integrations |
| 🌍 | **Multi-Language Ready** | Internationalization with `next-intl` |
| 🌗 | **Light / Dark Mode** | Smooth theming with `next-themes` and Framer Motion animations |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    U([👤 Intern / Mentor / Admin]) --> W[🖥️ Next.js 16 App<br/>React 19 + Tailwind + shadcn/ui]
    W --> API[⚙️ API Routes]
    W <--> WS[⚡ WebSocket<br/>Mini-Service]
    API --> FB[(🔥 Firebase<br/>Firestore + Storage)]
    API --> SB[(🟢 Supabase)]
    API --> PR[(🗄️ Prisma ORM)]
    API --> AI[🤖 AI SDK]
    CD[🛡️ Caddy Reverse Proxy] --> W
```

---

## 🧰 Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion |
| **State & Data** | Zustand, TanStack Query, TanStack Table, React Hook Form, Zod |
| **Backend & DB** | Firebase (Firestore, Admin SDK), Supabase, Prisma |
| **Realtime** | WebSocket mini-service |
| **AI** | `z-ai-web-dev-sdk`, `react-markdown` |
| **Visualization** | Recharts, Embla Carousel |
| **Tooling** | Bun, ESLint 9, Caddy |

</div>

---

## 📂 Project Structure

```bash
Strides-Intern-Management-AI/
├── src/              # Application source (pages, components, hooks, lib)
├── public/           # Static assets
├── prisma/           # Prisma schema
├── db/               # Database files
├── mini-services/    # Standalone services (e.g. WebSocket server)
├── examples/         # Usage examples (WebSocket)
├── scripts/          # Helper scripts (db-push, etc.)
├── tests/            # Tests
├── firestore.rules   # Firestore security rules
├── storage.rules     # Firebase Storage security rules
├── Caddyfile         # Reverse proxy configuration
├── .env.example      # Environment variable template
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A Firebase project (and Supabase project if you use it)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/siddheshsalve77/Strides-Intern-Management-AI.git
cd Strides-Intern-Management-AI

# 2. Install dependencies
bun install

# 3. Configure environment variables
cp .env.example .env
# then fill in your Firebase / Supabase / AI keys

# 4. Push the database schema
bun run db:push

# 5. Build the app
bun run build

# 6. Start the server
bun run start
```

Open **http://localhost:3000** 🎉

### Available Scripts

| Command | Description |
|---|---|
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start the standalone server on port `3000` |
| `bun run dev` | Run the built standalone server |
| `bun run db:push` | Push the database schema |
| `bun run lint` | Lint the codebase with ESLint |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and provide values for:

```env
# Firebase
# Supabase
# AI SDK key
# Database URL
```

> ⚠️ Never commit `.env` or `firebase-service-account.json`. Both are required locally but must stay out of version control.

---

## 🗺️ Roadmap

- [x] Core intern & task management
- [x] Analytics dashboards
- [x] Real-time WebSocket updates
- [ ] Role-based access polish (Admin / Mentor / Intern)
- [ ] Automated weekly progress reports
- [ ] Email & in-app notifications
- [ ] Mobile-first PWA support

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👨‍💻 Author

<div align="center">

**Siddhesh Salve (Hastar)**

[![GitHub](https://img.shields.io/badge/GitHub-siddheshsalve77-181717?style=for-the-badge&logo=github)](https://github.com/siddheshsalve77)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-8B5CF6?style=for-the-badge&logo=vercel&logoColor=white)](https://siddhesh-salve-portfolio.vercel.app)

⭐ **If you found this project useful, please give it a star!** ⭐

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06B6D4,50:8B5CF6,100:6366F1&height=120&section=footer" alt="footer wave" />

</div>
