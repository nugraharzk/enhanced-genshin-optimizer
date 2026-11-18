import fs from "node:fs"
import path from "node:path"
import { SandboxStorage } from "@genshin-optimizer/common/database"
import { ArtCharDatabase } from "@genshin-optimizer/gi/db"
import { computeTriage } from "./compute"

const DB = path.join(process.env["APPDATA"]!, "dev.local.genshin-optimizer", "shared", "go-db.json")

it("distribution", async () => {
  const raw = JSON.parse(fs.readFileSync(DB, "utf8")) as { keys: Record<string, string> }
  const storage = new SandboxStorage(raw.keys)
  storage.setDBVersion(26)
  const database = new ArtCharDatabase(1, storage)
  const results = await computeTriage(database)
  const values = [...results.values()].map((r) => r.value).sort((a, b) => a - b)
  const q = (p: number) => values[Math.floor(p * (values.length - 1))].toFixed(1)
  console.log("p", [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99].map((p) => `${p}:${q(p)}`).join(" "))
  const bySlot: Record<string, number[]> = {}
  for (const art of database.arts.values) {
    const r = results.get(art.id)!
    ;(bySlot[art.slotKey] ??= []).push(r.value)
  }
  for (const [slot, vals] of Object.entries(bySlot)) {
    vals.sort((a, b) => a - b)
    console.log(slot, "median", vals[Math.floor(vals.length / 2)].toFixed(1), "p90", vals[Math.floor(vals.length * 0.9)].toFixed(1))
  }
})
