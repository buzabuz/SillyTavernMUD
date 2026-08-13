#!/bin/bash

set -Eeuo pipefail
IFS=$'\n\t'
umask 077

LABEL='tech.qdrant.server'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SCRIPT_PATH="${SCRIPT_DIR}/${BASH_SOURCE[0]##*/}"
EXPECTED_USER='bytedance'
EXPECTED_HOME='/Users/bytedance'
PROJECT_ROOT='/Users/bytedance/sillytavern/SillyTavern'
QDRANT_DIR="${PROJECT_ROOT}/docker/qdrant/1.19.0"
QDRANT_BINARY="${QDRANT_DIR}/qdrant"
SOURCE_PLIST='/Users/bytedance/sillytavern/SillyTavern/docker/qdrant/tech.qdrant.server.plist'
LAUNCH_AGENTS_DIR='/Users/bytedance/Library/LaunchAgents'
INSTALLED_PLIST='/Users/bytedance/Library/LaunchAgents/tech.qdrant.server.plist'
USER_ID="$(id -u)"
DOMAIN_TARGET="gui/${USER_ID}"
SERVICE_TARGET="${DOMAIN_TARGET}/${LABEL}"
QDRANT_URL='http://127.0.0.1:6333'
HTTP_PORT='6333'
GRPC_PORT='6334'
STORAGE_PATH="${PROJECT_ROOT}/docker/data/qdrant/storage"
SNAPSHOTS_PATH="${PROJECT_ROOT}/docker/data/qdrant/snapshots"
LOGS_PATH="${PROJECT_ROOT}/docker/data/qdrant/logs"
COLLECTION='hogwarts_knowledge_Hogwarts_World_Director_-_2026-08-02_22h16m07s339ms_g16b00e5647de42'
EXPECTED_COUNT='101'

readonly LABEL SCRIPT_DIR SCRIPT_PATH EXPECTED_USER EXPECTED_HOME
readonly PROJECT_ROOT QDRANT_DIR QDRANT_BINARY
readonly SOURCE_PLIST LAUNCH_AGENTS_DIR INSTALLED_PLIST USER_ID
readonly DOMAIN_TARGET SERVICE_TARGET QDRANT_URL HTTP_PORT GRPC_PORT
readonly STORAGE_PATH SNAPSHOTS_PATH LOGS_PATH COLLECTION EXPECTED_COUNT

install_temp=''
restore_on_failure=0
activation_complete=0
initial_job_pid=''
manual_pid=''
first_job_pid=''
replacement_job_pid=''

log() {
    printf '%s\n' "$*" >&2
}

die() {
    log "ERROR: $*"
    return 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        die "Required command is unavailable: $1"
}

plist_value() {
    /usr/libexec/PlistBuddy -c "Print :$2" "$1"
}

assert_plist_value() {
    local plist="$1"
    local key="$2"
    local expected="$3"
    local actual

    actual="$(plist_value "$plist" "$key")" ||
        die "Missing plist key ${key}: ${plist}"
    [[ "$actual" == "$expected" ]] ||
        die "Unexpected plist value for ${key}: ${actual}"
}

validate_plist_contract() {
    local plist="$1"

    [[ -f "$plist" && ! -L "$plist" ]] ||
        die "Plist must be a regular non-symlink file: ${plist}"
    plutil -lint "$plist" >/dev/null
    assert_plist_value "$plist" 'Label' "$LABEL"
    assert_plist_value "$plist" 'ProgramArguments:0' "$QDRANT_BINARY"
    if plist_value "$plist" 'ProgramArguments:1' >/dev/null 2>&1; then
        die "Plist must not pass unreviewed Qdrant arguments: ${plist}"
    fi
    assert_plist_value "$plist" 'WorkingDirectory' "$QDRANT_DIR"
    assert_plist_value "$plist" 'EnvironmentVariables:QDRANT__SERVICE__HOST' '127.0.0.1'
    assert_plist_value "$plist" 'EnvironmentVariables:QDRANT__SERVICE__HTTP_PORT' "$HTTP_PORT"
    assert_plist_value "$plist" 'EnvironmentVariables:QDRANT__SERVICE__GRPC_PORT' "$GRPC_PORT"
    assert_plist_value "$plist" 'EnvironmentVariables:QDRANT__STORAGE__STORAGE_PATH' "$STORAGE_PATH"
    assert_plist_value "$plist" 'EnvironmentVariables:QDRANT__STORAGE__SNAPSHOTS_PATH' "$SNAPSHOTS_PATH"
    assert_plist_value "$plist" 'StandardOutPath' "${LOGS_PATH}/qdrant.stdout.log"
    assert_plist_value "$plist" 'StandardErrorPath' "${LOGS_PATH}/qdrant.stderr.log"
    assert_plist_value "$plist" 'RunAtLoad' 'true'
    assert_plist_value "$plist" 'KeepAlive' 'true'
    assert_plist_value "$plist" 'ThrottleInterval' '5'
}

