"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  checkBookExists,
  createBook,
  saveBookSegments,
} from "@/lib/actions/book.actions";
import { useRouter } from "next/navigation";
import { parsePDFFile } from "@/lib/utils";
import { upload } from "@vercel/blob/client";

const voices = [
  {
    value: "dave",
    label: "Dave",
    desc: "Young male, British-Essex, casual & conversational",
  },
  {
    value: "daniel",
    label: "Daniel",
    desc: "Middle-aged male, British, authoritative but warm",
  },
  {
    value: "chris",
    label: "Chris",
    desc: "Male, casual & easy-going",
  },
  {
    value: "rachel",
    label: "Rachel",
    desc: "Young female, American, calm & clear",
  },
  {
    value: "sarah",
    label: "Sarah",
    desc: "Young female, American, soft & approachable",
  },
];

const bookSchema = z.object({
  pdf: z
    .any()
    .refine((file) => file instanceof File, "PDF is required")
    .refine(
      (file) => !file || file.type === "application/pdf",
      "File must be a PDF",
    )
    .refine((file) => !file || file.size <= 50 * 1024 * 1024, "Max 50MB"),
  cover: z
    .any()
    .optional()
    .refine((file) => !file || file instanceof File, "Invalid file"),
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  persona: z.enum(["dave", "daniel", "chris", "rachel", "sarah"]),
});

type BookForm = z.infer<typeof bookSchema>;

const UploadForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
    defaultValues: { persona: "dave" },
  });

  const pdfFile = watch("pdf");
  const coverFile = watch("cover");

  const onSubmit = async (data: BookForm) => {
    if (!userId) {
      return toast.error("Please login to upload file");
    }
    if (!data.pdf) {
      return toast.error("Please upload a PDF file.");
    }
    setIsLoading(true);
    // PostHog -> Track book uploads
    try {
      const existsCheck = await checkBookExists(data.title);
      if (existsCheck.exists && existsCheck.book) {
        toast.info("Book with same title already exists");
        reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }
      const fileTitle = data.title.replace(/\s+/g, "-").toLowerCase();
      const pdfFile = data.pdf;
      const parsedPDF = await parsePDFFile(pdfFile);
      if (parsedPDF.content.length === 0) {
        toast.error(
          "Failed to parse PDF. Please try again with a different file",
        );
        return;
      }
      const uploadPDFBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
      });
      let coverUrl: string;
      if (data.cover && data.cover.length > 0) {
        const coverFile = data.cover[0];
        const uploadCoverBlob = await upload(
          `${fileTitle}_cover.png`,
          coverFile,
          {
            access: "public",
            handleUploadUrl: "/api/upload",
            contentType: coverFile.type,
          },
        );
        coverUrl = uploadCoverBlob.url;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/png",
        });
        coverUrl = uploadedCoverBlob.url;
      }
      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.persona,
        fileURL: uploadPDFBlob.url,
        fileBlobKey: uploadPDFBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size,
      });
      if (book.alreadyExists) {
        toast.info("Book already exists");
        reset();
        if (book.data?.slug) {
          router.push(`/books/${book.data.slug}`);
        } else {
          router.push("/");
        }
        return;
      }
      if (book.status !== "success") {
        throw new Error(
          typeof book.message === "string"
            ? book.message
            : "Failed to create a book",
        );
      }

      if (!book.data) {
        throw new Error(
          typeof book.message === "string"
            ? book.message
            : "Book data is missing",
        );
        return;
      }
      if (!book.data?._id) {
        throw new Error("Book id is missing");
      }
      const segment = await saveBookSegments(
        book.data._id,
        userId,
        parsedPDF.content,
      );
      if (segment.status !== "success") {
        throw new Error(
          typeof segment.message === "string"
            ? segment.message
            : "Failed to save book segments",
        );
      }
      reset();
      router.push("/");
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Fail to upload book. Please try again later";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }

    // console.log("submitting", data);
    // await new Promise((r) => setTimeout(r, 1500));
    // setIsLoading(false);
  };

  return (
    <div className="new-book-wrapper">
      {isLoading && (
        <div className="loading-wrapper">
          <div className="loading-shadow-wrapper">
            <div className="loading-shadow">
              <div className="text-7xl animate-bounce">📚</div>
              <div className="loading-title">Uploading your book...</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* PDF upload */}
        <div>
          <label className="form-label">Book PDF File</label>
          <Controller
            control={control}
            name="pdf"
            render={({ field }) => (
              <div
                className={`upload-dropzone ${
                  pdfFile ? "upload-dropzone-uploaded" : ""
                }`}
                onClick={() => {
                  document.getElementById("pdf-input")?.click();
                }}
              >
                {!pdfFile && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="upload-dropzone-icon"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h10M7 11h4m1 7h3a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v10a2 2 0 002 2h3"
                      />
                    </svg>
                    <span className="upload-dropzone-text">
                      Click to upload PDF
                    </span>
                    <span className="upload-dropzone-hint">
                      PDF file (max 50MB)
                    </span>
                  </>
                )}
                {pdfFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{(pdfFile as File).name}</span>
                    <span
                      className="upload-dropzone-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        field.onChange(null);
                      }}
                    >
                      &times;
                    </span>
                  </div>
                )}
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    field.onChange(file || null);
                  }}
                />
              </div>
            )}
          />
          {errors.pdf && (
            <p className="text-red-500 text-sm mt-1">
              {errors.pdf.message as string}
            </p>
          )}
        </div>

        {/* Cover upload */}
        <div>
          <label className="form-label">Cover Image (Optional)</label>
          <Controller
            control={control}
            name="cover"
            render={({ field }) => (
              <div
                className={`upload-dropzone ${
                  coverFile ? "upload-dropzone-uploaded" : ""
                }`}
                onClick={() => {
                  document.getElementById("cover-input")?.click();
                }}
              >
                {!coverFile && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="upload-dropzone-icon"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4M3 7h18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7l6 8 4-5 5 6"
                      />
                    </svg>
                    <span className="upload-dropzone-text">
                      Click to upload cover image
                    </span>
                    <span className="upload-dropzone-hint">
                      Leave empty to auto-generate from PDF
                    </span>
                  </>
                )}
                {coverFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{(coverFile as File).name}</span>
                    <span
                      className="upload-dropzone-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        field.onChange(null);
                      }}
                    >
                      &times;
                    </span>
                  </div>
                )}
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    field.onChange(file || null);
                  }}
                />
              </div>
            )}
          />
          {errors.cover && (
            <p className="text-red-500 text-sm mt-1">
              {errors.cover.message as string}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="form-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="form-input"
            placeholder="ex: Rich Dad Poor Dad"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Author */}
        <div>
          <label className="form-label" htmlFor="author">
            Author Name
          </label>
          <input
            id="author"
            className="form-input"
            placeholder="ex: Robert Kiyosaki"
            {...register("author")}
          />
          {errors.author && (
            <p className="text-red-500 text-sm mt-1">{errors.author.message}</p>
          )}
        </div>

        {/* Voice selector */}
        <div>
          <p className="form-label">Choose Assistant Voice</p>
          <Controller
            control={control}
            name="persona"
            render={({ field }) => (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold">Male Voices</p>
                    <div className="voice-selector-options mt-2">
                      {voices
                        .filter((v) =>
                          ["dave", "daniel", "chris"].includes(v.value),
                        )
                        .map((v) => (
                          <label
                            key={v.value}
                            className={`voice-selector-option ${
                              field.value === v.value
                                ? "voice-selector-option-selected"
                                : "voice-selector-option-default"
                            }`}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              value={v.value}
                              checked={field.value === v.value}
                              onChange={() => field.onChange(v.value)}
                            />
                            <div className="flex flex-col items-start">
                              <span>{v.label}</span>
                              <span className="text-sm text-[#777]">
                                {v.desc}
                              </span>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Female Voices</p>
                    <div className="voice-selector-options mt-2">
                      {voices
                        .filter((v) => ["rachel", "sarah"].includes(v.value))
                        .map((v) => (
                          <label
                            key={v.value}
                            className={`voice-selector-option ${
                              field.value === v.value
                                ? "voice-selector-option-selected"
                                : "voice-selector-option-default"
                            }`}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              value={v.value}
                              checked={field.value === v.value}
                              onChange={() => field.onChange(v.value)}
                            />
                            <div className="flex flex-col items-start">
                              <span>{v.label}</span>
                              <span className="text-sm text-[#777]">
                                {v.desc}
                              </span>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          />
          {errors.persona && (
            <p className="text-red-500 text-sm mt-1">
              {errors.persona.message}
            </p>
          )}
        </div>

        <button type="submit" className="form-btn">
          Begin Synthesis
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
