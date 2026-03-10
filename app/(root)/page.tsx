import BookCard from "@/components/BookCard";
import Herosection from "@/components/HeroSection";
import { getAllBooks } from "@/lib/actions/book.actions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const bookResults = await getAllBooks();
  const books = bookResults?.success ? bookResults.data : [];
  return (
    <main className="wrapper">
      <Herosection />
      <div className="library-books-grid">
        {books.map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            author={book.author}
            coverURL={book.coverURL}
            slug={book.slug}
          />
        ))}
      </div>
    </main>
  );
}
