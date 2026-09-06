#!/usr/bin/env python3

import argparse
import csv
import json
import math
import subprocess
import time
import urllib.request
from datetime import datetime
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

PROJECT = Path(__file__).resolve().parent

DEFAULT_MODELS = [
    "qwen3:8b",
    "qwen3.5:9b",
]

OLLAMA_URL = "http://localhost:11434/api/generate"

CONTEXT_LENGTH = 8192
TEMPERATURE = 0.1

# Output limits are intentionally smaller than before.
# This leaves more room for source code in the context and
# reduces unnecessary long answers during benchmarking.
DEFAULT_MAX_OUTPUT_TOKENS = 900

USE_AGENTS = True
AGENTS_FILE = "AGENTS.md"

# Conservative context estimator.
# Real tokenization depends on model/tokenizer, so we deliberately
# underestimate characters per token to leave safety margin.
CHARS_PER_TOKEN_ESTIMATE = 3.0
CONTEXT_SAFETY_TOKENS = 500
REQUEST_OVERHEAD_TOKENS = 200

# Large files are split on line boundaries.
CHUNK_OVERLAP_LINES = 20

# Benchmarking does not need to exhaustively audit every line of a
# huge file. If a file produces more chunks, sample representative
# chunks from the beginning, middle, and end.
MAX_CHUNKS_PER_FILE = 3

# Thermal control.
TARGET_GPU_TEMP_C = 70
MAX_COOLDOWN_SECONDS = 180
COOLDOWN_POLL_SECONDS = 5
FALLBACK_COOLDOWN_SECONDS = 10


# ============================================================
# TEST DEFINITIONS
# ============================================================

TESTS = [
    {
        "name": "01-stack",
        "files": [
            "package.json",
            "src/index.js",
            "src/i18n.js",
        ],
        "max_output_tokens": 500,
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
        "max_output_tokens": 900,
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
        "max_output_tokens": 900,
        "instruction": """
Проанализируй business logic.

Найди максимум 3 проблемы, которые могут привести к:

- неправильному результату;
- некорректному состоянию;
- трудно поддерживаемой логике;
- реальной ошибке выполнения.

Для каждой проблемы приведи конкретный код.

Если в предоставленном фрагменте существенных проблем нет,
прямо скажи об этом.

Не придумывай требования игры, которых нет в коде.
Учитывай, что для большого файла тебе может быть предоставлен
только один фрагмент, а не весь файл.
""",
    },

    {
        "name": "04-product-component",
        "files": [
            "src/components/Product.js",
        ],
        "max_output_tokens": 600,
        "instruction": """
Проведи review React-компонента Product.

Сначала определи, есть ли вообще доказуемые реальные проблемы.

Важно:
- Ноль найденных проблем является нормальным результатом.
- Не ищи замечания только ради заполнения списка.
- Не считай корректную условную отрисовку ошибкой.
- Не считай простые вычисления из props архитектурной проблемой.
- Не называй code cleanup runtime-багом.
- Не предлагай удалять prop без проверки его callers.
- Не предлагай рефакторинг только ради рефакторинга.

Проверь:
- props;
- состояние;
- обработчики;
- React-паттерны;
- доказуемые runtime ошибки;
- реально существенное смешивание UI и business logic.

Выдай максимум 3 реальные проблемы.

Если доказуемых существенных проблем нет, ответь:
"Существенных проблем не обнаружено."
""",
    },

    {
        "name": "05a-cross-file-ui-change",
        "files": [
            "src/components/Product.js",
            "src/logic/logic.js",
        ],
        "max_output_tokens": 500,
        "instruction": """
Нужно изменить только отображаемое в карточке товара значение
possibleIncome.

Игровая механика, фактические цены продажи и начисление монет
меняться не должны.

Определи:
1. В каком файле нужно делать изменение.
2. Какой конкретный код отвечает за отображаемое значение.
3. Нужно ли менять logic.js.

Не предлагай архитектурный рефакторинг.
Не делай выводов о непросмотренной части большого файла.
""",
    },

    {
        "name": "05b-cross-file-game-rule-change",
        "files": [
            "src/components/Product.js",
            "src/logic/logic.js",
        ],
        "max_output_tokens": 500,
        "instruction": """
Нужно изменить фактическое количество монет, которое игрок получает
за товары при завершении раунда.

Менять только отображение карточки Product недостаточно.

Определи:
1. В каком файле находится соответствующая игровая логика.
2. Какая конкретная функция или участок кода отвечает за начисление.
3. Нужно ли менять Product.js.

Используй только предоставленный код.
Не делай выводов о непросмотренной части большого файла.
""",
    },

    {
        "name": "06-page-architecture",
        "files": [
            "src/pages/PrivozPage.js",
            "src/components/App.js",
        ],
        "max_output_tokens": 900,
        "instruction": """
Проведи архитектурный review этих React-файлов.

Найди максимум 3 существенные проблемы.

Для каждой:

- укажи файл;
- приведи конкретную конструкцию;
- объясни реальный риск;
- предложи минимальное улучшение.

Не рекомендуй Context, Redux, Zustand, useMemo, useCallback,
custom hooks или разделение компонентов без конкретной
необходимости.

Если существенной проблемы нет, так и скажи.
""",
    },
]


