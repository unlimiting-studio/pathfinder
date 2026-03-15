#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import {
  loadConfig,
  saveConfig,
  getApiKey,
  getConfigPath,
  deleteServiceConfig,
  type ServiceName,
} from "./config.js";
import {
  directions,
  futureDirections,
  waypointsDirections,
  type RouteOptions,
} from "./api.js";
import { printDirectionsResponse, printTransitResponse } from "./format.js";
import { resolveLocation, resolveWaypoints } from "./geocode.js";
import { searchTransitPath } from "./odsay-api.js";

const program = new Command();

program
  .name("pathfinder")
  .description("한국 길찾기 CLI (자동차 + 대중교통)")
  .version("0.2.0");

// ── login ──────────────────────────────────────────────────────────
program
  .command("login")
  .argument("[service]", "서비스 선택 (kakao 또는 odsay)")
  .description("API 키를 등록합니다 (kakao 또는 odsay)")
  .option("-k, --key <key>", "API 키를 직접 지정")
  .action(async (service: string | undefined, opts) => {
    let svc = service as ServiceName | undefined;

    if (!svc) {
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "service",
          message: "어떤 서비스의 API 키를 등록하시겠습니까?",
          choices: [
            { name: "카카오 (자동차 길찾기, 주소 검색)", value: "kakao" },
            { name: "ODsay (대중교통 길찾기)", value: "odsay" },
          ],
        },
      ]);
      svc = answers.service as ServiceName;
    }

    if (svc !== "kakao" && svc !== "odsay") {
      console.log(chalk.red("❌ 서비스는 kakao 또는 odsay만 가능합니다."));
      process.exit(1);
    }

    let apiKey = opts.key as string | undefined;
    const label = svc === "kakao" ? "카카오 REST API" : "ODsay API";

    if (!apiKey) {
      const answers = await inquirer.prompt([
        {
          type: "password",
          name: "apiKey",
          message: `${label} 키를 입력하세요:`,
          mask: "*",
          validate: (v: string) =>
            v.trim().length > 0 || "API 키를 입력해주세요.",
        },
      ]);
      apiKey = answers.apiKey as string;
    }

    const config = loadConfig();
    config[svc] = { apiKey: apiKey!.trim() };
    saveConfig(config);
    console.log(chalk.green(`✅ ${label} 키가 저장되었습니다.`));
    console.log(chalk.dim(`   설정 파일: ${getConfigPath()}`));
  });

// ── status ─────────────────────────────────────────────────────────
program
  .command("status")
  .description("현재 로그인 상태를 확인합니다")
  .action(() => {
    const config = loadConfig();
    console.log(chalk.bold("\n📋 Pathfinder 로그인 상태\n"));

    if (config.kakao?.apiKey) {
      const k = config.kakao.apiKey;
      const masked = k.slice(0, 4) + "..." + k.slice(-4);
      console.log(chalk.green(`  ✅ 카카오: 로그인됨 (키: ${masked})`));
    } else {
      console.log(chalk.yellow("  ❌ 카카오: 미등록 → pathfinder login kakao"));
    }

    if (config.odsay?.apiKey) {
      const k = config.odsay.apiKey;
      const masked = k.slice(0, 4) + "..." + k.slice(-4);
      console.log(chalk.green(`  ✅ ODsay: 로그인됨 (키: ${masked})`));
    } else {
      console.log(chalk.yellow("  ❌ ODsay: 미등록 → pathfinder login odsay"));
    }

    console.log(chalk.dim(`\n   설정 파일: ${getConfigPath()}`));
    console.log();
  });