install_plist() {
    validate_plist_contract "$SOURCE_PLIST"
    [[ ! -L "$LAUNCH_AGENTS_DIR" ]] ||
        die "LaunchAgents directory must not be a symlink: ${LAUNCH_AGENTS_DIR}"
    mkdir -p "$LAUNCH_AGENTS_DIR"
    [[ -d "$LAUNCH_AGENTS_DIR" ]] ||
        die "LaunchAgents directory is unavailable: ${LAUNCH_AGENTS_DIR}"
    [[ ! -L "$INSTALLED_PLIST" ]] ||
        die "Refusing symlink plist path: ${INSTALLED_PLIST}"
    if [[ -e "$INSTALLED_PLIST" && ! -f "$INSTALLED_PLIST" ]]; then
        die "Refusing to replace non-file plist path: ${INSTALLED_PLIST}"
    fi

    install_temp="$(mktemp "${INSTALLED_PLIST}.tmp.XXXXXX")"
    cp "$SOURCE_PLIST" "$install_temp"
    chmod 0644 "$install_temp"
    plutil -lint "$install_temp" >/dev/null
    validate_plist_contract "$install_temp"
    mv -f "$install_temp" "$INSTALLED_PLIST"
    install_temp=''
    chmod 0644 "$INSTALLED_PLIST"
    validate_plist_contract "$INSTALLED_PLIST"
    [[ "$(stat -f '%Lp' "$INSTALLED_PLIST")" == '644' ]] ||
        die "Installed plist mode is not 0644: ${INSTALLED_PLIST}"
}

launchctl_job_value() {
    local description="$1"
    local key="$2"

    printf '%s\n' "$description" |
        awk -v key="$key" \
            '$1 == key && $2 == "=" { print $3; found = 1; exit }
             END { if (!found) exit 1 }'
}

get_job_pid() {
    local description
    local pid

    description="$(launchctl print "$SERVICE_TARGET" 2>/dev/null)" ||
        return 1
    pid="$(launchctl_job_value "$description" 'pid')" ||
        return 1
    [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 1 ]] ||
        return 1
    printf '%s\n' "$pid"
}

pids_on_port() {
    local port="$1"

    lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

qdrant_listener_pids() {
    {
        pids_on_port "$HTTP_PORT"
        pids_on_port "$GRPC_PORT"
    } | awk '/^[0-9]+$/ { print }' | sort -n -u
}

pid_executable_matches() {
    local pid="$1"
    local executable

    executable="$(lsof -a -p "$pid" -d txt -Fn 2>/dev/null |
        sed -n 's/^n//p' |
        awk 'NR == 1 { print; exit }')" ||
        return 1
    [[ "$executable" == "$QDRANT_BINARY" ]]
}

pid_working_directory() {
    local pid="$1"

    lsof -a -p "$pid" -d cwd -Fn 2>/dev/null |
        sed -n 's/^n//p' |
        awk 'NR == 1 { print; exit }'
}

assert_repo_qdrant_pid() {
    local pid="$1"
    local command_line
    local working_directory

    [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 1 ]] ||
        die "Refusing unsafe PID: ${pid}"
    command_line="$(ps -p "$pid" -o command= 2>/dev/null |
        sed 's/^[[:space:]]*//;s/[[:space:]]*$//')" ||
        die "PID exited before command verification: ${pid}"
    if [[ "$command_line" == "$QDRANT_BINARY" ]] ||
        [[ "$command_line" == "$QDRANT_BINARY --disable-telemetry" ]]; then
        :
    elif [[ "$command_line" == './qdrant' ]] ||
        [[ "$command_line" == './qdrant --disable-telemetry' ]]; then
        working_directory="$(pid_working_directory "$pid")" ||
            die "Cannot verify working directory for PID ${pid}"
        [[ "$working_directory" == "$QDRANT_DIR" ]] ||
            die "Refusing PID ${pid} from ${working_directory}"
    else
        die "Refusing PID ${pid}; command is not exactly this repository's Qdrant: ${command_line}"
    fi
    pid_executable_matches "$pid" ||
        die "Refusing PID ${pid}; executable does not match ${QDRANT_BINARY}"
}