# ============================================================
# CLI
# ============================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="Benchmark local Ollama coding models on this project."
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate files and show generated benchmark cases without calling Ollama.",
    )

    parser.add_argument(
        "--model",
        action="append",
        dest="models",
        help=(
            "Run only this model. Can be provided multiple times. "
            "Example: --model qwen3:8b"
        ),
    )

    parser.add_argument(
        "--test",
        action="append",
        dest="tests",
        help=(
            "Run only this test name. Can be provided multiple times. "
            "Example: --test 03-business-logic"
        ),
    )

    return parser.parse_args()


# ============================================================
# FILE HELPERS
# ============================================================

def read_file(relative_path):
    path = PROJECT / relative_path

    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    return path.read_text(
        encoding="utf-8",
        errors="replace",
    )


def file_block(relative_path, content, start_line=None, end_line=None):
    if start_line is None:
        label = relative_path
    else:
        label = f"{relative_path} (lines {start_line}-{end_line})"

    return f"""
===== FILE: {label} =====
{content}
===== END FILE: {label} =====
"""


def estimate_tokens_from_chars(char_count):
    return math.ceil(char_count / CHARS_PER_TOKEN_ESTIMATE)


def get_system_prompt():
    if not USE_AGENTS:
        return ""

    return read_file(AGENTS_FILE)


def get_user_char_budget(max_output_tokens):
    system_prompt = get_system_prompt()
    estimated_system_tokens = estimate_tokens_from_chars(len(system_prompt))

    available_input_tokens = (
        CONTEXT_LENGTH
        - max_output_tokens
        - CONTEXT_SAFETY_TOKENS
        - REQUEST_OVERHEAD_TOKENS
        - estimated_system_tokens
    )

    if available_input_tokens <= 500:
        raise RuntimeError(
            "AGENTS.md/system prompt leaves too little room for source code. "
            "Reduce system rules or increase context length."
        )

    return int(available_input_tokens * CHARS_PER_TOKEN_ESTIMATE)


def base_prompt_for_test(test):
    return "\n\n".join([
        """
Ты анализируешь реальный проект.

Следуй системным правилам проекта.
Используй только факты из предоставленного кода.
Не придумывай отсутствующие файлы, требования или API.
Если видишь только часть большого файла, не делай выводов
о непросмотренной части.
""".strip(),
        test["instruction"].strip(),
    ])


def build_full_prompt(test, file_contents):
    parts = [base_prompt_for_test(test)]

    for relative_path in test["files"]:
        parts.append(
            file_block(
                relative_path,
                file_contents[relative_path],
            )
        )

    return "\n\n".join(parts)


