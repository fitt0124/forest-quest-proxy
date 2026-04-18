// api/notion.js
// Forest Quest × Notion 안전 연결 Proxy
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DB_ID = process.env.NOTION_QUEST_DB_ID;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const action = req.query.action || req.body?.action;

    if (action === "getToday") {
      const today = new Date().toISOString().split("T")[0];
      const response = await notion.databases.query({
        database_id: DB_ID,
        filter: { property: "Date", date: { equals: today } }
      });
      return res.status(200).json(formatQuests(response.results));
    }

    if (action === "getRecent") {
      const response = await notion.databases.query({
        database_id: DB_ID,
        filter: { property: "Done", checkbox: { equals: true } },
        sorts: [{ property: "Date", direction: "descending" }],
        page_size: 20
      });
      return res.status(200).json(formatQuests(response.results));
    }

    if (action === "toggleDone") {
      const { pageId, done } = req.body;
      await notion.pages.update({
        page_id: pageId,
        properties: { Done: { checkbox: done } }
      });
      return res.status(200).json({ success: true });
    }

    if (action === "getStats") {
      const response = await notion.databases.query({
        database_id: DB_ID,
        filter: { property: "Done", checkbox: { equals: true } },
        page_size: 100
      });
      return res.status(200).json(formatQuests(response.results));
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

function formatQuests(results) {
  return results.map((page) => {
    const p = page.properties;
    return {
      id: page.id,
      name: p.Name?.title?.[0]?.plain_text || "Untitled",
      date: p.Date?.date?.start || null,
      category: p.Category?.select?.name || "정신",
      done: p.Done?.checkbox || false,
      xp: p.XP?.number || null,
      reflection: p.Reflection?.rich_text?.[0]?.plain_text || ""
    };
  });
}