assert_loaded_job_contract() {
    local description="$1"
    local path
    local program
    local pid

    path="$(launchctl_job_value "$description" 'path')" ||
        die "Loaded ${LABEL} job does not report its plist path"
    program="$(launchctl_job_value "$description" 'program')" ||
        die "Loaded ${LABEL} job does not report its program"
    [[ "$path" == "$INSTALLED_PLIST" ]] ||
        die "Refusing loaded ${LABEL} job from unexpected path: ${path}"
    [[ "$program" == "$QDRANT_BINARY" ]] ||
        die "Refusing loaded ${LABEL} job with unexpected program: ${program}"

    pid="$(launchctl_job_value "$description" 'pid' 2>/dev/null || true)"
    if [[ -n "$pid" ]]; then
        assert_repo_qdrant_pid "$pid"
    fi
}

wait_for_pid_exit() {
    local pid="$1"
    local timeout_seconds="${2:-30}"
    local deadline=$((SECONDS + timeout_seconds))

    while ((SECONDS < deadline)); do
        if ! kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        if ! pid_executable_matches "$pid"; then
            return 0
        fi
        sleep 1
    done
    die "Timed out waiting for verified Qdrant PID ${pid} to exit"
}

terminate_repo_qdrant() {
    local pid="$1"

    assert_repo_qdrant_pid "$pid"
    log "Sending TERM to verified repository Qdrant PID ${pid}."
    kill -TERM "$pid"
    wait_for_pid_exit "$pid" 30
}

bootout_old_label() {
    local description
    local output
    local pid

    if ! description="$(launchctl print "$SERVICE_TARGET" 2>&1)"; then
        case "$description" in
        *'Could not find service'* | *'No such process'* | *'service not found'*)
            log "No existing ${LABEL} job was loaded."
            return 0
            ;;
        *)
            die "Cannot inspect ${SERVICE_TARGET}: ${description}"
            ;;
        esac
    fi

    assert_loaded_job_contract "$description"
    pid="$(launchctl_job_value "$description" 'pid' 2>/dev/null || true)"
    log "Booting out verified ${SERVICE_TARGET}."
    output="$(launchctl bootout "$SERVICE_TARGET" 2>&1)" ||
        die "launchctl bootout failed for ${SERVICE_TARGET}: ${output}"
    if [[ -n "$pid" ]]; then
        wait_for_pid_exit "$pid" 30
    fi
}

bootout_label_best_effort() {
    local description
    local output
    local pid

    if ! description="$(launchctl print "$SERVICE_TARGET" 2>&1)"; then
        case "$description" in
        *'Could not find service'* | *'No such process'* | *'service not found'*)
            return 0
            ;;
        *)
            log "Recovery cannot inspect ${SERVICE_TARGET}: ${description}"
            return 1
            ;;
        esac
    fi

    if ! assert_loaded_job_contract "$description"; then
        log "Recovery refused to boot out unverified ${SERVICE_TARGET}."
        return 1
    fi
    pid="$(launchctl_job_value "$description" 'pid' 2>/dev/null || true)"
    if ! output="$(launchctl bootout "$SERVICE_TARGET" 2>&1)"; then
        log "Recovery bootout failed for ${SERVICE_TARGET}: ${output}"
        return 1
    fi
    if [[ -n "$pid" ]] && ! wait_for_pid_exit "$pid" 30; then
        log "Recovery timed out waiting for ${pid} after bootout."
        return 1
    fi
}

wait_for_health() {
    local timeout_seconds="${1:-45}"
    local deadline=$((SECONDS + timeout_seconds))
    local response

    while ((SECONDS < deadline)); do
        if response="$(curl --fail --silent --show-error --max-time 2 \
            "${QDRANT_URL}/healthz" 2>/dev/null)" &&
            [[ "$response" == 'healthz check passed' ]]; then
            return 0
        fi
        sleep 1
    done
    die "Qdrant health did not recover within ${timeout_seconds}s"
}

