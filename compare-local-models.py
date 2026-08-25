#!/usr/bin/env python3

import csv
import json
import subprocess
import time
import urllib.request
from datetime import datetime
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

PROJECT = Path(__file__).resolve().parent

MODELS = [
    "qwen3:8b",
    "qwen3.5:9b",
]

OLLAMA_URL = "http://localhost:11434/api/generate"

OPTIONS = {
    "temperature": 0.1,
    "num_ctx": 8192,
    "num_predict": 1600,
}

COOLDOWN_SECONDS = 30

USE_AGENTS = True
AGENTS_FILE = "AGENTS.md"

timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
OUT_DIR = PROJECT / ".ai-benchmark" / timestamp
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# FILE HELPERS
# ============================================================



TESTS = [
    {
        "name": "01-stack",
        "files": [
            "package.json",
            "src/index.js",
            "src/i18n.js",
        ],
        "instruction": """
Определи стек этого React-проекта.

Ответь кратко:

1. Версия React.
2. Используемый router.
3. Есть ли отдельная state-management библиотека.
4. Как реализована локализация.
5. Основные библиотеки проекта.

Для каждого существенного вывода укажи файл-источник.

Не придумывай технологии, которых нет в предоставленных файлах.
""",
    },

    {
        "name": "02-component-review",
        "files": [
            "src/components/App.js",
        ],
        "instruction": """
Проведи code review React-компонента.

Найди максимум 3 реальные проблемы.

Для каждой:

- приведи существующий фрагмент кода;
- объясни конкретный риск;
- предложи минимальное исправление.

Если реальных проблем меньше трех, выдай меньше трех.

Не придумывай API-контракты, требования или уязвимости.
Не называй stylistic preference ошибкой.
""",
    },

    {
        "name": "03-business-logic",
        "files": [
            "src/logic/logic.js",
        ],
        "instruction": """
Проанализируй business logic.

Найди максимум 3 проблемы, которые могут привести к:

- неправильному результату;
- некорректному состоянию;
- трудно поддерживаемой логике;
- реальной ошибке выполнения.

Для каждой проблемы приведи конкретный код.

Если код корректен, прямо скажи, что существенных проблем не найдено.

Не придумывай требования игры, которых нет в коде.
""",
    },

    {
        "name": "04-product-component",
        "files": [
            "src/components/Product.js",
        ],
        "instruction": """
Проведи review React-компонента Product.

Проверь:

- корректность props;
- работу с состоянием;
- обработчики событий;
- React-паттерны;
- потенциальные runtime ошибки;
- смешивание UI и business logic.

Выдай максимум 3 реальные проблемы.

Не предлагай рефакторинг только ради рефакторинга.
""",
    },

    {
        "name": "05-cross-file-product-logic",
        "files": [
            "src/components/Product.js",
            "src/logic/logic.js",
        ],
        "instruction": """
Проанализируй взаимодействие React-компонента и business logic.

Определи:

1. Где находится UI-логика.
2. Где находится business logic.
3. Есть ли дублирование или неправильное размещение логики.
4. Есть ли реальные проблемы во взаимодействии файлов.

Если нужно изменить поведение товара, укажи, в каком из этих файлов
логичнее делать изменение и почему.

Не переноси логику между файлами без конкретной причины.
""",
    },

    {
        "name": "06-page-architecture",
        "files": [
            "src/pages/PrivozPage.js",
            "src/components/App.js",
        ],
        "instruction": """
Проведи архитектурный review этих React-файлов.

Найди максимум 3 существенные проблемы.

Для каждой:

- укажи файл;
- приведи конкретную конструкцию;
- объясни реальный риск;
- предложи минимальное улучшение.

Не рекомендуй Context, Redux, Zustand, useMemo, useCallback,
custom hooks или разделение компонентов без конкретной необходимости.

Если существенной проблемы нет, так и скажи.
""",
    },
]


def read_file(relative_path):
    path = PROJECT / relative_path

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    return path.read_text(
        encoding="utf-8",
        errors="replace",
    )


def file_block(relative_path):
    content = read_file(relative_path)

    return f"""
===== FILE: {relative_path} =====
{content}
===== END FILE: {relative_path} =====
"""

def build_prompt(test):
    parts = [
        """
Ты анализируешь реальный проект.

Следуй системным правилам проекта.
Используй только факты из предоставленного кода.
Не придумывай отсутствующие файлы, требования или API.
""",
        test["instruction"].strip(),
    ]

    for relative_path in test["files"]:
        parts.append(file_block(relative_path))

    return "\n\n".join(parts)





# ============================================================
# SYSTEM INFORMATION
# ============================================================

