// src/lib/whales/types.ts
/**
 * 🐋 Crypto Whales - Type Definitions
 */

export interface TokenHolder
{
  rank: number;
  address: string;
  balance: string;
  balanceFormatted: number;
  share: number; // percentage
  valueUsd?: number;
}

export interface WhalesApiResponse
{
  tokenId: string;
  symbol: string;
  name: string;
  chainId: number;
  chainName: string;
  contractAddress: string;
  holders: TokenHolder[];
  totalHolders: number;
  totalSupply?: string;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  // Meta
  lastUpdated: string;
  source: string;
}

export interface WhalesApiError
{
  error: string;
  message: string;
}
