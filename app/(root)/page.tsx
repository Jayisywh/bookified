import BookCard from "@/components/BookCard";
import Herosection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import { getAllBooks, searchBooks } from "@/lib/actions/book.actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ search?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.search || "";

  const bookResults = query ? await searchBooks(query) : await getAllBooks();

  const books = bookResults?.success ? bookResults.data : [];

  return (
    <main className="wrapper">
      <Herosection />
      <div className="library-section">
        <div className="library-header">
          <h2 className="library-title">Recent Books</h2>
          <SearchBar />
        </div>
        <div className="library-books-grid">
          {books.length > 0 ? (
            books.map((book) => (
              <BookCard
                key={book._id}
                title={book.title}
                author={book.author}
                coverURL={book.coverURL}
                slug={book.slug}
              />
            ))
          ) : (
            <p className="library-empty-message">
              {query
                ? `No books found matching "${query}"`
                : "No books available"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
