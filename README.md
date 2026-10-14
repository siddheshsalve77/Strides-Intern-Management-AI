<div align="center">

<img src="./assets/banner.svg" alt="Strides Intern Management AI" width="100%" />

<br/>

<a href="https://github.com/siddheshsalve77/Strides-Intern-Management-AI">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1200&color=8B5CF6&center=true&vCenter=true&width=760&height=40&lines=Manage+interns+smarter%2C+not+harder+%F0%9F%9A%80;AI-assisted+task+tracking+%26+insights+%F0%9F%A4%96;Real-time+dashboards+%26+analytics+%F0%9F%93%8A;Built+with+Next.js+16+%7C+React+19+%7C+TypeScript+%E2%9A%A1" alt="Typing animation" />
</a>

<br/><br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-Runtime-FBF0DF?style=for-the-badge&logo=bun&logoColor=black)

![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/siddheshsalve77/Strides-Intern-Management-AI?style=flat-square&color=8B5CF6)
![Stars](https://img.shields.io/github/stars/siddheshsalve77/Strides-Intern-Management-AI?style=flat-square&color=FFCA28)
![Forks](https://img.shields.io/github/forks/siddheshsalve77/Strides-Intern-Management-AI?style=flat-square&color=06B6D4)

<br/>

**[Overview](#-overview) · [Workflow](#-how-it-works) · [Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Get Started](#-getting-started) · [Roadmap](#-roadmap) · [Author](#-author)**

<img src="./assets/divider.svg" width="100%" alt="" />

</div>

## 📖 Overview

**Strides Intern Management AI** is a modern web platform that runs an internship program end to end. Interns, mentors and admins share one workspace with task boards, live progress analytics and an AI assistant that takes over the repetitive parts of managing a cohort.

> 💡 **Why it exists:** spreadsheets and chat threads don't scale. Strides gives every intern a clear path and gives every manager a live picture of how the program is doing.

<img src="./assets/divider.svg" width="100%" alt="" />

## 🔄 How It Works

<div align="center">
  <img src="./assets/flow.svg" alt="Onboard → Assign → Track → Evaluate" width="100%" />
</div>

<img src="./assets/divider.svg" width="100%" alt="" />

## ✨ Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧑‍🎓 Intern Management</h3>
      Profiles, cohorts, roles and onboarding in a single workspace.
    </td>
    <td width="50%" valign="top">
      <h3>📋 Drag-and-Drop Boards</h3>
      Kanban-style task tracking powered by <code>dnd-kit</code>.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🤖 AI Assistant</h3>
      Summaries, feedback and suggestions with clean Markdown-rendered responses.
    </td>
    <td valign="top">
      <h3>📊 Analytics Dashboards</h3>
      Progress, performance and workload charts built with Recharts.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>⚡ Real-Time Updates</h3>
      A WebSocket mini-service keeps every screen in sync.
    </td>
    <td valign="top">
      <h3>🔐 Secure Data Layer</h3>
      Firestore and Storage security rules, plus Supabase and Prisma integrations.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🌍 Multi-Language Ready</h3>
      Internationalization through <code>next-intl</code>.
    </td>
    <td valign="top">
      <h3>🌗 Light / Dark Mode</h3>
      Smooth theming with <code>next-themes</code> and Framer Motion animations.
    </td>
  </tr>
</table>

<img src="./assets/divider.svg" width="100%" alt="" />

## 🏗️ Architecture

```mermaid
flowchart LR
    U([👤 Intern / Mentor / Admin]) --> CD[🛡️ Caddy Reverse Proxy]
    CD --> W[🖥️ Next.js 16 App<br/>React 19 · Tailwind · shadcn/ui]
    W --> API[⚙️ API Routes]
    W <--> WS[⚡ WebSocket Mini-Service]
    API --> FB[(🔥 Firebase<br/>Firestore + Storage)]
    API --> SB[(🟢 Supabase)]
    API --> PR[(🗄️ Prisma ORM)]
    API --> AI[🤖 AI SDK]

    classDef app fill:#6366F1,stroke:#4F46E5,color:#fff;
    classDef data fill:#0891B2,stroke:#0E7490,color:#fff;
    classDef edge fill:#8B5CF6,stroke:#7C3AED,color:#fff;
    class W,API,WS,AI app;
    class FB,SB,PR data;
    class CD edge;
```

<img src="./assets/divider.svg" width="100%" alt="" />

## 🧰 Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,firebase,supabase,prisma,bun,docker,git&perline=10" alt="Tech stack icons" />

</div>

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion |
| **State & Forms** | Zustand, TanStack Query, TanStack Table, React Hook Form, Zod |
| **Backend & DB** | Firebase (Firestore, Admin SDK), Supabase, Prisma |
| **Realtime** | WebSocket mini-service |
| **AI** | `z-ai-web-dev-sdk`, `react-markdown` |
| **Visualization** | Recharts, Embla Carousel |
| **Tooling** | Bun, ESLint 9, Caddy |

<img src="./assets/divider.svg" width="100%" alt="" />

## 🖼️ Screenshots

<!-- Replace with your real screenshots: save them in /public or /assets and link here -->
<div align="center">

| Dashboard | Task Board | AI Assistant |
|:---:|:---:|:---:|
| *add screenshot* | *add screenshot* | *add screenshot* |

</div>

<img src="./assets/divider.svg" width="100%" alt="" />

## 📂 Project Structure

<details>
<summary><b>Click to expand</b></summary>

```bash
Strides-Intern-Management-AI/
├── src/              # Application source (pages, components, hooks, lib)
├── public/           # Static assets
├── assets/           # README animations
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

</details>

<img src="./assets/divider.svg" width="100%" alt="" />

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A Firebase project (and a Supabase project if you use it)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/siddheshsalve77/Strides-Intern-Management-AI.git
cd Strides-Intern-Management-AI

# 2. Install dependencies
bun install

# 3. Configure environment variables
cp .env.example .env      # then fill in your keys

# 4. Push the database schema
bun run db:push

# 5. Build and start
bun run build
bun run start
```

Open **http://localhost:3000** 🎉

<details>
<summary><b>📜 Available scripts</b></summary>

| Command | Description |
|---|---|
| `bun run build` | Production build (standalone output) |
| `bun run start` | Start the standalone server on port `3000` |
| `bun run dev` | Run the built standalone server |
| `bun run db:push` | Push the database schema |
| `bun run lint` | Lint the codebase with ESLint |

</details>

<details>
<summary><b>🔑 Environment variables</b></summary>

Copy `.env.example` to `.env` and provide values for Firebase, Supabase, the AI SDK and your database URL.

> ⚠️ Never commit `.env` or `firebase-service-account.json`. Keep both out of version control.

</details>

<img src="./assets/divider.svg" width="100%" alt="" />

## 🗺️ Roadmap

- [x] Core intern & task management
- [x] Analytics dashboards
- [x] Real-time WebSocket updates
- [ ] Role-based access polish (Admin / Mentor / Intern)
- [ ] Automated weekly progress reports
- [ ] Email & in-app notifications
- [ ] Mobile-first PWA support

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

## ⭐ Star History

<div align="center">
  <a href="https://star-history.com/#siddheshsalve77/Strides-Intern-Management-AI&Date">
    <img src="https://api.star-history.com/svg?repos=siddheshsalve77/Strides-Intern-Management-AI&type=Date" alt="Star History Chart" width="600" />
  </a>
</div>

<img src="./assets/divider.svg" width="100%" alt="" />

## 👩‍💻 Author

<div align="center">

**Vijayshree Sundge**

[![GitHub](https://img.shields.io/badge/GitHub-vijayshree--sundge-181717?style=for-the-badge&logo=github)](https://github.com/vijayshree-sundge)

<br/>

⭐ **If you found this project useful, please give it a star!** ⭐

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=16&pause=1500&color=06B6D4&center=true&vCenter=true&width=500&lines=Thanks+for+stopping+by+%F0%9F%92%9C;Happy+coding!+%F0%9F%9A%80" alt="Thanks" />

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06B6D4,50:8B5CF6,100:6366F1&height=120&section=footer" alt="footer wave" width="100%" />

</div>
