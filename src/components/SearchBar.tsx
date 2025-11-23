import { useState, useEffect, useCallback } from "react";
import { useAppStore, type Vault } from "../stores/authStore";
import SearchService, {
  type SearchFilter,
  type SearchResult,
} from "../services/search";

interface SearchBarProps {
  onResultsChange: (results: SearchResult[]) => void;
}

const SearchBar = ({ onResultsChange }: SearchBarProps) => {
  const { vaults } = useAppStore();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, vaultsData: Vault[]) => {
      setIsSearching(true);

      const filter: SearchFilter = { query: searchQuery };
      const results = SearchService.search(vaultsData, filter);

      onResultsChange(results);
      setIsSearching(false);
    }, 150),
    []
  );

  // Effect for instant search
  useEffect(() => {
    if (vaults.length > 0) {
      debouncedSearch(query, vaults);
    }
  }, [query, vaults, debouncedSearch]);

  // Effect for suggestions
  useEffect(() => {
    if (query.length > 0 && vaults.length > 0) {
      const suggestions = SearchService.getSearchSuggestions(vaults, query);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, vaults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear results when search is empty
    if (!value.trim()) {
      onResultsChange([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < suggestions.length
        ) {
          e.preventDefault();
          setQuery(suggestions[selectedSuggestionIndex]);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    onResultsChange([]);
  };

  return (
    <div className="search-container">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search passwords, sites, usernames..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() =>
              query.length > 0 &&
              suggestions.length > 0 &&
              setShowSuggestions(true)
            }
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="search-input"
            autoComplete="off"
            spellCheck="false"
          />
          {isSearching && <span className="search-spinner">⟳</span>}
          {query && (
            <button
              onClick={clearSearch}
              className="clear-search-btn"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={`suggestion-item ${
                  index === selectedSuggestionIndex ? "selected" : ""
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="suggestion-icon">🔍</span>
                <span className="suggestion-text">{suggestion}</span>
                <span className="suggestion-tail">↗</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

export default SearchBar;
