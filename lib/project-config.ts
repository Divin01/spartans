import type { ProjectConfig } from "./types";

export const DEFAULT_CONFIG: ProjectConfig = {
  projectStart: "2026-04-02",
  projectEnd: "2026-10-15",
  totalPlannedTasks: 32,
  keyMilestones: [
    { title: "Project Kick-off & Scope Sign-off", date: "2026-04-02", status: "done" },
    { title: "Platform Development Start (Phase 4)", date: "2026-04-02", status: "active" },
    { title: "Cloud Deployment Live (Phase 8.1)", date: "2026-05-15", status: "upcoming" },
    { title: "Analytics & Reporting Complete (Phase 5)", date: "2026-06-01", status: "upcoming" },
    { title: "System Testing Start (Phase 7)", date: "2026-08-01", status: "upcoming" },
    { title: "UAT Completion", date: "2026-09-01", status: "upcoming" },
    { title: "Documentation & Pitch Deck Final", date: "2026-10-14", status: "upcoming" },
    { title: "INVESTOR PITCH", date: "2026-10-15", status: "target" },
  ],
  phases: [
    {
      id: "4",
      title: "Phase 4: Platform Development",
      start: "2026-04-03",
      end: "2026-08-09",
      tasks: [
        { id: "4.1", title: "User Authentication & Access Control", start: "2026-04-03", end: "2026-04-13", owners: ["Daniel", "Emmanuel S.", "Natalie", "Emza"] },
        { id: "4.2", title: "Event Management Module", start: "2026-04-03", end: "2026-04-27", owners: ["All Members"] },
        { id: "4.3", title: "EMS Marketplace & Procurement", start: "2026-04-24", end: "2026-05-11", owners: ["All Members"] },
        { id: "4.4", title: "Risk Prediction Engine (ML)", start: "2026-05-13", end: "2026-07-31", owners: ["Emmanuel S."] },
        { id: "4.5", title: "Real-Time on-site Event Monitoring (Mobile)", start: "2026-05-17", end: "2026-07-20", owners: ["All Members"] },
        { id: "4.6", title: "IOT Design Systems & Integration", start: "2026-05-25", end: "2026-07-20", owners: ["Daniel", "Divin"] },
        { id: "4.7", title: "GIS & Event Simulation Module", start: "2026-07-21", end: "2026-07-31", owners: ["Natalie", "Daniel"] },
        { id: "4.8", title: "Notification & Messaging System", start: "2026-07-21", end: "2026-08-09", owners: ["Divin"] },
        { id: "4.9", title: "Compliance Management Module", start: "2026-07-21", end: "2026-07-31", owners: ["Emza"] },
        { id: "4.10", title: "Payment & Financial System", start: "2026-07-21", end: "2026-07-31", owners: ["Emmanuel S."] },
      ],
    },
    {
      id: "5",
      title: "Phase 5: Analytics & Reporting",
      start: "2026-06-01",
      end: "2026-07-31",
      tasks: [
        { id: "5.1", title: "Event Analytics Dashboard", start: "2026-06-01", end: "2026-07-31", owners: ["Emmanuel S."] },
        { id: "5.2", title: "Post-Event Report Generation", start: "2026-06-01", end: "2026-07-31", owners: ["Emmanuel S."] },
      ],
    },
    {
      id: "7",
      title: "Phase 7: System Testing",
      start: "2026-08-01",
      end: "2026-09-30",
      tasks: [
        { id: "7.1", title: "Unit & Integration Testing", start: "2026-08-01", end: "2026-08-31", owners: ["All Members"] },
        { id: "7.2", title: "System, Security & Performance Testing", start: "2026-09-01", end: "2026-09-19", owners: ["All Members", "Stakeholders"] },
        { id: "7.3", title: "User Acceptance Testing (UAT)", start: "2026-09-01", end: "2026-09-30", owners: ["All Members", "Stakeholders"] },
      ],
    },
    {
      id: "8",
      title: "Phase 8: Deployment & Pitch Preparation",
      start: "2026-05-15",
      end: "2026-10-15",
      tasks: [
        { id: "8.1", title: "Cloud Deployment (Continuous)", start: "2026-05-15", end: "2026-10-01", owners: ["Divin", "Emmanuel S.", "Daniel"] },
        { id: "8.2", title: "Documentation & Final Pitch Prep", start: "2026-08-24", end: "2026-10-15", owners: ["All Members"] },
      ],
    },
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};
