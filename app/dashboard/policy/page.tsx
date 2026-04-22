"use client";

import { useState } from "react";
import {
  ChevronDown,
  BookOpen,
  Target,
  Users,
  CheckSquare,
  GitBranch,
  MessageSquare,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  FileText,
  RefreshCw,
} from "lucide-react";

interface Section {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  content: React.ReactNode;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
      <span>{children}</span>
    </li>
  );
}

function SubBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 ml-5">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-40" />
      <span className="text-gray-500">{children}</span>
    </li>
  );
}

function OrderedItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function RoleCard({
  role,
  name,
  items,
}: {
  role: string;
  name: string;
  items: string[];
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">
        {role}
      </p>
      <p className="text-sm font-bold text-gray-900 mb-3">{name}</p>
      <ul className="space-y-1.5 text-sm text-gray-600">
        {items.map((item, i) => (
          <Bullet key={i}>{item}</Bullet>
        ))}
      </ul>
    </div>
  );
}

function ViolationBadge({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-sm font-semibold mb-2">{label}</p>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <Bullet key={i}>{item}</Bullet>
        ))}
      </ul>
    </div>
  );
}

const SECTIONS: Section[] = [
  {
    id: "purpose",
    number: "1",
    title: "Purpose",
    icon: Target,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    content: (
      <p className="text-sm text-gray-600 leading-relaxed">
        This document defines the{" "}
        <strong className="text-gray-800">
          rules, responsibilities, workflows, and enforcement measures
        </strong>{" "}
        governing all team activities, including task execution, meetings,
        communication, and performance accountability.
      </p>
    ),
  },
  {
    id: "scope",
    number: "2",
    title: "Scope",
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          This policy applies to{" "}
          <strong className="text-gray-800">all team members</strong>, across:
        </p>
        <ul className="space-y-1.5 text-sm text-gray-600">
          {[
            "Task execution",
            "Meetings",
            "Reviews",
            "Communication",
            "Deadlines",
            "Collaboration",
          ].map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "roles",
    number: "3",
    title: "Roles & Responsibilities",
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoleCard
          role="Group Leader"
          name="Daniel Balepe"
          items={[
            "Opens and controls all agenda items in meetings",
            "Makes final decisions after team discussion",
            "Provides overall direction and leadership",
            "Ensures all members understand assigned tasks before execution",
            "Verifies progress during task execution (not only at completion)",
          ]}
        />
        <RoleCard
          role="Project Manager / Coordinator"
          name="Divin Mathewana"
          items={[
            "Assigns tasks and responsibilities",
            "Ensures tasks are completed within deadlines",
            "Maintains coordination across all members",
            "Ensures alignment with project objectives",
          ]}
        />
        <RoleCard
          role="Scrum Master / Facilitator"
          name="Natalie Mashele"
          items={[
            "Leads and facilitates all meetings",
            "Ensures meetings follow defined structure and time limits",
            "Ensures equal participation from all members",
            "Identifies and removes workflow blockers",
            "Facilitates team workflow using agile (scrum) practices",
            "Ensures smooth collaboration and removes obstacles",
          ]}
        />
        <RoleCard
          role="Business Analyst & Shaper"
          name="Emmanuel Mukanku"
          items={[
            "Drives productivity and task completion",
            "Challenges the team to maintain performance standards",
            "Ensures momentum is maintained during execution",
            "Ensures tasks and solutions align with overall business and project objectives",
            "Reviews requirements to confirm they are clear, complete, and practical before execution",
          ]}
        />
        <div className="sm:col-span-2">
          <RoleCard
            role="Monitor Evaluators"
            name="Daniel Balepe & Emmanuel Stakio"
            items={[
              "Evaluate ideas before implementation",
              "Identify risks, weaknesses, and inefficiencies",
              "Ensure decisions are logical and aligned with objectives",
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: "tasks",
    number: "4",
    title: "Task Execution Policy",
    icon: CheckSquare,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            4.1 Pre-Task Requirements
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Before starting any task, the assigned member{" "}
            <strong className="text-gray-800">must</strong>:
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <OrderedItem n={1}>
              Conduct research on a{" "}
              <strong className="text-gray-800">
                minimum of 3–4 similar systems/websites
              </strong>
            </OrderedItem>
            <OrderedItem n={2}>
              Understand the task requirements fully
            </OrderedItem>
            <OrderedItem n={3}>
              Confirm understanding with the Group Leader if necessary
            </OrderedItem>
          </ol>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            4.2 Task Execution
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600 mb-4">
            <Bullet>
              Tasks must be completed{" "}
              <strong className="text-gray-800">individually where assigned</strong>
            </Bullet>
            <Bullet>
              Members must work strictly within their defined roles
            </Bullet>
            <Bullet>
              The Project Leader must{" "}
              <strong className="text-gray-800">verify progress during execution</strong>
            </Bullet>
          </ul>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              Help Request Scenario
            </p>
            <ul className="space-y-1.5 text-sm text-amber-700">
              <Bullet>
                If a member encounters difficulty, they may request help from
                another team member or the Group Leader / Scrum Master
              </Bullet>
              <SubBullet>
                Clearly identify the specific problem first
              </SubBullet>
              <SubBullet>
                Attempt a basic solution or research first (if possible)
              </SubBullet>
              <Bullet>
                The assisting member should guide — not complete — the task
              </Bullet>
              <Bullet>
                The original member must still understand and finalize the work themselves
              </Bullet>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            4.3 Post-Task Requirements
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Upon completion of a task, the member must:
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <OrderedItem n={1}>
              Produce a{" "}
              <strong className="text-gray-800">.docx document</strong>{" "}
              explaining the approach used and justification for the approach
            </OrderedItem>
            <OrderedItem n={2}>
              Submit a{" "}
              <strong className="text-gray-800">
                role-based contribution report
              </strong>
            </OrderedItem>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "version-control",
    number: "5",
    title: "Version Control & Code Management",
    icon: GitBranch,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            5.1 Branching
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              A{" "}
              <strong className="text-gray-800">
                new branch must be created for every task
              </strong>
            </Bullet>
            <Bullet>
              Work on the main branch is{" "}
              <strong className="text-gray-800">strictly prohibited</strong>
            </Bullet>
            <Bullet>
              Branches must be deleted after completion where applicable
            </Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            5.2 Pull Request and Review
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              All completed work must be submitted via a{" "}
              <strong className="text-gray-800">Pull Request (PR)</strong>
            </Bullet>
            <Bullet>
              Under no circumstances may a member merge their own work without
              approval
            </Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            5.3 Mandatory Reviewers
          </p>
          <p className="text-sm text-gray-600 mb-2">
            A PR must be reviewed and approved by:
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              Business Analyst (BA) → alignment with project goals
            </Bullet>
            <Bullet>Project Owner → confirms task completion</Bullet>
            <Bullet>Any additional required reviewer</Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            5.4 Merge Condition
          </p>
          <p className="text-sm text-gray-600">
            A PR may only be merged{" "}
            <strong className="text-gray-800">
              after all required approvals are granted
            </strong>
            .
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "meetings",
    number: "6",
    title: "Meeting Policy",
    icon: MessageSquare,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            6.1 Leadership Structure
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              <strong className="text-gray-800">Scrum Master</strong> →
              Facilitates the meeting
            </Bullet>
            <Bullet>
              <strong className="text-gray-800">Group Leader</strong> →
              Controls agenda and decisions
            </Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            6.2 Meeting Procedure
          </p>
          <p className="text-sm text-gray-600 mb-2">For each agenda item:</p>
          <ol className="space-y-2 text-sm text-gray-600">
            <OrderedItem n={1}>
              Group Leader introduces the agenda item
            </OrderedItem>
            <OrderedItem n={2}>
              All members are given the opportunity to contribute
            </OrderedItem>
            <OrderedItem n={3}>
              Discussion remains strictly on topic
            </OrderedItem>
            <OrderedItem n={4}>
              Group Leader determines and makes final decisions
            </OrderedItem>
          </ol>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            6.3 Meeting Flow
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <OrderedItem n={1}>Meeting opened by Scrum Master</OrderedItem>
            <OrderedItem n={2}>Agenda introduced by Group Leader</OrderedItem>
            <OrderedItem n={3}>Structured discussion</OrderedItem>
            <OrderedItem n={4}>Decision (if required)</OrderedItem>
            <OrderedItem n={5}>Proceed to next agenda</OrderedItem>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "communication",
    number: "7",
    title: "Communication Policy",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            7.1 General Requirement
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              Communication is{" "}
              <strong className="text-gray-800">mandatory and continuous</strong>
            </Bullet>
            <Bullet>Members must:</Bullet>
            <SubBullet>Report progress</SubBullet>
            <SubBullet>Ask for clarification when needed</SubBullet>
            <SubBullet>Report blockers immediately</SubBullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            7.2 Attendance and Time Compliance
          </p>
          <p className="text-sm text-gray-600 mb-1.5">
            Members must be punctual for all:
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <SubBullet>Meetings</SubBullet>
            <SubBullet>Task-related activities</SubBullet>
            <SubBullet>Reviews</SubBullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            7.3 Absence and Lateness
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              If a member will be{" "}
              <strong className="text-gray-800">absent or late</strong>, they
              must{" "}
              <strong className="text-gray-800">
                inform the team before the scheduled time
              </strong>
            </Bullet>
            <Bullet>
              Failure to notify in advance constitutes a{" "}
              <strong className="text-gray-800">policy violation</strong>
            </Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            7.4 Responsibility After Absence
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>The member must:</Bullet>
            <SubBullet>Catch up on all missed work</SubBullet>
            <SubBullet>Obtain necessary updates independently</SubBullet>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "deadlines",
    number: "8",
    title: "Deadline Policy",
    icon: Clock,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          All tasks must be completed{" "}
          <strong className="text-gray-800">
            a minimum of 2 days before the official deadline
          </strong>
          .
        </p>
        <p className="text-gray-500">This period is reserved for:</p>
        <ul className="space-y-1.5">
          <SubBullet>Review</SubBullet>
          <SubBullet>Corrections</SubBullet>
          <SubBullet>Final approval</SubBullet>
        </ul>
      </div>
    ),
  },
  {
    id: "performance",
    number: "9",
    title: "Performance & Feedback",
    icon: TrendingUp,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            9.1 Feedback Requirement
          </p>
          <p className="text-sm text-gray-600 mb-1.5">Feedback must be:</p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <SubBullet>Direct</SubBullet>
            <SubBullet>Specific</SubBullet>
            <SubBullet>Task-related</SubBullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            9.2 Recognition
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>
              Strong performance must be{" "}
              <strong className="text-gray-800">
                acknowledged immediately
              </strong>
            </Bullet>
            <Bullet>Recognition must specify:</Bullet>
            <SubBullet>The action performed</SubBullet>
            <SubBullet>The impact on the team</SubBullet>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "conflicts",
    number: "10",
    title: "Issue & Conflict Resolution",
    icon: Shield,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    content: (
      <ul className="space-y-2 text-sm text-gray-600">
        <Bullet>All conflicts must be addressed immediately</Bullet>
        <Bullet>The Scrum Master or Group Leader must:</Bullet>
        <SubBullet>Facilitate resolution between involved members</SubBullet>
        <SubBullet>Conduct a meeting if required</SubBullet>
        <Bullet>
          Discussions must focus on the{" "}
          <strong className="text-gray-800">issue, not the individual</strong>
        </Bullet>
      </ul>
    ),
  },
  {
    id: "enforcement",
    number: "11",
    title: "Non-Compliance & Enforcement",
    icon: FileText,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    content: (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            11.1 Definition
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Failure to follow any rule in this policy, including:
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <Bullet>Late/absent without prior notice</Bullet>
            <Bullet>Failure to submit required work</Bullet>
            <Bullet>Unauthorized merging</Bullet>
            <Bullet>Ignoring communication requirements</Bullet>
          </ul>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            11.2 Enforcement Procedure
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ViolationBadge
              label="1st Violation"
              color="bg-yellow-50 border border-yellow-200 text-yellow-800"
              items={["Verbal warning issued by Group Leader or Scrum Master"]}
            />
            <ViolationBadge
              label="2nd Violation"
              color="bg-orange-50 border border-orange-200 text-orange-800"
              items={[
                "Formal warning",
                "Mandatory discussion with leadership",
              ]}
            />
            <ViolationBadge
              label="3rd Violation"
              color="bg-red-50 border border-red-200 text-red-800"
              items={[
                "Recorded in team meeting",
                "Reduced responsibilities",
                "Increased supervision",
              ]}
            />
            <ViolationBadge
              label="Repeated Violations"
              color="bg-red-100 border border-red-300 text-red-900"
              items={[
                "Task reassignment",
                "Removal from critical responsibilities",
                "Escalation to external authority (if applicable)",
              ]}
            />
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            11.3 Exception Clause
          </p>
          <p className="text-sm text-gray-600">
            Valid and{" "}
            <strong className="text-gray-800">
              early communicated reasons
            </strong>{" "}
            must be considered before enforcement.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "principles",
    number: "12",
    title: "Core Principles",
    icon: Target,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    content: (
      <ul className="space-y-2 text-sm text-gray-600">
        <Bullet>Clear roles and responsibilities</Bullet>
        <Bullet>Early and continuous communication</Bullet>
        <Bullet>Structured decision-making</Bullet>
        <Bullet>Accountability at all levels</Bullet>
        <Bullet>Performance-driven teamwork</Bullet>
      </ul>
    ),
  },
  {
    id: "review",
    number: "13",
    title: "Policy Review & Enforcement by Group Leader",
    icon: RefreshCw,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    content: (
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          The{" "}
          <strong className="text-gray-800">
            Group Leader must read this policy document at least once in a
            meeting per month
          </strong>
          .
        </p>
        <p className="text-gray-500">This ensures that:</p>
        <ul className="space-y-1.5">
          <SubBullet>The team is regularly reminded of agreed rules</SubBullet>
          <SubBullet>Responsibilities and procedures remain clear</SubBullet>
          <SubBullet>The team stays aligned over time</SubBullet>
        </ul>
        <p className="text-gray-500 pt-1">The Group Leader must also:</p>
        <ul className="space-y-1.5">
          <SubBullet>
            Refer to relevant sections when issues or misunderstandings arise
          </SubBullet>
          <SubBullet>
            Ensure the policy is actively enforced, not only stored as
            documentation
          </SubBullet>
        </ul>
      </div>
    ),
  },
];

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        open ? `${section.border} shadow-sm` : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-4 px-5 py-4 transition-colors ${
          open ? section.bg : "bg-white hover:bg-gray-50"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            open ? "bg-white/70" : section.bg
          }`}
        >
          <Icon className={`h-4.5 w-4.5 ${section.color}`} size={18} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                open ? section.color : "text-gray-400"
              }`}
            >
              Section {section.number}
            </span>
          </div>
          <p
            className={`text-sm font-semibold leading-snug ${
              open ? "text-gray-900" : "text-gray-700"
            }`}
          >
            {section.title}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? `${section.color} rotate-180` : "text-gray-400"
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function PolicyPage() {
  const [allOpen, setAllOpen] = useState(false);
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  function toggleAll() {
    const next = !allOpen;
    const newKeys: Record<string, boolean> = {};
    SECTIONS.forEach((s) => (newKeys[s.id] = next));
    setKeys(newKeys);
    setAllOpen(next);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Group Rules & Policy
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Team Governance Policy · Version 1.0 · Applies to all members
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Core principles banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-6 py-5">
        <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3">
          Core Principles
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "Clear Roles",
            "Continuous Communication",
            "Structured Decisions",
            "Full Accountability",
            "Performance-Driven",
          ].map((p) => (
            <span
              key={p}
              className="text-xs font-medium bg-white/15 text-white px-3 py-1.5 rounded-full"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Accordion list */}
      <div className="space-y-2.5">
        {SECTIONS.map((section) => (
          <ControlledAccordion
            key={section.id}
            section={section}
            forceOpen={keys[section.id]}
          />
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Team Governance Policy · Version 1.0 · All members are bound by this document
      </p>
    </div>
  );
}

function ControlledAccordion({
  section,
  forceOpen,
}: {
  section: Section;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  const isOpen = forceOpen !== undefined ? forceOpen : open;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen ? `${section.border} shadow-sm` : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-4 px-5 py-4 transition-colors ${
          isOpen ? section.bg : "bg-white hover:bg-gray-50"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isOpen ? "bg-white/70" : section.bg
          }`}
        >
          <Icon className={`${section.color}`} size={18} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isOpen ? section.color : "text-gray-400"
            }`}
          >
            Section {section.number}
          </span>
          <p
            className={`text-sm font-semibold leading-snug ${
              isOpen ? "text-gray-900" : "text-gray-700"
            }`}
          >
            {section.title}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? `${section.color} rotate-180` : "text-gray-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-3 bg-white border-t border-gray-100">
          {section.content}
        </div>
      )}
    </div>
  );
}