# ============================================================
# CHUNKING
# ============================================================

def split_text_by_lines(text, max_chars, overlap_lines=CHUNK_OVERLAP_LINES):
    lines = text.splitlines(keepends=True)

    if not lines:
        return [{
            "content": "",
            "start_line": 1,
            "end_line": 1,
        }]

    chunks = []
    start = 0

    while start < len(lines):
        end = start
        char_count = 0

        while end < len(lines):
            next_len = len(lines[end])

            if end > start and char_count + next_len > max_chars:
                break

            char_count += next_len
            end += 1

            # Handle a single extremely long line.
            if end == start + 1 and char_count > max_chars:
                break

        if end <= start:
            end = start + 1

        chunks.append({
            "content": "".join(lines[start:end]),
            "start_line": start + 1,
            "end_line": end,
        })

        if end >= len(lines):
            break

        next_start = max(start + 1, end - overlap_lines)

        if next_start <= start:
            next_start = start + 1

        start = next_start

    return chunks


def sample_chunks(chunks, max_chunks=MAX_CHUNKS_PER_FILE):
    if len(chunks) <= max_chunks:
        return chunks

    if max_chunks <= 1:
        return [chunks[0]]

    # Evenly sample beginning, middle, end.
    indexes = []

    for i in range(max_chunks):
        idx = round(i * (len(chunks) - 1) / (max_chunks - 1))
        indexes.append(idx)

    # Keep order and remove accidental duplicates.
    seen = set()
    sampled = []

    for idx in indexes:
        if idx not in seen:
            seen.add(idx)
            sampled.append(chunks[idx])

    return sampled


def build_cases(test):
    """
    Return one or more benchmark cases.

    Small tests become one case with all files in full.

    If the complete prompt does not fit, the largest file is chunked.
    All smaller related files stay fully included in every case.

    If even the smaller pinned files do not fit without the largest file,
    fail loudly so the test can be redesigned intentionally instead of
    silently dropping important context.
    """
    file_contents = {
        relative_path: read_file(relative_path)
        for relative_path in test["files"]
    }

    max_output_tokens = test.get(
        "max_output_tokens",
        DEFAULT_MAX_OUTPUT_TOKENS,
    )

    user_char_budget = get_user_char_budget(max_output_tokens)

    full_prompt = build_full_prompt(test, file_contents)

    if len(full_prompt) <= user_char_budget:
        return [{
            "case_name": test["name"],
            "test_name": test["name"],
            "prompt": full_prompt,
            "chunked_file": None,
            "chunk_start_line": None,
            "chunk_end_line": None,
            "max_output_tokens": max_output_tokens,
        }]

    # Pick the largest source file as the chunk target.
    largest_file = max(
        test["files"],
        key=lambda p: len(file_contents[p]),
    )

    pinned_files = [
        p for p in test["files"]
        if p != largest_file
    ]

    pinned_parts = [base_prompt_for_test(test)]

    for relative_path in pinned_files:
        pinned_parts.append(
            file_block(
                relative_path,
                file_contents[relative_path],
            )
        )

    pinned_prompt = "\n\n".join(pinned_parts)

    # Reserve room for the chunk wrapper/labels.
    wrapper_reserve = 500
    chunk_char_budget = (
        user_char_budget
        - len(pinned_prompt)
        - wrapper_reserve
    )

    if chunk_char_budget < 2000:
        raise RuntimeError(
            f"Test '{test['name']}' has too much pinned context. "
            f"Files other than '{largest_file}' already consume most of "
            f"the available context. Split this test into smaller tests."
        )

    all_chunks = split_text_by_lines(
        file_contents[largest_file],
        chunk_char_budget,
    )

    selected_chunks = sample_chunks(
        all_chunks,
        MAX_CHUNKS_PER_FILE,
    )

    cases = []

    for index, chunk in enumerate(selected_chunks, start=1):
        chunk_note = f"""
NOTE ABOUT LARGE FILE:
`{largest_file}` is too large to fit safely in one model context.
This benchmark case contains only lines
{chunk['start_line']}-{chunk['end_line']} of that file.
Do not make claims about unseen parts of the file.
""".strip()

        parts = [
            base_prompt_for_test(test),
            chunk_note,
        ]

        for relative_path in pinned_files:
            parts.append(
                file_block(
                    relative_path,
                    file_contents[relative_path],
                )
            )

        parts.append(
            file_block(
                largest_file,
                chunk["content"],
                start_line=chunk["start_line"],
                end_line=chunk["end_line"],
            )
        )

        prompt = "\n\n".join(parts)

        if len(prompt) > user_char_budget:
            raise RuntimeError(
                f"Internal chunking error for test '{test['name']}': "
                f"generated prompt is {len(prompt)} chars but budget is "
                f"{user_char_budget} chars."
            )

        case_name = (
            f"{test['name']}__part-{index:02d}-of-{len(selected_chunks):02d}"
        )

        cases.append({
            "case_name": case_name,
            "test_name": test["name"],
            "prompt": prompt,
            "chunked_file": largest_file,
            "chunk_start_line": chunk["start_line"],
            "chunk_end_line": chunk["end_line"],
            "max_output_tokens": max_output_tokens,
            "all_chunk_count": len(all_chunks),
            "sampled_chunk_count": len(selected_chunks),
        })

    return cases


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
    return run_command(["ollama", "ps"])


