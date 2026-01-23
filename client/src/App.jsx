import { useState } from "react";
import "./App.css";
import Chat from "./chat/Chat.jsx";

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };

    console.log("user message: " + userMessage.content);

    setMessages((prev) => [...prev, userMessage]);

    const history = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    console.log("message history:");
    for (let h of history) {
      console.log(h.content);
      console.log("----");
    }

    try {
      setIsLoading(true);

      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const response = await res.json();

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
      };

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
    <div>
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSend={handleSendMessage}
      />
    </div>
  );
}

export default App;