wait_for_healthy_job_pid() {
    local previous_pid="${1:-}"
    local timeout_seconds="${2:-60}"
    local deadline=$((SECONDS + timeout_seconds))
    local pid
    local response

    while ((SECONDS < deadline)); do
        pid="$(get_job_pid || true)"
        if [[ -n "$pid" && "$pid" != "$previous_pid" ]] &&
            response="$(curl --fail --silent --show-error --max-time 2 \
                "${QDRANT_URL}/healthz" 2>/dev/null)" &&
            [[ "$response" == 'healthz check passed' ]]; then
            assert_repo_qdrant_pid "$pid"
            printf '%s\n' "$pid"
            return 0
        fi
        sleep 1
    done
    die "LaunchAgent did not produce a healthy replacement PID"
}

verify_loopback_listener() {
    local pid="$1"
    local port="$2"
    local listener_pids
    local endpoints

    listener_pids="$(pids_on_port "$port" | sort -n -u)"
    [[ "$listener_pids" == "$pid" ]] ||
        die "TCP ${port} is not exclusively owned by Qdrant PID ${pid}: ${listener_pids:-none}"
    endpoints="$(lsof -nP -a -p "$pid" -iTCP:"$port" \
        -sTCP:LISTEN -Fn 2>/dev/null | sed -n 's/^n//p')"
    [[ "$endpoints" == "127.0.0.1:${port}" ]] ||
        die "TCP ${port} is not loopback-only: ${endpoints:-none}"
}

verify_loopback_listeners() {
    local pid="$1"

    verify_loopback_listener "$pid" "$HTTP_PORT"
    verify_loopback_listener "$pid" "$GRPC_PORT"
}

parse_exact_count() {
    node -e '
        let input = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", chunk => {
            input += chunk;
        });
        process.stdin.on("end", () => {
            const body = JSON.parse(input);
            const count = body?.result?.count;
            if (!Number.isSafeInteger(count)) {
                process.exit(2);
            }
            process.stdout.write(String(count));
        });
    '
}

verify_exact_count() {
    local response
    local count

    response="$(curl --fail --silent --show-error --max-time 5 \
        -X POST \
        "${QDRANT_URL}/collections/${COLLECTION}/points/count" \
        -H 'Content-Type: application/json' \
        --data '{"exact":true}')"
    count="$(printf '%s' "$response" | parse_exact_count)" ||
        die "Qdrant exact count response was invalid"
    [[ "$count" == "$EXPECTED_COUNT" ]] ||
        die "Qdrant exact count is ${count}, expected ${EXPECTED_COUNT}"
}

restore_manual_qdrant() {
    local listener_pids
    local restored_pid

    bootout_label_best_effort ||
        return 1
    listener_pids="$(qdrant_listener_pids)"
    if [[ -n "$listener_pids" ]]; then
        [[ "$listener_pids" =~ ^[0-9]+$ ]] ||
            die "Manual recovery found ambiguous listener PIDs: ${listener_pids}"
        assert_repo_qdrant_pid "$listener_pids"
        verify_loopback_listeners "$listener_pids"
        verify_exact_count
        log "Verified repository Qdrant PID ${listener_pids} remains healthy."
        return 0
    fi

    log 'Attempting to restore Qdrant as a manual background process.'
    restored_pid="$(
        cd "$QDRANT_DIR"
        nohup env \
            QDRANT__SERVICE__HOST=127.0.0.1 \
            QDRANT__SERVICE__HTTP_PORT="$HTTP_PORT" \
            QDRANT__SERVICE__GRPC_PORT="$GRPC_PORT" \
            QDRANT__STORAGE__STORAGE_PATH="$STORAGE_PATH" \
            QDRANT__STORAGE__SNAPSHOTS_PATH="$SNAPSHOTS_PATH" \
            "$QDRANT_BINARY" \
            </dev/null >/dev/null 2>&1 &
        printf '%s\n' "$!"
    )"
    [[ "$restored_pid" =~ ^[0-9]+$ && "$restored_pid" -gt 1 ]] ||
        die "Manual Qdrant recovery returned an unsafe PID: ${restored_pid}"
    wait_for_health 30
    assert_repo_qdrant_pid "$restored_pid"
    verify_loopback_listeners "$restored_pid"
    verify_exact_count
    log "Manual Qdrant restored as PID ${restored_pid}."
}

cleanup() {
    local status=$?

    trap - EXIT
    set +e
    if [[ -n "$install_temp" ]]; then
        rm -f -- "$install_temp"
    fi
    if [[ "$status" -ne 0 && "$restore_on_failure" -eq 1 &&
        "$activation_complete" -eq 0 ]]; then
        if ! (
            set -Eeuo pipefail
            restore_manual_qdrant
        ); then
            log 'Manual Qdrant recovery did not complete; inspect the repository Qdrant logs.'
        fi
    fi
    exit "$status"
}