def get_gpu_info():
    return run_command([
        "nvidia-smi",
        "--query-gpu=name,memory.used,memory.total,temperature.gpu,power.draw",
        "--format=csv,noheader",
    ])


def get_gpu_temperature():
    output = run_command([
        "nvidia-smi",
        "--query-gpu=temperature.gpu",
        "--format=csv,noheader,nounits",
    ])

    try:
        first_line = output.splitlines()[0].strip()
        return int(first_line)
    except Exception:
        return None


def stop_model(model):
    subprocess.run(
        ["ollama", "stop", model],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def cooldown_gpu():
    temp = get_gpu_temperature()

    if temp is None:
        print(
            f"GPU temperature unavailable. "
            f"Cooling down {FALLBACK_COOLDOWN_SECONDS}s..."
        )
        time.sleep(FALLBACK_COOLDOWN_SECONDS)
        return

    if temp <= TARGET_GPU_TEMP_C:
        print(f"GPU already cool enough: {temp}°C")
        return

    print(
        f"Cooling GPU from {temp}°C "
        f"to <= {TARGET_GPU_TEMP_C}°C..."
    )

    started = time.monotonic()

    while True:
        elapsed = time.monotonic() - started

        if elapsed >= MAX_COOLDOWN_SECONDS:
            current = get_gpu_temperature()
            print(
                f"Cooldown timeout after {MAX_COOLDOWN_SECONDS}s "
                f"(GPU: {current if current is not None else '?'}°C)"
            )
            return

        time.sleep(COOLDOWN_POLL_SECONDS)

        current = get_gpu_temperature()

        if current is None:
            print("GPU temperature became unavailable.")
            return

        print(f"  GPU: {current}°C")

        if current <= TARGET_GPU_TEMP_C:
            return


# ============================================================
# OLLAMA
# ============================================================

def ns_to_seconds(value):
    if not value:
        return 0.0

    return value / 1_000_000_000


def call_ollama(model, prompt, max_output_tokens):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "keep_alive": "5m",
        "options": {
            "temperature": TEMPERATURE,
            "num_ctx": CONTEXT_LENGTH,
            "num_predict": max_output_tokens,
        },
    }

    if USE_AGENTS:
        payload["system"] = get_system_prompt()

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
# VALIDATION / SELECTION
# ============================================================

