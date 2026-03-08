import { auth } from "@clerk/nextjs/server";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

const BookDetailsPage = async ({ params }: BookPageProps) => {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { slug } = await params;
  const book = await getBookBySlug(slug);

  if (!book?.success || !book.data) redirect("/");

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Go back">
        <ArrowLeft className="size-5 text-[#212a3b]" />
      </Link>

      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <section className="vapi-header-card">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.data.coverURL}
              alt={book.data.title}
              width={120}
              height={180}
              className="vapi-cover-image"
            />
            <div className="vapi-mic-wrapper">
              <button type="button" className="vapi-mic-btn" aria-label="Mic">
                <MicOff className="size-5 text-[#2f2f2f]" />
              </button>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1f1f1f]">
              {book.data.title}
            </h1>
            <p className="text-[#5f5f5f] text-lg mt-1">by {book.data.author}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="vapi-status-indicator">
                <span className="vapi-status-dot vapi-status-dot-ready" />
                <span className="vapi-status-text">Ready</span>
              </div>
              <div className="vapi-badge-ai">
                <span className="vapi-badge-ai-text">
                  Voice: {book.data.persona || "Default"}
                </span>
              </div>
              <div className="vapi-badge-ai">
                <span className="vapi-badge-ai-text">0:00/15:00</span>
              </div>
            </div>
          </div>
        </section>

        <section className="transcript-container min-h-[400px]">
          <div className="transcript-empty">
            <Mic className="size-12 text-[#2f2f2f] mb-3" />
            <p className="transcript-empty-text">No conversation yet</p>
            <p className="transcript-empty-hint">
              Click the mic button above to start talking
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default BookDetailsPage;
