import "./Chat.css";
import MessageContainer from "./MessageContainer";
import MessageForm from "./MessageForm";

export default function Chat({ messages, isLoading, onSend }) {
  return (
    <div className="Chat">
      <MessageContainer messages={messages} />
      <MessageForm onSend={onSend} />
    </div>
  );
}