def select_tests(requested_names):
    if not requested_names:
        return TESTS

    known = {
        test["name"]: test
        for test in TESTS
    }

    missing = [
        name for name in requested_names
        if name not in known
    ]

    if missing:
        raise SystemExit(
            "Unknown test(s): "
            + ", ".join(missing)
            + "\nAvailable: "
            + ", ".join(known)
        )

    return [
        known[name]
        for name in requested_names
    ]


def validate_project(selected_tests):
    print()
    print("PROJECT VALIDATION")
    print("=" * 70)
    print(f"Project: {PROJECT}")
    print()

    required_files = set()

    if USE_AGENTS:
        required_files.add(AGENTS_FILE)

    for test in selected_tests:
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
# REPORT HELPERS
# ============================================================

def safe_name(value):
    return (
        value
        .replace(":", "_")
        .replace("/", "_")
        .replace(" ", "_")
    )


def write_system_info(out_dir, models, selected_tests):
    system_info = f"""# Benchmark system information

## Project

{PROJECT}

## Models

{chr(10).join(models)}

## Tests

{chr(10).join(test["name"] for test in selected_tests)}

## Benchmark configuration

- Context length: {CONTEXT_LENGTH}
- Default max output: {DEFAULT_MAX_OUTPUT_TOKENS}
- Temperature: {TEMPERATURE}
- Use AGENTS.md: {USE_AGENTS}
- Token estimate: {CHARS_PER_TOKEN_ESTIMATE} chars/token
- Context safety reserve: {CONTEXT_SAFETY_TOKENS} tokens
- Chunk overlap: {CHUNK_OVERLAP_LINES} lines
- Max sampled chunks per large file: {MAX_CHUNKS_PER_FILE}
- Target GPU cooldown temperature: {TARGET_GPU_TEMP_C}°C

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

    path = out_dir / "system-info.md"
    path.write_text(
        system_info,
        encoding="utf-8",
    )

    return path


# ============================================================
# MAIN
# ============================================================

def main():
    args = parse_args()

    models = args.models or DEFAULT_MODELS
    selected_tests = select_tests(args.tests)

    validate_project(selected_tests)

    all_cases = []

    print("BENCHMARK CASE PLAN")
    print("=" * 70)

    for test in selected_tests:
        cases = build_cases(test)
        all_cases.extend(cases)

        print()
        print(f"{test['name']}: {len(cases)} case(s)")

        for case in cases:
            estimated_user_tokens = estimate_tokens_from_chars(
                len(case["prompt"])
            )

            chunk_desc = ""

            if case["chunked_file"]:
                chunk_desc = (
                    f" | chunk {case['chunked_file']} "
                    f"lines {case['chunk_start_line']}-"
                    f"{case['chunk_end_line']}"
                )

            print(
                f"  - {case['case_name']}: "
                f"{len(case['prompt']):,} chars "
                f"(~{estimated_user_tokens:,} user tokens)"
                f"{chunk_desc}"
            )

    print()
    print(
        f"Total benchmark cases: {len(all_cases)} "
        f"x {len(models)} model(s) = "
        f"{len(all_cases) * len(models)} model runs"
    )

    if args.dry_run:
        print()
        print("DRY RUN: Ollama was not called.")
        return

    timestamp = datetime.now().strftime(
        "%Y-%m-%d_%H-%M-%S"
    )

    out_dir = (
        PROJECT /
        ".ai-benchmark" /
        timestamp
    )

    out_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Save exact prompts.
    for case in all_cases:
        prompt_file = (
            out_dir /
            f"PROMPT__{safe_name(case['case_name'])}.txt"
        )

        prompt_file.write_text(
            case["prompt"],
            encoding="utf-8",
        )

    summary = []

    print()
    print(f"Results: {out_dir}")

    for case_index, case in enumerate(all_cases):
        print()
        print("#" * 70)
        print(f"CASE: {case['case_name']}")
        print(f"TEST: {case['test_name']}")
        print("#" * 70)
        print(
            f"Prompt size: "
            f"{len(case['prompt']):,} characters"
        )

        # Alternate order between cases to reduce thermal/order bias.
        if case_index % 2 == 0:
            model_order = models
        else:
            model_order = list(reversed(models))

        for model in model_order:
            print()
            print("=" * 70)
            print(f"MODEL: {model}")
            print("=" * 70)

            safe_model = safe_name(model)
            safe_case = safe_name(case["case_name"])

            try:
                print("Running...")

                result, wall_time = call_ollama(
                    model,
                    case["prompt"],
                    case["max_output_tokens"],
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

                json_file = (
                    out_dir /
                    f"{safe_model}__{safe_case}.json"
                )

                json_file.write_text(
                    json.dumps(
                        result,
                        ensure_ascii=False,
                        indent=2,
                    ),
                    encoding="utf-8",
                )

                md_file = (
                    out_dir /
                    f"{safe_model}__{safe_case}.md"
                )

                chunk_info = "None"

                if case["chunked_file"]:
                    chunk_info = (
                        f"{case['chunked_file']} "
                        f"lines {case['chunk_start_line']}-"
                        f"{case['chunk_end_line']}"
                    )

                markdown_report = f"""# Model benchmark

