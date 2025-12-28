"""
Graph Analyzer - Transaction Network Analysis
==============================================
Analyzes wallet relationships and money flow tracking.
Similar to Nansen and Chainalysis capabilities.
"""

import networkx as nx
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class GraphAnalyzer:
    """
    Network Graph Analyzer for blockchain transactions.
    
    Capabilities:
    1. Detect wallet clusters (wallets belonging to the same entity)
    2. Identify mixing/money laundering patterns
    3. Track smart money flow
    4. Find central/influential wallets
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()  # Directed Graph (from -> to)
        logger.info("GraphAnalyzer initialized")

    def build_transaction_graph(self, transactions: List[Dict]) -> None:
        """
        Build network graph from transaction list.
        
        Args:
            transactions: List of transaction dictionaries with 'from', 'to', 'value'
        """
        for tx in transactions:
            sender = tx.get("from")
            receiver = tx.get("to")
            amount = tx.get("value", 0)
            
            if sender and receiver:
                # Add edges with weight (amount)
                if self.graph.has_edge(sender, receiver):
                    # Accumulate weights for multiple transactions
                    self.graph[sender][receiver]['weight'] += amount
                else:
                    self.graph.add_edge(sender, receiver, weight=amount)
        
        logger.info(f"Built graph with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges")

    def find_central_wallets(self, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        Identify central/most important wallets in the network.
        Uses PageRank algorithm (same as Google).
        
        Args:
            top_n: Number of top wallets to return
            
        Returns:
            List of (wallet_address, importance_score) tuples
        """
        if self.graph.number_of_nodes() == 0:
            logger.warning("Graph is empty, cannot find central wallets")
            return []
            
        try:
            # PageRank: Wallets receiving funds from important wallets are important
            pagerank = nx.pagerank(self.graph, alpha=0.85)
            
            # Sort by importance
            sorted_wallets = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
            return sorted_wallets[:top_n]
        except Exception as e:
            logger.error(f"Error calculating PageRank: {e}")
            return []

    def detect_clusters(self, min_cluster_size: int = 2) -> List[List[str]]:
        """
        Detect wallet clusters - wallets that may be controlled by the same entity.
        
        Args:
            min_cluster_size: Minimum number of wallets to consider a cluster
            
        Returns:
            List of clusters (each cluster is a list of wallet addresses)
        """
        if self.graph.number_of_nodes() == 0:
            logger.warning("Graph is empty, cannot detect clusters")
            return []
            
        try:
            # Convert to undirected graph to find connected components
            undirected = self.graph.to_undirected()
            clusters = list(nx.connected_components(undirected))
            
            # Filter by minimum size
            filtered_clusters = [list(c) for c in clusters if len(c) >= min_cluster_size]
            logger.info(f"Detected {len(filtered_clusters)} clusters")
            return filtered_clusters
        except Exception as e:
            logger.error(f"Error detecting clusters: {e}")
            return []

    def trace_money_flow(self, start_address: str, depth: int = 3) -> List[Tuple[str, str]]:
        """
        Trace money flow from a specific address (Forensic Analysis).
        Tracks: "Where did this money come from? Where did it go?"
        
        Args:
            start_address: Starting wallet address
            depth: How many hops to trace
            
        Returns:
            List of (from, to) edges representing the flow path
        """
        if start_address not in self.graph:
            logger.warning(f"Address {start_address} not found in graph")
            return []
            
        try:
            # BFS tree from start address
            tree = nx.bfs_tree(self.graph, start_address, depth_limit=depth)
            edges = list(tree.edges())
            logger.info(f"Traced {len(edges)} transactions from {start_address}")
            return edges
        except Exception as e:
            logger.error(f"Error tracing money flow: {e}")
            return []

    def get_wallet_stats(self, address: str) -> Optional[Dict]:
        """
        Get statistics for a specific wallet.
        
        Args:
            address: Wallet address
            
        Returns:
            Dictionary with wallet statistics
        """
        if address not in self.graph:
            return None
            
        try:
            # In-degree: number of incoming transactions
            in_degree = self.graph.in_degree(address)
            # Out-degree: number of outgoing transactions
            out_degree = self.graph.out_degree(address)
            
            # Calculate total inflow and outflow
            total_inflow = sum(self.graph[pred][address]['weight'] 
                             for pred in self.graph.predecessors(address))
            total_outflow = sum(self.graph[address][succ]['weight'] 
                              for succ in self.graph.successors(address))
            
            return {
                "address": address,
                "incoming_tx_count": in_degree,
                "outgoing_tx_count": out_degree,
                "total_inflow": total_inflow,
                "total_outflow": total_outflow,
                "net_flow": total_inflow - total_outflow
            }
        except Exception as e:
            logger.error(f"Error getting wallet stats: {e}")
            return None

    def reset(self) -> None:
        """Clear the graph for new analysis."""
        self.graph.clear()
        logger.info("Graph reset")
