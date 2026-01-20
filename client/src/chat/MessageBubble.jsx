import "./MessageBubble.css";

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";
  const messageColor = isUser ? "darkblue" : "darkgreen";
  const alignDirection = isUser ? "left" : "left";

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div
        className="MessageBubble"
        style={{ backgroundColor: messageColor, textAlign: alignDirection }}
      >
        {content}
      </div>
    </div>
  );
}
