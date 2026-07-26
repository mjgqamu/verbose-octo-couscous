// SitePilot AI — Knowledge Base Search
// Simple keyword-based search over ai_knowledge_documents.
// Future: upgrade to pgvector similarity search.

import { db, schema, eq, and, or, sql } from "@sitepilot/db";

// ---- Types ----

export interface KnowledgeSearchResult {
  title: string;
  content: string;
  relevance: number;
}

// ---- Search ----

/**
 * Searches the knowledge base for documents matching the query.
 * Uses ILIKE keyword matching with a basic relevance score.
 * Returns top 5 matches.
 */
export async function searchKnowledge(
  orgId: string,
  query: string,
): Promise<KnowledgeSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  // Split query into keywords, filter short words
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 1);

  if (keywords.length === 0) {
    return [];
  }

  // Build ILIKE conditions — match any keyword against title or content
  const conditions = keywords.map((keyword) => {
    const pattern = `%${keyword}%`;
    return or(
      sql`${schema.aiKnowledgeDocuments.title} ILIKE ${pattern}`,
      sql`${schema.aiKnowledgeDocuments.content} ILIKE ${pattern}`,
    );
  });

  const docs = await db
    .select({
      title: schema.aiKnowledgeDocuments.title,
      content: schema.aiKnowledgeDocuments.content,
    })
    .from(schema.aiKnowledgeDocuments)
    .where(
      and(
        eq(schema.aiKnowledgeDocuments.orgId, orgId),
        or(...conditions),
      ),
    )
    .limit(20);

  // Score by keyword match count
  const scored: KnowledgeSearchResult[] = docs.map((doc) => {
    const contentLower = (doc.content + " " + doc.title).toLowerCase();
    let relevance = 0;
    for (const kw of keywords) {
      // Escape regex special chars
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      const matches = contentLower.match(regex);
      if (matches) relevance += matches.length;
    }
    return {
      title: doc.title,
      content: doc.content,
      relevance,
    };
  });

  // Sort by relevance descending, take top 5
  scored.sort((a, b) => b.relevance - a.relevance);

  return scored.slice(0, 5);
}
