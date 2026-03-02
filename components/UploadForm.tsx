"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  voice: z.enum(["dave", "daniel", "chris", "rachel", "sarah"]),
});

type BookForm = z.infer<typeof bookSchema>;

const UploadForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
    defaultValues: { voice: "dave" },
  });

  const pdfFile = watch("pdf");
  const coverFile = watch("cover");

  const onSubmit = async (data: BookForm) => {
    setIsLoading(true);
    // placeholder for actual upload logic
    console.log("submitting", data);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
  };

  return (
    <div className="new-book-wrapper">
      {isLoading && (
        <div className="loading-wrapper">
          <div className="loading-shadow-wrapper">
            <div className="loading-shadow">
              <svg
                className="loading-animation"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <div className="loading-title">Processing...</div>
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
            name="voice"
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
          {errors.voice && (
            <p className="text-red-500 text-sm mt-1">{errors.voice.message}</p>
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
