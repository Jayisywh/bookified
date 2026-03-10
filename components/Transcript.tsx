"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/hooks/useVapi";
import { Mic } from "lucide-react";

interface TranscriptProps {
  messages: Message[];
  currentMessage: string;
  currentUserMessage: string;
}

const Transcript = ({
  messages,
  currentMessage,
  currentUserMessage,
}: TranscriptProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // scroll to bottom whenever content changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentMessage, currentUserMessage]);

  const isEmpty =
    (!messages || messages.length === 0) &&
    !currentMessage &&
    !currentUserMessage;

  if (isEmpty) {
    return (
      <div className="transcript-empty">
        <Mic className="size-12 text-[#2f2f2f] mb-3" />
        <p className="transcript-empty-text">No conversation yet</p>
        <p className="transcript-empty-hint">
          Click the mic button above to start talking
        </p>
      </div>
    );
  }

  return (
    <div className="transcript-messages" ref={containerRef}>
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`transcript-message transcript-message-${msg.role}`}
        >
          <div className={`transcript-bubble transcript-bubble-${msg.role}`}>
            {msg.content}
          </div>
        </div>
      ))}

      {currentMessage && (
        <div className="transcript-message transcript-message-assistant">
          <div className="transcript-bubble transcript-bubble-assistant">
            {currentMessage}
            <span className="transcript-cursor" />
          </div>
        </div>
      )}

      {currentUserMessage && (
        <div className="transcript-message transcript-message-user">
          <div className="transcript-bubble transcript-bubble-user">
            {currentUserMessage}
            <span className="transcript-cursor" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Transcript;
