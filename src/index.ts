#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, saveConfig, getApiKey, getConfigPath } from "./config.js";
import {
  directions,
  futureDirections,
  waypointsDirections,
  type RouteOptions,
} from "./api.js";
import { printDirectionsResponse } from "./format.js";
import { resolveLocation, resolveWaypoints } from "./geocode.js";

const program = new Command();

program
  .name("pathfinder")
  .description("카카오 모빌리티 길찾기 API CLI 도구")
  .version("0.1.0");

// ── login ──────────────────────────────────────────────────────────
program
  .command("login")
  .description("카카오 REST API 키를 등록합니다")
  .option("-k, --key <key>", "API 키를 직접 지정")
  .action(async (opts) => {
    let apiKey = opts.key as string | undefined;

    if (!apiKey) {
      const answers = await inquirer.prompt([
        {
          type: "password",
          name: "apiKey",
          message: "카카오 REST API 키를 입력하세요:",
          mask: "*",
          validate: (v: string) =>
            v.trim().length > 0 || "API 키를 입력해주세요.",
        },
      ]);
      apiKey = answers.apiKey as string;
    }

    saveConfig({ apiKey: apiKey!.trim() });
    console.log(chalk.green("✅ API 키가 저장되었습니다."));
    console.log(chalk.dim(`   설정 파일: ${getConfigPath()}`));
  });

// ── status ─────────────────────────────────────────────────────────
program
  .command("status")
  .description("현재 로그인 상태를 확인합니다")
  .action(() => {
    const config = loadConfig();
    if (config) {
      const masked =
        config.apiKey.slice(0, 4) + "..." + config.apiKey.slice(-4);
      console.log(chalk.green(`✅ 로그인됨 (키: ${masked})`));
      console.log(chalk.dim(`   설정 파일: ${getConfigPath()}`));
    } else {
      console.log(
        chalk.yellow("❌ 로그인되지 않음. `pathfinder login`으로 설정하세요.")
      );
    }
  });

// ── logout ─────────────────────────────────────────────────────────
program
  .command("logout")
  .description("저장된 API 키를 삭제합니다")
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      console.log(chalk.yellow("이미 로그아웃 상태입니다."));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "저장된 API 키를 삭제하시겠습니까?",
        default: false,
      },
    ]);

    if (confirm) {
      const fs = await import("node:fs");
      try {
        fs.unlinkSync(getConfigPath());
        console.log(chalk.green("✅ API 키가 삭제되었습니다."));
      } catch {
        console.log(chalk.red("삭제에 실패했습니다."));
      }
    }
  });

// ── Shared option helpers ──────────────────────────────────────────
function addRouteOptions(cmd: Command): Command {
  return cmd
    .option(
      "-p, --priority <priority>",
      "경로 탐색 우선순위 (RECOMMEND|TIME|DISTANCE)",
      "RECOMMEND"
    )
    .option(
      "--avoid <avoid>",
      "회피 옵션 (ferries|toll|motorway|schoolzone|uturn, |로 구분)"
    )
    .option("--alternatives", "대안 경로 포함")
    .option("--road-details", "상세 도로 정보 포함")
    .option("--car-type <type>", "차량 종류 (기본: 1)", "1")
    .option(
      "--car-fuel <fuel>",
      "연료 종류 (GASOLINE|DIESEL|LPG)",
      "GASOLINE"
    )
    .option("--car-hipass", "하이패스 장착 여부")
    .option("--summary", "요약 정보만 반환")
    .option("--json", "JSON 원본 출력");
}

function extractRouteOptions(opts: Record<string, unknown>): RouteOptions {
  return {
    priority: opts.priority as RouteOptions["priority"],
    avoid: opts.avoid ? (opts.avoid as string).split("|") : undefined,
    alternatives: !!opts.alternatives,
    roadDetails: !!opts.roadDetails,
    carType: parseInt(opts.carType as string, 10),
    carFuel: opts.carFuel as RouteOptions["carFuel"],
    carHipass: !!opts.carHipass,
    summary: !!opts.summary,
  };
}

