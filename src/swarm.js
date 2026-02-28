// ─── CODE GENERATOR: OpenAI Swarm ────────────────────────────────────────────
import { state } from './state.js';

export function genSwarm() {
  const { currentTopic: topic, generatedAgents: agents } = state;

  const agentDefs = agents.map((a, i) => {
    const next    = agents[i + 1];
    const v       = a.id.replace(/-/g, '_');
    const nextV   = next?.id.replace(/-/g, '_');
    return `
def ${v}_instructions(context_variables):
    return f"""You are ${a.name}.
Role: ${a.role || a.name}
Topic: ${topic}
Task: ${a.description}
${next ? `When done, call transfer_to_${nextV} to pass to the next agent.` : 'This is the final step. Summarize all work done.'}"""

${v} = Agent(
    name="${a.name}",
    instructions=${v}_instructions,
    functions=[${next ? `transfer_to_${nextV}` : ''}],
)`;
  }).join('\n');

  const transferFns = agents.slice(0, -1).map((_, i) => {
    const next = agents[i + 1];
    const v    = next.id.replace(/-/g, '_');
    return `
def transfer_to_${v}():
    """Transfer to ${next.name} — ${next.description.split('.')[0]}."""
    return ${v}`;
  }).join('\n');

  const firstVar   = agents[0]?.id.replace(/-/g, '_') || 'agent';
  const fwdDeclare = agents.slice(1).map(a => `${a.id.replace(/-/g, '_')} = None  # defined below`).join('\n');
  const fixRefs    = agents.slice(0, -1).map((_, i) => {
    const a    = agents[i];
    const next = agents[i + 1];
    return `${a.id.replace(/-/g, '_')}.functions = [transfer_to_${next.id.replace(/-/g, '_')}]`;
  }).join('\n');

  return `"""
AgentSpark → OpenAI Swarm Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://github.com/openai/swarm
Install: pip install git+https://github.com/openai/swarm.git
"""

from swarm import Swarm, Agent

client = Swarm()

# ── Transfer Functions (forward declarations) ──────────────
${fwdDeclare}

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Handoff Functions ─────────────────────────────────────
${transferFns}

# ── Fix forward references ────────────────────────────────
${fixRefs}

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    response = client.run(
        agent=${firstVar},
        messages=[{"role": "user", "content": "Build the ${topic} application. Complete all steps."}],
        context_variables={"topic": "${topic}"},
        debug=False,
    )
    print("\\n=== SWARM RESULT ===")
    print(response.messages[-1]["content"])
`;
}