def run_command(command):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
        )

        output = result.stdout.strip()

        if result.stderr.strip():
            if output:
                output += "\n"

            output += "STDERR:\n" + result.stderr.strip()

        return output

    except Exception as e:
        return f"ERROR: {e}"


def get_ollama_ps():
    return run_command(
        ["ollama", "ps"]
    )


def get_gpu_info():
    return run_command([
        "nvidia-smi",
        "--query-gpu=name,memory.used,memory.total,temperature.gpu,power.draw",
        "--format=csv,noheader",
    ])


def stop_model(model):
    subprocess.run(
        ["ollama", "stop", model],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


# ============================================================
# OLLAMA HELPERS
# ============================================================

def ns_to_seconds(value):
    if not value:
        return 0.0

    return value / 1_000_000_000


def call_ollama(model, prompt):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "keep_alive": "5m",
        "options": OPTIONS,
    }

    if USE_AGENTS:
        payload["system"] = read_file(AGENTS_FILE)

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    started = time.perf_counter()

    with urllib.request.urlopen(
        request,
        timeout=1800,
    ) as response:
        result = json.loads(
            response.read().decode("utf-8")
        )

    wall_time = time.perf_counter() - started

    return result, wall_time


# ============================================================
# VALIDATE PROJECT
# ============================================================

print()
print("PROJECT VALIDATION")
print("=" * 70)
print(f"Project: {PROJECT}")
print()

required_files = {AGENTS_FILE}

for test in TESTS:
    required_files.update(test["files"])


for relative_path in sorted(required_files):
    path = PROJECT / relative_path

    if not path.is_file():
        raise SystemExit(
            "ERROR: required file does not exist:\n"
            f"{path}"
        )

    print(
        f"FOUND  {relative_path:<40} "
        f"{path.stat().st_size:>10,} bytes"
    )

print()


# ============================================================
# SAVE PROMPTS
# ============================================================

for test in TESTS:
    prompt = build_prompt(test)

    prompt_file = (
        OUT_DIR /
        f"PROMPT__{test['name']}.txt"
    )

    prompt_file.write_text(
        prompt,
        encoding="utf-8",
    )


# ============================================================
# RUN BENCHMARK
# ============================================================

summary = []

print(f"Results: {OUT_DIR}")
print()

