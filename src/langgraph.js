// ─── CODE GENERATOR: LangGraph ───────────────────────────────────────────────
import { state } from './state.js';

export function genLangGraph() {
  const { currentTopic: topic, generatedAgents: agents } = state;

  const stateFields = agents.map(a =>
    `    ${a.id.replace(/-/g, '_')}_output: str`
  ).join('\n');

  const nodeDefs = agents.map(a => {
    const v = a.id.replace(/-/g, '_');
    return `
def ${v}_node(state: AgentState) -> AgentState:
    """${a.name}: ${a.description.split('.')[0]}."""
    response = llm.invoke([
        SystemMessage(content="""You are ${a.name}, ${a.role || a.description.split('.')[0]}.
Topic: ${topic}
Task: ${a.description}"""),
        HumanMessage(content=state.get("user_input", "Start the workflow.")),
    ])
    state["${v}_output"] = response.content
    state["messages"].append(AIMessage(content=f"[${a.name}] " + response.content))
    return state`;
  }).join('\n');

  const addNodes = agents.map(a =>
    `workflow.add_node("${a.id}", ${a.id.replace(/-/g, '_')}_node)`
  ).join('\n');

  const addEdges = agents.map((a, i) =>
    i === 0
      ? `workflow.set_entry_point("${a.id}")`
      : `workflow.add_edge("${agents[i - 1].id}", "${a.id}")`
  ).join('\n');

  const lastId     = agents.at(-1)?.id || 'end';
  const initFields = agents.map(a => `        "${a.id.replace(/-/g, '_')}_output": ""`).join(',\n');

  return `"""
AgentSpark → LangGraph Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://langchain-ai.github.io/langgraph
"""

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import operator

# ── State ─────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    user_input: str
${stateFields}

# ── LLM ───────────────────────────────────────────────────
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

# ── Agent Nodes ───────────────────────────────────────────
${nodeDefs}

# ── Graph ─────────────────────────────────────────────────
workflow = StateGraph(AgentState)

${addNodes}

${addEdges}
workflow.add_edge("${lastId}", END)

app = workflow.compile()

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    result = app.invoke({
        "messages": [],
        "user_input": "Build the ${topic} application.",
${initFields}
    })
    print("\\n=== FINAL STATE ===")
    for key, val in result.items():
        if val and key != "messages":
            print(f"\\n[{key}]\\n{val}")
`;
}
