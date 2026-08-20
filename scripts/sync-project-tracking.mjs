import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPath = resolve(repositoryRoot, "..", "HouseStuffAPi", "docs", "tracking", "project.json");
const generatedPath = resolve(repositoryRoot, "app", "data", "project.generated.json");

const raw = await readFile(canonicalPath, "utf8");
const project = JSON.parse(raw);

if (project.project !== "HouseStuff" || !Array.isArray(project.stages) || !Array.isArray(project.tasks)) {
  throw new Error("A fonte canônica do acompanhamento é inválida.");
}

const ids = new Set();
for (const task of project.tasks) {
  if (!/^HOUSE-\d{3}$/.test(task.id) || ids.has(task.id)) {
    throw new Error(`ID de tarefa inválido ou duplicado: ${task.id}`);
  }
  ids.add(task.id);
}

await mkdir(dirname(generatedPath), { recursive: true });
await writeFile(generatedPath, `${JSON.stringify(project, null, 2)}\n`, "utf8");
console.log("Acompanhamento sincronizado a partir do HouseStuffAPi.");