trap cleanup EXIT

main() {
    local initial_job_pid
    local initial_listener_pids
    local remaining_pids
    local pid_count

    [[ "$#" -eq 0 ]] ||
        die 'This activation script accepts no arguments.'
    [[ "$(uname -s)" == 'Darwin' ]] ||
        die 'This activation script only supports macOS.'
    for command_name in \
        awk chmod cp curl env id launchctl lsof mkdir mktemp mv node \
        nohup plutil ps rm sed sleep sort stat uname; do
        require_command "$command_name"
    done
    [[ "$(id -un)" == "$EXPECTED_USER" && "$USER_ID" -ne 0 ]] ||
        die "This script must run as the ${EXPECTED_USER} desktop user."
    [[ "${HOME:-}" == "$EXPECTED_HOME" ]] ||
        die "HOME must be the fixed desktop-user path: ${EXPECTED_HOME}"
    [[ "$SCRIPT_PATH" == "${PROJECT_ROOT}/scripts/${BASH_SOURCE[0]##*/}" &&
        -f "$SCRIPT_PATH" && ! -L "$SCRIPT_PATH" ]] ||
        die "Activation script must run from its fixed repository path: ${SCRIPT_PATH}"
    [[ -x '/usr/libexec/PlistBuddy' ]] ||
        die 'Required command is unavailable: /usr/libexec/PlistBuddy'
    [[ -x "$QDRANT_BINARY" && -f "$QDRANT_BINARY" && ! -L "$QDRANT_BINARY" ]] ||
        die "Qdrant binary is not an executable regular file: ${QDRANT_BINARY}"
    [[ -d "$STORAGE_PATH" && -d "$SNAPSHOTS_PATH" && -d "$LOGS_PATH" ]] ||
        die 'Qdrant storage, snapshots, and logs directories must already exist.'

    log 'Preflight accepted fixed user, repository, binary, label, and plist paths.'
    install_plist
    log "Installed and validated ${INSTALLED_PLIST} at mode 0644."

    initial_job_pid="$(get_job_pid || true)"
    initial_listener_pids="$(qdrant_listener_pids)"
    restore_on_failure=1

    bootout_old_label
    remaining_pids="$(qdrant_listener_pids)"
    if [[ -n "$remaining_pids" ]]; then
        pid_count="$(printf '%s\n' "$remaining_pids" | awk 'NF { count += 1 } END { print count + 0 }')"
        [[ "$pid_count" -eq 1 ]] ||
            die "Refusing to stop multiple listener PIDs: ${remaining_pids}"
        manual_pid="$remaining_pids"
        terminate_repo_qdrant "$manual_pid"
    fi

    log "Bootstrapping ${LABEL} in ${DOMAIN_TARGET}."
    launchctl bootstrap "$DOMAIN_TARGET" "$INSTALLED_PLIST"
    first_job_pid="$(wait_for_healthy_job_pid '' 60)"
    log "LaunchAgent Qdrant is healthy as PID ${first_job_pid}."
    verify_loopback_listeners "$first_job_pid"
    verify_exact_count
    log "Verified loopback listeners and exact point count ${EXPECTED_COUNT}."

    terminate_repo_qdrant "$first_job_pid"
    replacement_job_pid="$(wait_for_healthy_job_pid "$first_job_pid" 60)"
    log "KeepAlive replaced PID ${first_job_pid} with ${replacement_job_pid}."
    verify_loopback_listeners "$replacement_job_pid"
    verify_exact_count

    activation_complete=1
    restore_on_failure=0
    printf '%s\n' \
        'Task 22.2 LaunchAgent activation accepted.' \
        "label=${LABEL}" \
        "service_target=${SERVICE_TARGET}" \
        "installed_plist=${INSTALLED_PLIST}" \
        "previous_job_pid=${initial_job_pid:-none}" \
        "manual_pid_stopped=${manual_pid:-none}" \
        "initial_job_pid=${first_job_pid}" \
        "keepalive_job_pid=${replacement_job_pid}" \
        "listeners=127.0.0.1:${HTTP_PORT},127.0.0.1:${GRPC_PORT}" \
        "collection=${COLLECTION}" \
        "exact_count=${EXPECTED_COUNT}"
}

main "$@"
