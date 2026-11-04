# Product Requirements Document (PRD)

## Kantor Virtual HQ: 3D Isometric AI Agent Monitoring & Orchestration Dashboard

### 1. Overview & Vision
**Kantor Virtual HQ** is an interactive, 3D isometric web-based dashboard designed to monitor and orchestrate multi-agent AI workflows (Antigravity agents) in real time. The system gamifies agent operations into a virtual office simulation while introducing robust administrative controls to create, configure, and assign roles and tasks to new AI agents directly from the user interface.

### 2. Target Audience & Stakeholders
* **AI System Owners / Developers:** Need real-time visibility into agent performance, token expenditures, context window sizes, and error states, along with tools to spin up new agents.
* **Project Managers:** Configure sprint workflows, delegate tasks to specific AI roles, track deliverables, and manage pending human-in-the-loop approvals.
* **Team Members:** Gain clarity on inter-agent communication and delegated tasks.

### 3. Key Objectives & Success Metrics
* **Visual Clarity:** Provide an intuitive 3D representation of the workspace where each agent's location corresponds to their department/role.
* **Real-Time Observability & Control:** Instant updates on live logs, token usage, execution states, and the ability to provision new agents on the fly.
* **Dynamic Orchestration:** Enable seamless creation of agent profiles, functional definitions, and task pipelines within a single interface.

### 4. Functional Requirements

#### A. Dynamic Agent Management & Configuration Panel (New Feature)
* **Create New Agent:** A modal or form interface allowing users to register a new AI agent by specifying:
  * *Agent Name* (e.g., "Budi", "Siti")
  * *Role / Title* (e.g., Frontend Dev, QA Engineer, Researcher)
  * *Department / Station* (Assigning a physical desk coordinate in the 3D office)
  * *AI Model / Parameters* (API endpoint, system prompt, temperature)
* **Define Functions & Tasks:** Assign specific operational functions, parameters, and active task queues to newly created or existing agents dynamically.
* **Agent Lifecycle Control:** Ability to pause, resume, reassign, or delete agent instances from the dashboard.

#### B. 3D Isometric Virtual Office (Frontend Canvas)
* **Rendering Engine:** Built with Three.js (Orthographic Camera for isometric projection).
* **Environment Elements:** Office floor, walls, glass partition meeting rooms, work desks, laptops, and coffee corner.
* **Interactive Controls:** 360-degree rotation, zoom in/out, click-to-focus on specific agent desks, auto-rotate toggle, and full-screen mode.
* **Dynamic Avatar Spawning:** Automatically renders new desk workstations and avatars when a new agent is created through the management panel.

#### C. Live Activity Feed (Left Sidebar)
* **Real-time Log Stream:** Chronological logs of agent actions, tool calls, and communications.
* **Filtering System:** Quick filter pills to isolate logs by individual agents or view all.

#### D. Backlog & Task Management (Right Sidebar)
* **Categorized Task Sections:** *Deadline Dekat*, *Nunggu Owner*, and *Ide / Nanti*.
* Interactive checkboxes for task completion and assignment linking.

#### E. Agent Status Cards (Footer Grid)
* **Card Metrics:** Agent Name/Role, Status Badge (*KERJA* / *IDLE*), Active Task Description, Action Count, Token Usage, and Context Memory size.
* **Quick Navigation:** Clicking an agent card centers the 3D camera on their respective desk.

### 5. Technical Stack & Architecture
* **Frontend:** HTML5, Tailwind CSS, Font Awesome, Inter Google Font, Three.js (r128).
* **Backend & API:** PHP / Node.js API endpoints handling CRUD operations for agent creation, configuration, and task assignment.
* **Real-Time Sync:** WebSockets or Server-Sent Events (SSE) for broadcasting agent status changes and logs.
* **Database:** MySQL (`agents`, `agent_configs`, `agent_logs`, `tasks` tables).

### 6. Implementation Roadmap
1. **Phase 1 (MVP):** Single-file HTML implementation with Three.js office layout, responsive Tailwind layout, and static mock data feed. *(Completed)*
2. **Phase 2 (Dynamic Management UI):** Implement modals and forms for creating new agents and assigning tasks directly in the dashboard UI.
3. **Phase 3 (Backend & WebSocket Integration):** Connect database and WebSocket engine for live agent status updates from the Antigravity backend.