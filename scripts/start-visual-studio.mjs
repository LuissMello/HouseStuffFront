process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000";
process.env.HOUSESTUFF_API_PROXY_TARGET = "http://localhost:5049";

process.argv = [process.execPath, "vinext", "dev"];
await import("../node_modules/vinext/dist/cli.js");