Model: `{model}`

Test: `{case['test_name']}`

Case: `{case['case_name']}`

Chunk: `{chunk_info}`

Context: `{CONTEXT_LENGTH}`

Temperature: `{TEMPERATURE}`

Max output tokens: `{case['max_output_tokens']}`

AGENTS.md enabled: `{USE_AGENTS}`

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

                summary.append({
                    "model": model,
                    "test": case["test_name"],
                    "case": case["case_name"],
                    "chunked_file": case["chunked_file"] or "",
                    "chunk_start_line": case["chunk_start_line"] or "",
                    "chunk_end_line": case["chunk_end_line"] or "",
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
                    f"done {done_reason} | "
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
                    "test": case["test_name"],
                    "case": case["case_name"],
                    "chunked_file": case["chunked_file"] or "",
                    "chunk_start_line": case["chunk_start_line"] or "",
                    "chunk_end_line": case["chunk_end_line"] or "",
                    "done_reason": "error",
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
                cooldown_gpu()

    # --------------------------------------------------------
    # CSV SUMMARY
    # --------------------------------------------------------

    csv_file = out_dir / "summary.csv"

    fieldnames = [
        "model",
        "test",
        "case",
        "chunked_file",
        "chunk_start_line",
        "chunk_end_line",
        "done_reason",
        "wall_seconds",
        "load_seconds",
        "input_tokens",
        "input_tok_s",
        "output_tokens",
        "output_tok_s",
        "total_tokens",
        "gpu_info",
        "file",
    ]

    with csv_file.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(summary)

    # --------------------------------------------------------
    # MARKDOWN SUMMARY
    # --------------------------------------------------------

    markdown = """# Local model comparison

| Model | Test | Case | Done | Wall | Input | Output | Output tok/s |
|---|---|---|---|---:|---:|---:|---:|
"""

    for row in summary:
        markdown += (
            f"| {row['model']} "
            f"| {row['test']} "
            f"| {row['case']} "
            f"| {row['done_reason']} "
            f"| {row['wall_seconds']} "
            f"| {row['input_tokens']} "
            f"| {row['output_tokens']} "
            f"| {row['output_tok_s']} |\n"
        )

    summary_md = out_dir / "summary.md"

    summary_md.write_text(
        markdown,
        encoding="utf-8",
    )

    system_info_file = write_system_info(
        out_dir,
        models,
        selected_tests,
    )

    print()
    print("=" * 70)
    print("DONE")
    print("=" * 70)

    print()
    print("Results:")
    print(out_dir)

    print()
    print("Summary:")
    print(summary_md)

    print()
    print("CSV:")
    print(csv_file)

    print()
    print("System info:")
    print(system_info_file)


if __name__ == "__main__":
    main()