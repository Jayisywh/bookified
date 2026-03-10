import { auth } from "@clerk/nextjs/server";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import VapiControls from "@/components/VapiControls";

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
        <VapiControls book={book.data} />
      </div>
    </main>
  );
};

export default BookDetailsPage;
