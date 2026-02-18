import { useState } from "react";
import "./App.css";
import ChatContainer from "./chat/ChatContainer.jsx";
import Peek from "./peek/Peek.jsx";
import Ingest from "./ingest/Ingest.jsx";

function App() {
  return (
    <div>
      <ChatContainer />
      {/* <Ingest />
      <Peek /> */}
    </div>
  );
}

export default App;
