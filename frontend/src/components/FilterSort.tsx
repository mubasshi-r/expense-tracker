/**
 * FilterSort Component
 * 
 * Implements:
 * - UC3: User filters expenses by category
 * - UC4: User sorts expenses by date
 * - BR4: Category filtering
 * - BR9: Date sorting (newest/oldest first)
 */

import React from 'react';
import { VALID_CATEGORIES } from '../api/constants';
import '../styles/components.css';

interface FilterSortProps {
  selectedCategory: string;
  sortOrder: 'date_desc' | 'date_asc';
  onCategoryChange: (category: string) => void;
  onSortToggle: () => void;
}

export const FilterSort: React.FC<FilterSortProps> = ({
  selectedCategory,
  sortOrder,
  onCategoryChange,
  onSortToggle
}) => {
  const sortLabel = sortOrder === 'date_desc' ? '↓ Newest First' : '↑ Oldest First';

  return (
    <div className="filter-sort-container">
      <div className="controls">
        {/* Category Filter */}
        <div className="control-group">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="control-select"
          >
            <option value="">All Categories</option>
            {VALID_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Toggle */}
        <div className="control-group">
          <button
            onClick={onSortToggle}
            className="btn btn-secondary"
            title={`Sort: ${sortLabel}`}
          >
            {sortLabel}
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedCategory && (
        <div className="active-filters">
          <span className="filter-tag">
            Category: <strong>{selectedCategory}</strong>
            <button
              onClick={() => onCategoryChange('')}
              className="clear-btn"
              title="Clear filter"
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default FilterSort;