// ── logout ─────────────────────────────────────────────────────────
program
  .command("logout")
  .argument("[service]", "서비스 선택 (kakao, odsay 또는 생략 시 전체)")
  .description("저장된 API 키를 삭제합니다")
  .action(async (service: string | undefined) => {
    const config = loadConfig();
    if (!config.kakao && !config.odsay) {
      console.log(chalk.yellow("이미 로그아웃 상태입니다."));
      return;
    }

    if (service && service !== "kakao" && service !== "odsay") {
      console.log(chalk.red("❌ 서비스는 kakao 또는 odsay만 가능합니다."));
      process.exit(1);
    }

    const target = service
      ? service === "kakao"
        ? "카카오"
        : "ODsay"
      : "모든 서비스";

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `${target}의 API 키를 삭제하시겠습니까?`,
        default: false,
      },
    ]);

    if (confirm) {
      if (service) {
        deleteServiceConfig(service as ServiceName);
        console.log(chalk.green(`✅ ${target} API 키가 삭제되었습니다.`));
      } else {
        const fs = await import("node:fs");
        try {
          fs.unlinkSync(getConfigPath());
          console.log(chalk.green("✅ 모든 API 키가 삭제되었습니다."));
        } catch {
          console.log(chalk.red("삭제에 실패했습니다."));
        }
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
  const apiKey = getApiKey("kakao");

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
  const apiKey = getApiKey("kakao");

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
  const apiKey = getApiKey("kakao");
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

// ── transit ────────────────────────────────────────────────────────
program
  .command("transit")
  .alias("pt")
  .description("대중교통 길찾기 (출발지 → 도착지)")
  .requiredOption(
    "-o, --origin <location>",
    "출발지 (주소, 장소명, 또는 경도,위도)"
  )
  .requiredOption("-d, --dest <location>", "도착지 (주소, 장소명, 또는 경도,위도)")
  .option(
    "-m, --mode <mode>",
    "교통수단 (all|subway|bus)",
    "all"
  )
  .option(
    "--opt <opt>",
    "정렬 기준 (0=추천, 1=최소환승, 2=최소도보, 3=무환승)",
    "0"
  )
  .option("--json", "JSON 원본 출력")
  .action(async (opts) => {
    const kakaoKey = getApiKey("kakao");
    const odsayKey = getApiKey("odsay");

    console.log(chalk.dim("🔍 위치를 검색하고 있습니다...\n"));
    const origin = await resolveLocation(kakaoKey, opts.origin as string);
    const destination = await resolveLocation(kakaoKey, opts.dest as string);

    const modeMap: Record<string, number> = { all: 0, subway: 1, bus: 2 };
    const searchPathType = modeMap[opts.mode as string] ?? 0;

    const spinner = ora("대중교통 경로를 검색하고 있습니다...").start();
    try {
      const res = await searchTransitPath(odsayKey, {
        origin: { x: origin.x, y: origin.y },
        destination: { x: destination.x, y: destination.y },
        searchPathType,
        OPT: parseInt(opts.opt as string, 10),
      });
      spinner.stop();
      printTransitResponse(res, !!opts.json);
    } catch (e) {
      spinner.fail((e as Error).message);
      process.exit(1);
    }
  });

// ── Ensure login before API commands ───────────────────────────────
program.hook("preAction", (_thisCommand, actionCommand) => {
  const name = actionCommand.name();
  if (["login", "status", "logout"].includes(name)) return;

  // transit needs both kakao (geocoding) and odsay
  if (name === "transit") {
    try {
      getApiKey("kakao");
    } catch {
      console.log(
        chalk.yellow(
          "⚠️  카카오 API 키가 설정되지 않았습니다 (주소 검색에 필요). 먼저 로그인해주세요:\n"
        )
      );
      console.log(chalk.cyan("  pathfinder login kakao\n"));
      process.exit(1);
    }
    try {
      getApiKey("odsay");
    } catch {
      console.log(
        chalk.yellow(
          "⚠️  ODsay API 키가 설정되지 않았습니다. 먼저 로그인해주세요:\n"
        )
      );
      console.log(chalk.cyan("  pathfinder login odsay\n"));
      process.exit(1);
    }
    return;
  }

  // car commands need kakao
  try {
    getApiKey("kakao");
  } catch {
    console.log(
      chalk.yellow(
        "⚠️  카카오 API 키가 설정되지 않았습니다. 먼저 로그인해주세요:\n"
      )
    );
    console.log(chalk.cyan("  pathfinder login kakao\n"));
    process.exit(1);
  }
});

program.parse();
