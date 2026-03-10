"use client";

import React from "react";
import useVapi from "@/hooks/useVapi";
import { IBook } from "@/types";
import { Mic, MicOff } from "lucide-react";
import Image from "next/image";
import Transcript from "@/components/Transcript";
import { toast } from "sonner";

const VapiControls = ({ book }: { book: IBook }) => {
  const {
    status,
    isActive,
    message,
    currentMessage,
    currentUserMessage,
    duration,
    maxDurationMinutes,
    start,
    stop,
    limitError,
    clearError,
  } = useVapi(book);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // show any errors coming from the hook as toast notifications so the user
  // understands why the call didn't start (limits, auth, etc.).
  React.useEffect(() => {
    if (limitError) {
      toast.error(limitError);
      clearError();
    }
  }, [limitError, clearError]);

  return (
    <>
      <section className="vapi-header-card">
        <div className="vapi-cover-wrapper">
          <Image
            src={book.coverURL}
            alt={book.title}
            width={120}
            height={180}
            className="vapi-cover-image"
          />
          <div className="vapi-mic-wrapper">
            <button
              type="button"
              className={`vapi-mic-btn shadow-md w-15! h-15! z-10 ${isActive ? "vapi-mic-btn-active" : "vapi-mic-btn-inactive"} `}
              aria-label="Mic"
              onClick={() => (isActive ? stop() : start())}
              disabled={status === "connecting"}
            >
              {isActive ? (
                <Mic className="size-5 text-[#2f2f2f]" />
              ) : (
                <MicOff className="size-5 text-[#2f2f2f]" />
              )}
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1f1f1f]">
            {book.title}
          </h1>
          <p className="text-[#5f5f5f] text-lg mt-1">by {book.author}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="vapi-status-indicator">
              <span className="vapi-status-dot vapi-status-dot-ready" />
              <span className="vapi-status-text">{status}</span>
            </div>
            <div className="vapi-badge-ai">
              <span className="vapi-badge-ai-text">
                Voice: {book.persona || "Default"}
              </span>
            </div>
            <div className="vapi-badge-ai">
              <span className="vapi-badge-ai-text">
                {formatTime(duration)}/{formatTime(maxDurationMinutes * 60)}
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="vapi-transcript-wrapper">
        <Transcript
          messages={message}
          currentMessage={currentMessage}
          currentUserMessage={currentUserMessage}
        />
      </div>
    </>
  );
};

export default VapiControls;
