// ─── CODE GENERATOR: AutoGen ─────────────────────────────────────────────────
import { state } from './state.js';

export function genAutoGen() {
  const { currentTopic: topic, generatedAgents: agents } = state;

  const agentDefs = agents.map(a => `
${a.id.replace(/-/g, '_')} = AssistantAgent(
    name="${a.name.replace(/\s+/g, '_')}",
    system_message="""You are ${a.name}.
Role: ${a.role || a.name}
Responsibilities: ${a.description}
Topic: ${topic}

When you complete your part, summarize your output clearly and pass to the next agent.""",
    llm_config=llm_config,
)`).join('\n');

  const groupChatAgents = agents.map(a => `    ${a.id.replace(/-/g, '_')},`).join('\n');

  return `"""
AgentSpark → AutoGen Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://microsoft.github.io/autogen
"""

import autogen

# ── LLM Config ────────────────────────────────────────────
llm_config = {
    "config_list": [{"model": "gpt-4o", "api_key": "YOUR_OPENAI_API_KEY"}],
    "temperature": 0.7,
    "timeout": 120,
}

# ── Human Proxy ───────────────────────────────────────────
user_proxy = autogen.UserProxyAgent(
    name="UserProxy",
    human_input_mode="NEVER",  # Set to "ALWAYS" for interactive mode
    max_consecutive_auto_reply=10,
    is_termination_msg=lambda x: "TASK_COMPLETE" in x.get("content", ""),
    code_execution_config={"work_dir": "workspace", "use_docker": False},
)

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Group Chat ────────────────────────────────────────────
groupchat = autogen.GroupChat(
    agents=[
        user_proxy,
${groupChatAgents}
    ],
    messages=[],
    max_round=20,
    speaker_selection_method="round_robin",  # or "auto"
)

manager = autogen.GroupChatManager(
    groupchat=groupchat,
    llm_config=llm_config,
)

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    user_proxy.initiate_chat(
        manager,
        message=f"""
        Build the ${topic} application.
        Each agent should complete their responsibilities and hand off to the next.
        Finish with TASK_COMPLETE when all work is done.
        """,
    )
`;
}
