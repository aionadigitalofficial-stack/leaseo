import express from "express";
import path from "path";

export function serveStatic(app: express.Express) {
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.use(express.static(publicDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}
