import { ASSISTANT_ID } from "@/lib/constants";
import { IBook } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

export type CallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended";

export type Message = {
  role: string;
  content: string;
  type?: string;
};

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

export const useVapi = (book: IBook) => {
  const { userId } = useAuth();
  //TODO: Implement limits
  const [status, setStatus] = useState<CallStatus>("idle");
  const [message, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);

  const isActive =
    status === "listening" || status === "thinking" || status === "speaking";

  // Initialize Vapi instance
  useEffect(() => {
    if (!VAPI_API_KEY) {
      throw new Error("Vapi api key is not found");
    }
    vapiRef.current = new Vapi(VAPI_API_KEY);

    // Set up event listeners
    const vapi = vapiRef.current;

    vapi.on("call-start", () => {
      console.log("Call started");
      setStatus("connected");
      // Start duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    });

    vapi.on("call-end", () => {
      console.log("Call ended");
      setStatus("ended");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    vapi.on("speech-start", () => {
      console.log("Speech started");
      setStatus("listening");
    });

    vapi.on("speech-end", () => {
      console.log("Speech ended");
      setStatus("thinking");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on("message", (raw: any) => {
      // normalize raw event into our Message shape
      // Vapi currently emits transcript events with a `type: 'transcript'` and
      // `transcriptType` of 'partial'/'final', and the text lives in `transcript`.
      const msgType =
        raw.type === "transcript" && raw.transcriptType
          ? raw.transcriptType
          : raw.type;
      const content = raw.content ?? raw.transcript ?? "";
      const msg: Message & { type?: string } = {
        role: raw.role,
        content,
        type: msgType,
      };

      console.log("Message received:", raw, "→ normalized", msg);

      // Handle user messages
      if (msg.role === "user") {
        if (msg.type === "partial") {
          setCurrentUserMessage(msg.content);
        } else if (msg.type === "final") {
          setCurrentUserMessage("");
          setStatus("thinking");

          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (
              lastMessage &&
              lastMessage.role === "user" &&
              lastMessage.content === msg.content
            ) {
              return prev;
            }
            return [...prev, { role: msg.role, content: msg.content }];
          });
        }
      }

      // Handle assistant messages
      if (msg.role === "assistant") {
        if (msg.type === "partial") {
          setCurrentMessage(msg.content);
          setStatus("speaking");
        } else if (msg.type === "final") {
          setCurrentMessage("");
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (
              lastMessage &&
              lastMessage.role === "assistant" &&
              lastMessage.content === msg.content
            ) {
              return prev;
            }
            return [...prev, { role: msg.role, content: msg.content }];
          });
        }
      }
    });

    vapi.on("error", (error: { message?: string }) => {
      console.error("Vapi error:", error);
      setLimitError(error.message || "An error occurred during the call");
      setStatus("idle");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      vapi.removeAllListeners();
    };
  }, []);

  const start = async () => {
    if (!userId) return setLimitError("Please login to start conversation");
    if (!vapiRef.current) return setLimitError("Vapi not initialized");

    setLimitError(null);
    setStatus("connecting");
    try {
      const result = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: book._id,
        }),
      }).then((res) => res.json());

      if (!result.success) {
        setLimitError(
          result.error ?? "Session limit reached. Please upgrade your plan",
        );
        setStatus("idle");
        return;
      }
      sessionIdRef.current = result.sessionId;
      console.log("Starting session with sessionId:", sessionIdRef.current);
      const firstMessage = `Hey, good to meet you, Quick question, before we dive in: have you actually read ${book.title} yet? Or are we starting fresh?`;
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessage: firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        // voice: {
        //   provider: `11labs` as const,
        //   voiceId: getVoice(voice).id,
        //   model: "eleven_turbo_v2_5" as const,
        //   stability: VOICE_SETTINGS.stability,
        //   similarityBoost: VOICE_SETTINGS.similarityBoost,
        //   style: VOICE_SETTINGS.style,
        //   useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        // },
      });
    } catch (e) {
      console.error("Error occurred", e);
      setStatus("idle");
      setLimitError("An unexpected error occurred and please try again later");
    }
  };

  const stop = async () => {
    if (!vapiRef.current) return;
    isStoppingRef.current = true;
    await vapiRef.current.stop();
    isStoppingRef.current = false;
  };

  const clearError = async () => {
    setLimitError(null);
  };

  return {
    status,
    message,
    currentMessage,
    currentUserMessage,
    duration,
    isActive,
    start,
    stop,
    clearError,
  };
};

export default useVapi;
