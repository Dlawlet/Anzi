'use client'
import React, { useState } from "react";

type SearchBarProps = {
    onSearch: (query: string) => void;
  };

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    // Perform search logic here, e.g., using an API or custom search function
    // Pass the search query to the parent component or function for further processing
    onSearch(searchQuery);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search for an address..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
