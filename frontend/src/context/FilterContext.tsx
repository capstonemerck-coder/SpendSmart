/**
 * FilterContext.tsx
 *
 * Manages cascading filter state for the Data Input module.
 * Supports Market → Brand → Indication filtering with metadata ID resolution.
 * Fetches all MetaData rows on mount and derives cascading options.
 * Exports both context and provider hook for scoped usage.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { reportsService } from '@/services/reports.service';
import type { MetaData } from '@/utils/types';

interface FilterContextValue {
  // Data
  metadata: MetaData[];
  isLoading: boolean;
  error: string | null;

  // Cascading filter state
  selectedMarket: string | null;
  selectedBrand: string | null;
  selectedIndication: string | null;
  selectedMetadataId: number | null;

  // Setters
  setSelectedMarket: (market: string | null) => void;
  setSelectedBrand: (brand: string | null) => void;
  setSelectedIndication: (indication: string | null) => void;

  // Derived lists for dropdowns
  markets: string[];
  brands: string[];
  indications: string[];
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

/**
 * Provider component for Filter context. Wraps the Data Input module.
 * Fetches metadata on mount and manages cascading filter state.
 */
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metadata, setMetadata] = useState<MetaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedIndication, setSelectedIndication] = useState<string | null>(null);
  const [selectedMetadataId, setSelectedMetadataId] = useState<number | null>(null);

  // Fetch all metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const data = await reportsService.metadata();
        setMetadata(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
        setMetadata([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  // Derive unique market list
  const markets = Array.from(
    new Set(metadata.filter((m) => m.market).map((m) => m.market!)),
  ).sort();

  // Derive brand list for selected market
  const brands = selectedMarket
    ? Array.from(
        new Set(
          metadata
            .filter((m) => m.market === selectedMarket && m.brand)
            .map((m) => m.brand!),
        ),
      ).sort()
    : [];

  // Derive indication list for selected market + brand
  const indications = selectedMarket && selectedBrand
    ? Array.from(
        new Set(
          metadata
            .filter(
              (m) =>
                m.market === selectedMarket &&
                m.brand === selectedBrand &&
                m.indication,
            )
            .map((m) => m.indication!),
        ),
      ).sort()
    : [];

  // Resolve metadata ID when all three filters are selected
  useEffect(() => {
    if (selectedMarket && selectedBrand && selectedIndication) {
      const row = metadata.find(
        (m) =>
          m.market === selectedMarket &&
          m.brand === selectedBrand &&
          m.indication === selectedIndication,
      );
      setSelectedMetadataId(row?.metadata_id || null);
    } else {
      setSelectedMetadataId(null);
    }
  }, [selectedMarket, selectedBrand, selectedIndication, metadata]);

  // Reset brand and indication when market changes
  const handleMarketChange = (market: string | null) => {
    setSelectedMarket(market);
    setSelectedBrand(null);
    setSelectedIndication(null);
  };

  // Reset indication when brand changes
  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    setSelectedIndication(null);
  };

  const value: FilterContextValue = {
    metadata,
    isLoading,
    error,
    selectedMarket,
    selectedBrand,
    selectedIndication,
    selectedMetadataId,
    setSelectedMarket: handleMarketChange,
    setSelectedBrand: handleBrandChange,
    setSelectedIndication,
    markets,
    brands,
    indications,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

/**
 * Hook to access FilterContext. Must be used within a FilterProvider.
 *
 * @returns {FilterContextValue} Filter state and setters.
 * @throws Will throw if used outside FilterProvider.
 */
export const useFilters = (): FilterContextValue => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
