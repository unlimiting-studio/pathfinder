import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".pathfinder");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export type ServiceName = "kakao" | "odsay";

interface ServiceConfig {
  apiKey: string;
}

interface Config {
  kakao?: ServiceConfig;
  odsay?: ServiceConfig;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getApiKey(service: ServiceName): string {
  const config = loadConfig();
  const svc = config[service];
  if (!svc?.apiKey) {
    const label = service === "kakao" ? "카카오" : "ODsay";
    throw new Error(
      `${label} API 키가 설정되지 않았습니다. \`pathfinder login ${service}\` 명령으로 먼저 설정해주세요.`
    );
  }
  return svc.apiKey;
}

export function deleteServiceConfig(service: ServiceName): void {
  const config = loadConfig();
  delete config[service];
  saveConfig(config);
}
