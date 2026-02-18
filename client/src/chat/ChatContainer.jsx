import Chat from "./Chat.jsx";
import "./ChatContainer.css";
import { useState } from "react";
import TaskInput from "../input/TaskInput.jsx";

const initialState = {
  phase: "INTRO",
  intake: {
    action: null,
    initialForce: null,
    sustainedForce: null,
    handHeight: null,
    distance: null,
    frequency: null,
  },
  calc: null,
  lastAsked: null,
};

export default function ChatContainer() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState(initialState);

  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    const history = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      setIsLoading(true);

      console.log("-----\nSending a message\n");
      console.log("User message:", trimmed);
      console.log("Chat history:", ...history);
      console.log("Current chat phase:", state.phase);
      console.log("Current intake status:", state.intake, "\n-----\n");

      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
          state,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || `Request failed with status ${res.status}`,
        );
      }

      const assistantMessage = {
        id: crypto.randomUUID() + 1,
        role: "assistant",
        content: data.assistantMessage,
      };

      console.log("-----\nReceiving a message\n");
      console.log("AI message:", assistantMessage.content);
      console.log("New chat phase:", data.state.phase);
      console.log("New intake status:", data.state.intake, "\n-----\n");

      if (data.state) {
        setState(data.state);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);

      const errorMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: "Sorry, there was an error reaching the server.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInput = async (form) => {
    const messageHeader = `Below is a list of inputs that define a task. For now, assume the initial force and sustained force are the same. \n---`;

    const { action, force, vertical, distance_horizontal, frequency } = form;

    const trimmed = `${messageHeader}\nAction: ${action}\nForce: ${force}\nVertical: ${vertical}\nDistance horizontal: ${distance_horizontal}\nFrequency: ${frequency}`;
    if (!trimmed) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    const history = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    const toNum = (v) => (v === "" || v == null ? null : Number(v));

    const nextState = {
      ...state,
      phase: "INTAKE",
      intake: {
        ...(state?.intake ?? {}),
        action: action ?? null,
        initialForce: toNum(force),
        sustainedForce: toNum(force), // per your assumption
        handHeight: toNum(vertical), // rename if your server expects something else
        distance: toNum(distance_horizontal),
        frequency: toNum(frequency),
      },
    };

    setState(nextState);

    try {
      setIsLoading(true);

      console.log("-----\nSending input\n");
      console.log("User message:", trimmed);
      console.log("Chat history:", ...history);
      console.log("Current chat phase:", nextState.phase);
      console.log("Current intake status:", nextState.intake, "\n-----\n");

      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
          state: nextState, // IMPORTANT: sending the new state here, not just 'state'
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || `Request failed with status ${res.status}`,
        );
      }

      // console.log("response", data);
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.assistantMessage,
      };

      console.log("-----\nReceiving a message\n");
      console.log("AI message:", assistantMessage.content);
      console.log("New chat phase:", data.state.phase);
      console.log("New intake status:", data.state.intake, "\n-----\n");

      if (data.state) {
        setState(data.state);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);

      const errorMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: "Sorry, there was an error reaching the server.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ChatContainer">
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSend={handleSendMessage}
      />
      <TaskInput onSend={handleSendInput} />
    </div>
  );
}
