import Chat from "./Chat.jsx";
import "./ChatContainer.css";
import { useState } from "react";

export default function ChatContainer() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    console.log("USER MESSAGE: " + userMessage.content);
    console.log("USER MSG ID: " + userMessage.id);

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    //   role: m.role,
    //   content: m.content,
    // }));

    const history = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    console.log("HISTORY:");
    for (let h of history) {
      console.log(h.content);
    }

    try {
      setIsLoading(true);

      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
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
        content: data.message,
      };

      console.log("AI MESSAGE: " + assistantMessage.content);
      console.log("AI MSG ID: " + assistantMessage.id);

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);

      const errorMessage = {
        id: Date.now() + 2,
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
      <div className="chat-container-header">
        <h3>chat</h3>
      </div>
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSend={handleSendMessage}
      />
    </div>
  );
}
