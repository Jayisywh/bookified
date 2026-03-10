"use server";

import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { generateSlug, serializeData } from "../utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import { revalidatePath } from "next/cache";

export const getAllBooks = async () => {
  try {
    await connectToDatabase();
    const books = await Book.find().sort({ createdAt: -1 }).lean();
    return {
      success: true,
      data: serializeData(books),
    };
  } catch (error) {
    console.error("Error connecting to database", error);
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    await connectToDatabase();
    const book = await Book.findOne({ slug }).lean();

    if (!book) {
      return {
        success: false,
        data: null,
      };
    }

    return {
      success: true,
      data: serializeData(book),
    };
  } catch (error) {
    console.error("Error fetching book by slug", error);
    return {
      success: false,
      data: null,
    };
  }
};

export const checkBookExists = async (title: string) => {
  try {
    await connectToDatabase();
    const slug = generateSlug(title);
    const existingBook = await Book.findOne({ slug }).lean();
    if (existingBook) {
      return {
        status: "error",
        exists: true,
        book: serializeData(existingBook),
      };
    }
    return {
      exists: false,
    };
  } catch (e) {
    console.log("Error in checking book exists" + e);
    return {
      status: "error",
      message: e,
    };
  }
};

export const createBook = async (data: CreateBook) => {
  try {
    await connectToDatabase();
    const slug = generateSlug(data.title);
    const existingBook = await Book.findOne({ slug }).lean();
    if (existingBook) {
      return {
        status: "error",
        data: serializeData(existingBook),
        alreadyExists: true,
      };
    }
    //TODO: Check subscription limits before create a book

    const newBook = await Book.create({ ...data, slug, totalSegments: 0 });
    revalidatePath("/");
    return {
      status: "success",
      data: serializeData(newBook),
      alreadyExists: false,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("Error in createBook:", message);
    return {
      status: "error",
      data: null,
      alreadyExists: false,
      message,
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  clerkId: string,
  segments: TextSegment[],
) => {
  try {
    await connectToDatabase();
    const segmentsToSave = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }) => ({
        bookId,
        clerkId,
        content: text,
        segmentIndex: segmentIndex ?? 0,
        pageNumber: pageNumber ?? 1,
        wordCount: wordCount ?? 0,
      }),
    );
    await BookSegment.insertMany(segmentsToSave);
    await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });
    console.log("Book segments saved successfully");
    return {
      status: "success",
      data: { segmentsCreated: segments.length },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("Error in save book segments:", message);
    await BookSegment.deleteMany({ bookId });
    await Book.findByIdAndUpdate(bookId, { totalSegments: 0 });
    return {
      status: "fail",
      message,
    };
  }
};

export const searchBookSegments = async (
  bookId: string,
  query: string,
  limit: number = 3,
) => {
  try {
    await connectToDatabase();
    const segments = await BookSegment.find(
      { bookId, $text: { $search: query } },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();

    return {
      success: true,
      data: serializeData(segments),
    };
  } catch (error) {
    console.error("Error searching book segments", error);
    return {
      success: false,
      data: [],
    };
  }
};
