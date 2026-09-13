import { db } from "../src/db/client";
import { keywords, keywordRankings } from "../src/db/schema";
import { checkRank, shutdownBrowser } from "../src/lib/rank-checker";
import { eq } from "drizzle-orm";

async function run() {
  const allKeywords = await db
    .select()
    .from(keywords)
    .where(eq(keywords.clientId, 1));

  console.log(`Found ${allKeywords.length} keywords for Roznamcha.`);

  for (const kw of allKeywords) {
    console.log(`\nChecking [#${kw.id}] "${kw.query}"...`);
    try {
      const result = await checkRank(kw.query, "https://roznamcha.pk", {
        country: kw.country || "PK",
        language: kw.language || "ur",
        device: "desktop",
        screenshot: false,
      });

      const posStr = result.position !== null ? `#${result.position}` : "Not in top 100";
      console.log(`  -> Position: ${posStr} | Engine: ${result.engine} | URL: ${result.url || 'None'}`);

      await db.insert(keywordRankings).values({
        keywordId: kw.id,
        position: result.position,
        url: result.url,
        checkedAt: result.checkedAt,
        device: "desktop",
        source: "scrape",
      });
    } catch (err: any) {
      console.error(`  Error checking "${kw.query}":`, err.message);
    }
  }

  await shutdownBrowser().catch(() => {});
  console.log("\nAll keyword rank checks complete!");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