// ── directions ─────────────────────────────────────────────────────
addRouteOptions(
  program
    .command("directions")
    .alias("dir")
    .description("자동차 길찾기 (출발지 → 도착지, 최대 5개 경유지)")
    .requiredOption(
      "-o, --origin <location>",
      "출발지 (주소, 장소명, 또는 경도,위도)"
    )
    .requiredOption("-d, --dest <location>", "도착지 (주소, 장소명, 또는 경도,위도)")
    .option(
      "-w, --waypoints <locations>",
      "경유지 (|로 구분, 최대 5개, 주소/장소명 가능)"
    )
).action(async (opts) => {
  const apiKey = getApiKey();

  console.log(chalk.dim("🔍 위치를 검색하고 있습니다...\n"));
  const origin = await resolveLocation(apiKey, opts.origin as string);
  const destination = await resolveLocation(apiKey, opts.dest as string);
  const waypoints = opts.waypoints
    ? await resolveWaypoints(apiKey, opts.waypoints as string)
    : undefined;
  const routeOpts = extractRouteOptions(opts);

  const spinner = ora("경로를 검색하고 있습니다...").start();
  try {
    const res = await directions(apiKey, {
      origin,
      destination,
      waypoints,
      ...routeOpts,
    });
    spinner.stop();
    printDirectionsResponse(res, !!opts.json);
  } catch (e) {
    spinner.fail((e as Error).message);
    process.exit(1);
  }
});

// ── waypoints ──────────────────────────────────────────────────────
addRouteOptions(
  program
    .command("waypoints")
    .alias("wp")
    .description("다중 경유지 길찾기 (최대 30개 경유지, POST)")
    .requiredOption(
      "-o, --origin <location>",
      "출발지 (주소, 장소명, 또는 경도,위도)"
    )
    .requiredOption("-d, --dest <location>", "도착지 (주소, 장소명, 또는 경도,위도)")
    .requiredOption(
      "-w, --waypoints <locations>",
      "경유지 (|로 구분, 최대 30개, 주소/장소명 가능)"
    )
).action(async (opts) => {
  const apiKey = getApiKey();

  console.log(chalk.dim("🔍 위치를 검색하고 있습니다...\n"));
  const origin = await resolveLocation(apiKey, opts.origin as string);
  const destination = await resolveLocation(apiKey, opts.dest as string);
  const waypoints = await resolveWaypoints(apiKey, opts.waypoints as string);

  if (waypoints.length > 30) {
    console.log(chalk.red("❌ 경유지는 최대 30개까지 지정할 수 있습니다."));
    process.exit(1);
  }

  const spinner = ora(
    `경유지 ${waypoints.length}개 경로를 검색하고 있습니다...`
  ).start();
  try {
    const res = await waypointsDirections(apiKey, {
      origin,
      destination,
      waypoints,
      ...extractRouteOptions(opts),
    });
    spinner.stop();
    printDirectionsResponse(res, !!opts.json);
  } catch (e) {
    spinner.fail((e as Error).message);
    process.exit(1);
  }
});

// ── future ─────────────────────────────────────────────────────────
addRouteOptions(
  program
    .command("future")
    .alias("ft")
    .description("미래 운행정보 길찾기 (출발 시간 지정)")
    .requiredOption(
      "-o, --origin <location>",
      "출발지 (주소, 장소명, 또는 경도,위도)"
    )
    .requiredOption("-d, --dest <location>", "도착지 (주소, 장소명, 또는 경도,위도)")
    .requiredOption(
      "-t, --time <time>",
      "출발 시간 (YYYYMMDDHHMM 형식, 예: 202603170900)"
    )
    .option(
      "-w, --waypoints <locations>",
      "경유지 (|로 구분, 최대 5개, 주소/장소명 가능)"
    )
).action(async (opts) => {
  const apiKey = getApiKey();
  const departureTime = opts.time as string;

  if (!/^\d{12}$/.test(departureTime)) {
    console.log(
      chalk.red(
        "❌ 출발 시간 형식이 올바르지 않습니다. YYYYMMDDHHMM (예: 202603170900)"
      )
    );
    process.exit(1);
  }

  console.log(chalk.dim("🔍 위치를 검색하고 있습니다...\n"));
  const origin = await resolveLocation(apiKey, opts.origin as string);
  const destination = await resolveLocation(apiKey, opts.dest as string);
  const waypoints = opts.waypoints
    ? await resolveWaypoints(apiKey, opts.waypoints as string)
    : undefined;

  const spinner = ora("미래 경로를 검색하고 있습니다...").start();
  try {
    const res = await futureDirections(apiKey, {
      origin,
      destination,
      departureTime,
      waypoints,
      ...extractRouteOptions(opts),
    });
    spinner.stop();
    printDirectionsResponse(res, !!opts.json);
  } catch (e) {
    spinner.fail((e as Error).message);
    process.exit(1);
  }
});

// ── Ensure login before API commands ───────────────────────────────
program.hook("preAction", (thisCommand) => {
  const name = thisCommand.name();
  if (["login", "status", "logout"].includes(name)) return;

  try {
    getApiKey();
  } catch {
    console.log(
      chalk.yellow(
        "⚠️  API 키가 설정되지 않았습니다. 먼저 로그인해주세요:\n"
      )
    );
    console.log(chalk.cyan("  pathfinder login\n"));
    process.exit(1);
  }
});

program.parse();