for test_index, test in enumerate(TESTS):

    prompt = build_prompt(test)

    # Alternate order to reduce thermal bias.
    #
    # Test 1:
    #   Qwen3 -> Qwen3.5
    #
    # Test 2:
    #   Qwen3.5 -> Qwen3
    #
    # Test 3:
    #   Qwen3 -> Qwen3.5

    if test_index % 2 == 0:
        model_order = MODELS
    else:
        model_order = list(reversed(MODELS))

    print()
    print("#" * 70)
    print(f"TEST: {test['name']}")
    print("#" * 70)

    print(
        "Prompt size: "
        f"{len(prompt):,} characters"
    )

    for model in model_order:
        print()
        print("=" * 70)
        print(f"MODEL: {model}")
        print("=" * 70)

        safe_model = (
            model
            .replace(":", "_")
            .replace("/", "_")
        )

        try:
            print("Running...")

            result, wall_time = call_ollama(
                model,
                prompt,
            )

            answer = result.get(
                "response",
                "",
            )

            done_reason = result.get(
              "done_reason",
              "",
        
        )

            prompt_tokens = result.get(
                "prompt_eval_count",
                0,
            )

            output_tokens = result.get(
                "eval_count",
                0,
            )

            prompt_duration = ns_to_seconds(
                result.get(
                    "prompt_eval_duration",
                    0,
                )
            )

            eval_duration = ns_to_seconds(
                result.get(
                    "eval_duration",
                    0,
                )
            )

            load_duration = ns_to_seconds(
                result.get(
                    "load_duration",
                    0,
                )
            )

            total_duration = ns_to_seconds(
                result.get(
                    "total_duration",
                    0,
                )
            )

            prompt_tok_s = (
                prompt_tokens / prompt_duration
                if prompt_duration > 0
                else 0
            )

            output_tok_s = (
                output_tokens / eval_duration
                if eval_duration > 0
                else 0
            )

            ollama_ps = get_ollama_ps()
            gpu_info = get_gpu_info()

            # ------------------------------------------------
            # SAVE RAW OLLAMA JSON
            # ------------------------------------------------

            json_file = (
                OUT_DIR /
                f"{safe_model}__{test['name']}.json"
            )

            json_file.write_text(
                json.dumps(
                    result,
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

            # ------------------------------------------------
            # SAVE HUMAN-READABLE MARKDOWN REPORT
            # ------------------------------------------------

            md_file = (
                OUT_DIR /
                f"{safe_model}__{test['name']}.md"
            )

            markdown_report = f"""# Model benchmark

Model: `{model}`

Test: `{test['name']}`

Context: `{OPTIONS['num_ctx']}`

Temperature: `{OPTIONS['temperature']}`

Max output tokens: `{OPTIONS['num_predict']}`

## Performance

Wall time: `{wall_time:.2f} sec`

Ollama total duration: `{total_duration:.2f} sec`

Model load duration: `{load_duration:.2f} sec`

Input tokens: `{prompt_tokens}`

Input processing speed: `{prompt_tok_s:.2f} tokens/sec`

Output tokens: `{output_tokens}`

Done reason: `{done_reason}`

Generation speed: `{output_tok_s:.2f} tokens/sec`

## Ollama PS

```text
{ollama_ps}
```

## GPU snapshot

```text
{gpu_info}
```

## Response

{answer}
"""

            md_file.write_text(
                markdown_report,
                encoding="utf-8",
            )

            # ------------------------------------------------
            # SUMMARY DATA
            # ------------------------------------------------

            summary.append({
                "model": model,
                "test": test["name"],
                "done_reason": done_reason,
                "wall_seconds": round(
                    wall_time,
                    2,
                ),
                "load_seconds": round(
                    load_duration,
                    2,
                ),
                "input_tokens": prompt_tokens,
                "input_tok_s": round(
                    prompt_tok_s,
                    2,
                ),
                "output_tokens": output_tokens,
                "output_tok_s": round(
                    output_tok_s,
                    2,
                ),
                "total_tokens": (
                    prompt_tokens +
                    output_tokens
                ),
                "gpu_info": gpu_info,
                "file": md_file.name,
            })

            print(
                f"✓ wall {wall_time:.1f}s | "
                f"input {prompt_tokens} | "
                f"output {output_tokens} | "
                f"gen {output_tok_s:.1f} tok/s"
            )

            print()
            print("Ollama:")
            print(ollama_ps)

            print()
            print("GPU:")
            print(gpu_info)

        except Exception as e:
            print(f"ERROR: {e}")

            summary.append({
                "model": model,
                "test": test["name"],
                "wall_seconds": "",
                "load_seconds": "",
                "input_tokens": "",
                "input_tok_s": "",
                "output_tokens": "",
                "output_tok_s": "",
                "total_tokens": "",
                "gpu_info": "",
                "file": "",
            })

        finally:
            stop_model(model)

            print(
                "\nCooling down "
                f"{COOLDOWN_SECONDS}s..."
            )

            time.sleep(
                COOLDOWN_SECONDS
            )


# ============================================================
# CSV SUMMARY
# ============================================================

csv_file = (
    OUT_DIR /
    "summary.csv"
)

with csv_file.open(
    "w",
    newline="",
    encoding="utf-8",
) as f:

    fieldnames = [
        "model",
        "test",
        "wall_seconds",
        "load_seconds",
        "input_tokens",
        "input_tok_s",
        "output_tokens",
        "output_tok_s",
        "total_tokens",
        "gpu_info",
        "file",
        "done_reason",
    ]

    writer = csv.DictWriter(
        f,
        fieldnames=fieldnames,
    )

    writer.writeheader()
    writer.writerows(summary)


# ============================================================
# MARKDOWN SUMMARY
# ============================================================

markdown = """# Local model comparison

| Model | Test | Wall | Input | Output | Input tok/s | Output tok/s |
|---|---|---:|---:|---:|---:|---:|
"""

for row in summary:
    markdown += (
        f"| {row['model']} "
        f"| {row['test']} "
        f"| {row['wall_seconds']} "
        f"| {row['input_tokens']} "
        f"| {row['output_tokens']} "
        f"| {row['input_tok_s']} "
        f"| {row['output_tok_s']} |\n"
    )

summary_md = (
    OUT_DIR /
    "summary.md"
)

summary_md.write_text(
    markdown,
    encoding="utf-8",
)


# ============================================================
# SYSTEM SNAPSHOT
# ============================================================

system_info = f"""# Benchmark system information

## Project

{PROJECT}

## Models

{chr(10).join(MODELS)}

## Ollama list

```text
{run_command(["ollama", "list"])}
```

## NVIDIA

```text
{get_gpu_info()}
```

## Memory

```text
{run_command(["free", "-h"])}
```
"""

system_info_file = (
    OUT_DIR /
    "system-info.md"
)

system_info_file.write_text(
    system_info,
    encoding="utf-8",
)


# ============================================================
# DONE
# ============================================================

print()
print("=" * 70)
print("DONE")
print("=" * 70)

print()
print("Results:")
print(OUT_DIR)

print()
print("Summary:")
print(summary_md)

print()
print("CSV:")
print(csv_file)

print()
print("System info:")
print(system_info_file)