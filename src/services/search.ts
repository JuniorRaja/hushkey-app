// Search service for instant filtering and querying of vault data

import type { VaultItem, Vault } from '../stores/authStore';

export interface SearchFilter {
  query: string;
  vaultIds?: string[];
  itemTypes?: VaultItem['type'][];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  hasPassword?: boolean;
}

export interface SearchResult {
  item: VaultItem;
  vault: Vault;
  score: number;
  matches: string[]; // which fields matched
}

class SearchService {
  private static instance: SearchService;

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Perform instant search across vaults
  search(vaults: Vault[], filter: SearchFilter): SearchResult[] {
    const results: SearchResult[] = [];
    const query = filter.query.toLowerCase().trim();

    if (!query && Object.keys(filter).length === 1) {
      // No query and no other filters, return all items
      for (const vault of vaults) {
        for (const item of vault.items) {
          results.push({
            item,
            vault,
            score: 0,
            matches: []
          });
        }
      }
      return results;
    }

    for (const vault of vaults) {
      // Filter by vault IDs if specified
      if (filter.vaultIds && !filter.vaultIds.includes(vault.id)) {
        continue;
      }

      for (const item of vault.items) {
        // Apply filters
        if (!this.matchesFilters(item, filter)) {
          continue;
        }

        // Calculate search score and matches
        const { score, matches } = this.calculateScore(item, query);

        if (score > 0 || query === '') {
          results.push({
            item,
            vault,
            score,
            matches
          });
        }
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  // Check if item matches the given filters
  private matchesFilters(item: VaultItem, filter: SearchFilter): boolean {
    // Item type filter
    if (filter.itemTypes && !filter.itemTypes.includes(item.type)) {
      return false;
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      if (!item.tags) return false;
      const hasMatchingTag = filter.tags.some(tag =>
        item.tags!.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }

    // Date range filter
    if (filter.dateRange) {
      const itemDate = item.updatedAt;
      if (itemDate < filter.dateRange.start || itemDate > filter.dateRange.end) {
        return false;
      }
    }

    // Has password filter
    if (filter.hasPassword !== undefined) {
      if (filter.hasPassword && !item.password) return false;
      if (!filter.hasPassword && item.password) return false;
    }

    return true;
  }

  // Calculate search score and find matching fields
  private calculateScore(item: VaultItem, query: string): { score: number; matches: string[] } {
    if (!query) return { score: 0, matches: [] };

    let score = 0;
    const matches: string[] = [];
    const terms = query.split(/\s+/).filter(term => term.length > 0);

    // Search in item name (highest weight)
    const nameMatch = this.getMatchScore(item.name, terms);
    if (nameMatch > 0) {
      score += nameMatch * 10;
      matches.push('name');
    }

    // Search in username (high weight)
    if (item.username) {
      const usernameMatch = this.getMatchScore(item.username, terms);
      if (usernameMatch > 0) {
        score += usernameMatch * 8;
        matches.push('username');
      }
    }

    // Search in URL (high weight)
    if (item.url) {
      // Extract domain from URL for better matching
      const domain = this.extractDomain(item.url);
      const urlMatch = this.getMatchScore(item.url, terms) + this.getMatchScore(domain, terms);
      if (urlMatch > 0) {
        score += urlMatch * 6;
        matches.push('url');
      }
    }

    // Search in notes (medium weight, only exact terms)
    if (item.notes) {
      const notesMatch = this.getExactMatchScore(item.notes, terms);
      if (notesMatch > 0) {
        score += notesMatch * 4;
        matches.push('notes');
      }
    }

    // Search in tags (medium weight)
    if (item.tags) {
      const tagMatches = item.tags.some(tag => this.getMatchScore(tag, terms) > 0);
      if (tagMatches) {
        score += 3;
        matches.push('tags');
      }
    }

    // Bonus for exact matches
    if (item.name.toLowerCase().includes(query)) {
      score += 5;
    }

    return { score, matches };
  }

  // Get match score for a field
  private getMatchScore(text: string, terms: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (lowerText.includes(term)) {
        // Exact match gets higher score
        if (lowerText === term) {
          score += 10;
        } else if (text.toLowerCase().startsWith(term)) {
          // Starts with term
          score += 7;
          // Word boundary match
          if (new RegExp(`\\b${this.escapeRegex(term)}`, 'i').test(text)) {
            score += 3;
          }
        } else {
          // Contains term
          score += 3;
        }
      }
    }

    return score;
  }

  // Get exact match score (for notes, less fuzzy)
  private getExactMatchScore(text: string, terms: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (lowerText.includes(term)) {
        score += 3;
      }
    }

    return score;
  }

  // Extract domain from URL
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove www. prefix
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  // Escape special regex characters
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Get search suggestions based on recent searches and common terms
  getSearchSuggestions(vaults: Vault[], query: string): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    if (!queryLower) {
      return suggestions;
    }

    // Find items that would match this partial query
    for (const vault of vaults) {
      for (const item of vault.items) {
        // Name suggestions
        if (item.name.toLowerCase().startsWith(queryLower) && !suggestions.includes(item.name)) {
          suggestions.push(item.name);
        }

        // Domain suggestions from URLs
        if (item.url) {
          const domain = this.extractDomain(item.url);
          if (domain.toLowerCase().startsWith(queryLower) && !suggestions.includes(domain)) {
            suggestions.push(domain);
          }
        }

        // Username suggestions
        if (item.username && item.username.toLowerCase().startsWith(queryLower) && !suggestions.includes(item.username)) {
          suggestions.push(item.username);
        }

        // Tag suggestions
        if (item.tags) {
          for (const tag of item.tags) {
            if (tag.toLowerCase().startsWith(queryLower) && !suggestions.includes(tag)) {
              suggestions.push(tag);
            }
          }
        }
      }
    }

    // Limit to top 5 suggestions
    return suggestions.slice(0, 5);
  }

  // Search within a specific vault
  searchInVault(vault: Vault, query: string): VaultItem[] {
    const filter: SearchFilter = { query };
    const results = this.search([vault], filter);
    return results.map(result => result.item);
  }

  // Get items by type (for quick filters)
  getItemsByType(vaults: Vault[], type: VaultItem['type']): SearchResult[] {
    return this.search(vaults, { query: '', itemTypes: [type] });
  }

  // Get recently used items
  getRecentlyUsed(vaults: Vault[], limit: number = 10): SearchResult[] {
    const allResults = this.search(vaults, { query: '' });
    return allResults
      .sort((a, b) => b.item.updatedAt.getTime() - a.item.updatedAt.getTime())
      .slice(0, limit);
  }

  // Get items by tags
  getItemsByTags(vaults: Vault[], tags: string[]): SearchResult[] {
    return this.search(vaults, { query: '', tags });
  }
}

export default SearchService.getInstance();
