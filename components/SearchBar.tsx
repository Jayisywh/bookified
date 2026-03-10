"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const SearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("search") || "";
  const [inputValue, setInputValue] = useState(urlQuery);

  // Debounce the URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (inputValue.trim()) {
        params.set("search", inputValue);
      } else {
        params.delete("search");
      }

      router.push(`/?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, router, searchParams]);

  const handleClear = useCallback(() => {
    setInputValue("");
  }, []);

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container">
        <Search className="search-bar-icon" />
        <input
          type="text"
          placeholder="Search by title or author..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="search-bar-input"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="search-bar-clear"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
