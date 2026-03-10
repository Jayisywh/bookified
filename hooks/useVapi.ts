import { ASSISTANT_ID, voiceOptions, VOICE_SETTINGS } from "@/lib/constants";
import { IBook } from "@/types";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

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
  const { user } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [message, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number>(15);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationLimitReachedRef = useRef<boolean>(false);

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
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000,
          );
          setDuration(elapsed);

          // Check if exceeded max duration
          const maxDurationSeconds = maxDurationMinutes * 60;
          if (
            elapsed >= maxDurationSeconds &&
            !durationLimitReachedRef.current
          ) {
            durationLimitReachedRef.current = true;
            console.warn(
              `⏰ Duration limit exceeded: ${elapsed}s >= ${maxDurationSeconds}s`,
            );
            // Show error message
            setLimitError(
              `Session exceeded ${maxDurationMinutes} minute limit. Redirecting...`,
            );
            // Stop the call
            void vapiRef.current?.stop();
            // Redirect to home after a brief delay
            setTimeout(() => {
              router.push("/");
            }, 1500);
          }
        }
      }, 1000);
    });

    vapi.on("call-end", () => {
      console.log("Call ended");
      setStatus("idle");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Reset duration timer on call end
      startTimeRef.current = null;
      setDuration(0);
      durationLimitReachedRef.current = false;
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
          setStatus("listening");
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
          setStatus("listening");
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
  }, [maxDurationMinutes, router]);

  const start = async () => {
    if (!userId || !user)
      return setLimitError("Please login to start conversation");
    if (!vapiRef.current) return setLimitError("Vapi not initialized");

    setLimitError(null);
    setStatus("connecting");

    let shouldProceed = true;
    try {
      // 1. Best-effort: ask the server for the current plan (it can read Clerk Billing).
      // We still reload the Clerk user as a fallback, but Billing is the source of truth.
      let clientPlan: string | undefined;
      try {
        const planRes = await fetch("/api/plan", { method: "GET" });
        const planJson = await planRes.json();
        if (planJson?.success && typeof planJson.plan === "string") {
          clientPlan = planJson.plan;
        }
      } catch (e) {
        console.warn("Plan API unavailable, falling back", e);
      }

      // 2. Fallback to Clerk user metadata (only works if you store plan there)
      await user.reload();
      clientPlan =
        clientPlan ||
        (user.publicMetadata?.plan as string) ||
        (
          user.publicMetadata?.subscriptions as Array<{
            planSlug?: string;
          }>
        )?.[0]?.planSlug ||
        undefined;

      console.log("Starting session with plan:", clientPlan);

      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId: book._id,
          clientPlan: clientPlan, // Send the refreshed plan
        }),
      });

      const result = await response.json();

      if (!result.success) {
        const errMsg: string = result.error || "Unknown error";
        // If the server says you hit a limit, we stop here.
        if (
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("limit")
        ) {
          setLimitError(errMsg);
          setStatus("idle");
          shouldProceed = false;
        } else {
          toast.error(errMsg);
        }
      } else {
        sessionIdRef.current = result.sessionId;
        // Set max duration based on user's plan
        if (
          typeof result.maxDurationMinute === "number" &&
          result.maxDurationMinute > 0
        ) {
          setMaxDurationMinutes(result.maxDurationMinute);
        }
      }
    } catch (error: unknown) {
      console.warn("Session API error, proceeding locally", error);
      toast.error("Unable to contact session service.");
    }

    if (!shouldProceed) return;

    // 3. Start the Vapi call
    const firstMessage = `Hey, good to meet you! Quick question before we dive in: have you actually read ${book.title} yet? Or are we starting fresh?`;

    try {
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessage: firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        voice: {
          provider: "11labs",
          voiceId:
            voiceOptions[book.persona as keyof typeof voiceOptions]?.id ||
            voiceOptions.rachel.id,
          model: "eleven_turbo_v2_5",
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        },
      });
    } catch (error) {
      console.error("Vapi start error:", error);
      setStatus("idle");
      setLimitError("Failed to start voice assistant. Please try again.");
    }
  };

  const stop = async () => {
    if (!vapiRef.current) return;
    isStoppingRef.current = true;
    await vapiRef.current.stop();
    isStoppingRef.current = false;
  };

  const clearError = () => {
    setLimitError(null);
  };

  return {
    status,
    message,
    currentMessage,
    currentUserMessage,
    duration,
    maxDurationMinutes,
    isActive,
    start,
    stop,
    clearError,
    limitError,
  };
};

export default useVapi;
