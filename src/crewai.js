// ─── CODE GENERATOR: CrewAI ───────────────────────────────────────────────────
import { state } from './state.js';

function agentVar(agent) { return agent.id.replace(/-/g, '_') + '_agent'; }
function taskVar(agent)  { return agent.id.replace(/-/g, '_') + '_task';  }

export function genCrewAI() {
  const { currentTopic: topic, generatedAgents: agents } = state;

  const agentDefs = agents.map(a => `
${agentVar(a)} = Agent(
    role="${a.role || a.name}",
    goal="${a.description.split('.')[0]}.",
    backstory="""${a.description}""",
    verbose=True,
    allow_delegation=${a.type === 'technical' ? 'False' : 'True'},
    tools=[],  # Add your tools here
)`).join('\n');

  const taskDefs = agents.map((a, i) => {
    const next = agents[i + 1];
    return `
${taskVar(a)} = Task(
    description="""
    Topic: ${topic}
    Agent: ${a.name} — ${a.role || ''}
    ${a.description}
    """,
    expected_output="Detailed output from ${a.name} covering its responsibilities.",
    agent=${agentVar(a)},${next ? '\n    context=[],  # Will receive output from previous tasks' : ''}
)`;
  }).join('\n');

  const agentList = agents.map(a => `    ${agentVar(a)},`).join('\n');
  const taskList  = agents.map(a => `    ${taskVar(a)},`).join('\n');

  return `"""
AgentSpark → CrewAI Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://docs.crewai.com
"""

from crewai import Agent, Task, Crew, Process
# from crewai_tools import SerperDevTool, FileReadTool  # uncomment to add tools

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Tasks ─────────────────────────────────────────────────
${taskDefs}

# ── Crew ──────────────────────────────────────────────────
crew = Crew(
    agents=[
${agentList}
    ],
    tasks=[
${taskList}
    ],
    process=Process.sequential,  # or Process.hierarchical
    verbose=True,
)

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    result = crew.kickoff()
    print("\\n=== CREW RESULT ===")
    print(result)
`;
}
