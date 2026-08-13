/* eslint-disable playwright/expect-expect */

import assert from 'node:assert/strict';
import {
    spawnSync,
} from 'node:child_process';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

const QDRANT_DIR =
    '/Users/bytedance/sillytavern/SillyTavern/docker/qdrant/1.19.0';
const QDRANT_BINARY = `${QDRANT_DIR}/qdrant`;
const SCRIPT_PATH = new URL(
    '../scripts/activate-hogwarts-qdrant-launchagent.sh',
    import.meta.url,
);
const PLIST_PATH = new URL(
    '../docker/qdrant/tech.qdrant.server.plist',
    import.meta.url,
);
const README_PATH = new URL(
    '../public/scripts/extensions/hogwarts-mud/README.md',
    import.meta.url,
);

const script = await readFile(
    SCRIPT_PATH,
    'utf8',
);
const plist = await readFile(
    PLIST_PATH,
    'utf8',
);
const readme = await readFile(
    README_PATH,
    'utf8',
);

function shellFunction(name) {
    const start = script.indexOf(
        `${name}() {`,
    );
    assert.notEqual(
        start,
        -1,
        `Missing shell function: ${name}`,
    );
    const end = script.indexOf(
        '\n}\n',
        start,
    );
    assert.notEqual(
        end,
        -1,
        `Unterminated shell function: ${name}`,
    );
    return script.slice(
        start,
        end + 3,
    );
}

function runPidGuard({
    commandLine,
    workingDirectory = QDRANT_DIR,
    executable = QDRANT_BINARY,
    terminate = false,
}) {
    const program = [
        'set -Eeuo pipefail',
        'QDRANT_DIR="$1"',
        'QDRANT_BINARY="$2"',
        'TEST_COMMAND="$3"',
        'TEST_WORKING_DIRECTORY="$4"',
        'TEST_EXECUTABLE="$5"',
        shellFunction(
            'log',
        ),
        shellFunction(
            'die',
        ),
        shellFunction(
            'pid_executable_matches',
        ),
        shellFunction(
            'pid_working_directory',
        ),
        shellFunction(
            'assert_repo_qdrant_pid',
        ),
        terminate
            ? shellFunction(
                'terminate_repo_qdrant',
            )
            : '',
        'ps() { printf \'%s\\n\' "$TEST_COMMAND"; }',
        [
            'lsof() {',
            '    if [[ " $* " == *" -d cwd "* ]]; then',
            '        printf \'n%s\\n\' "$TEST_WORKING_DIRECTORY"',
            '    else',
            '        printf \'n%s\\n\' "$TEST_EXECUTABLE"',
            '    fi',
            '}',
        ].join(
            '\n',
        ),
        'kill() { printf \'kill:%s\\n\' "$*"; }',
        'wait_for_pid_exit() { printf \'wait:%s\\n\' "$1"; }',
        terminate
            ? 'terminate_repo_qdrant 4242'
            : 'assert_repo_qdrant_pid 4242',
    ].join(
        '\n',
    );

    return spawnSync(
        '/bin/bash',
        [
            '-c',
            program,
            'pid-guard',
            QDRANT_DIR,
            QDRANT_BINARY,
            commandLine,
            workingDirectory,
            executable,
        ],
        {
            encoding: 'utf8',
        },
    );
}

test('Task22.2 activation uses strict mode and the one allowed user LaunchAgent', () => {
    assert.match(
        script,
        /^#!\/bin\/bash\n\nset -Eeuo pipefail$/mu,
    );
    assert.match(
        script,
        /LABEL='tech\.qdrant\.server'/u,
    );
    assert.match(
        script,
        /^PROJECT_ROOT='\/Users\/bytedance\/sillytavern\/SillyTavern'$/mu,
    );
    assert.match(
        script,
        /^SOURCE_PLIST='\/Users\/bytedance\/sillytavern\/SillyTavern\/docker\/qdrant\/tech\.qdrant\.server\.plist'$/mu,
    );
    assert.match(
        script,
        /^INSTALLED_PLIST='\/Users\/bytedance\/Library\/LaunchAgents\/tech\.qdrant\.server\.plist'$/mu,
    );
    assert.ok(
        script.includes(
            '[[ "$SCRIPT_PATH" == "${PROJECT_ROOT}/scripts/${BASH_SOURCE[0]##*/}" &&\n' +
            '        -f "$SCRIPT_PATH" && ! -L "$SCRIPT_PATH" ]]',
        ),
    );
    assert.doesNotMatch(
        script,
        /(?:sudo|osascript|LaunchDaemons|system\/tech\.qdrant)/u,
    );
    assert.deepEqual(
        script.match(
            /^LABEL='[^']+'$/gmu,
        ),
        [
            'LABEL=\'tech.qdrant.server\'',
        ],
    );
});

test('Task22.2 installs a linted ordinary plist at mode 0644', () => {
    assert.match(
        script,
        /cp "\$SOURCE_PLIST" "\$install_temp"/u,
    );
    assert.match(
        script,
        /plutil -lint "\$install_temp"/u,
    );
    assert.match(
        script,
        /chmod 0644 "\$INSTALLED_PLIST"/u,
    );
    assert.match(
        script,
        /\[\[ -f "\$plist" && ! -L "\$plist" \]\]/u,
    );
    assert.match(
        plist,
        /<key>Label<\/key>\s*<string>tech\.qdrant\.server<\/string>/u,
    );
});

test('Task22.2 never TERM-kills a PID before repository command verification', () => {
    assert.doesNotMatch(
        script,
        /\b(?:pkill|killall)\b/u,
    );
    assert.equal(
        script.match(
            /^\s*kill -TERM "\$pid"$/gmu,
        )?.length,
        1,
    );
    const terminator = shellFunction(
        'terminate_repo_qdrant',
    );
    const verifier = terminator.indexOf(
        'assert_repo_qdrant_pid "$pid"',
    );
    const term = terminator.indexOf(
        'kill -TERM "$pid"',
    );
    assert.ok(
        verifier >= 0 && verifier < term,
    );
    const pidVerifier = shellFunction(
        'assert_repo_qdrant_pid',
    );
    assert.match(
        pidVerifier,
        /ps -p "\$pid" -o command=/u,
    );
    assert.match(
        pidVerifier,
        /\[\[ "\$command_line" == "\$QDRANT_BINARY" \]\]/u,
    );
    assert.match(
        pidVerifier,
        /\[\[ "\$command_line" == '\.\/qdrant' \]\]/u,
    );
    assert.match(
        pidVerifier,
        /\[\[ "\$working_directory" == "\$QDRANT_DIR" \]\]/u,
    );
    assert.match(
        pidVerifier,
        /pid_executable_matches "\$pid"/u,
    );
    const executableVerifier = shellFunction(
        'pid_executable_matches',
    );
    assert.match(
        executableVerifier,
        /lsof -a -p "\$pid" -d txt/u,
    );
    assert.match(
        executableVerifier,
        /\[\[ "\$executable" == "\$QDRANT_BINARY" \]\]/u,
    );
});

test('Task22.2 PID guard accepts exactly the four canonical Qdrant commands', () => {
    const commands = [
        QDRANT_BINARY,
        `${QDRANT_BINARY} --disable-telemetry`,
        './qdrant',
        './qdrant --disable-telemetry',
    ];

    for (const commandLine of commands) {
        const result = runPidGuard({
            commandLine,
        });
        assert.equal(
            result.status,
            0,
            `${commandLine}: ${result.stderr}`,
        );
    }
});

test('Task22.2 PID guard rejects extra arguments and relative binaries from another directory', () => {
    const extraArgument = runPidGuard({
        commandLine:
            './qdrant --disable-telemetry --foo',
    });
    assert.notEqual(
        extraArgument.status,
        0,
    );

    const otherDirectory = runPidGuard({
        commandLine:
            './qdrant --disable-telemetry',
        workingDirectory:
            '/tmp/another-qdrant-directory',
    });
    assert.notEqual(
        otherDirectory.status,
        0,
    );

    const otherExecutable = runPidGuard({
        commandLine: QDRANT_BINARY,
        executable:
            '/tmp/another-qdrant-directory/qdrant',
    });
    assert.notEqual(
        otherExecutable.status,
        0,
    );
});

test('Task22.2 PID termination performs all verification before TERM', () => {
    const rejected = runPidGuard({
        commandLine:
            './qdrant --disable-telemetry --foo',
        terminate: true,
    });
    assert.notEqual(
        rejected.status,
        0,
    );
    assert.doesNotMatch(
        rejected.stdout,
        /^kill:/mu,
    );

    const accepted = runPidGuard({
        commandLine:
            './qdrant --disable-telemetry',
        terminate: true,
    });
    assert.equal(
        accepted.status,
        0,
        accepted.stderr,
    );
    assert.match(
        accepted.stdout,
        /^kill:-TERM 4242\nwait:4242\n$/u,
    );
});

test('Task22.2 verifies bootstrap, loopback, exact count, and KeepAlive replacement', () => {
    assert.match(
        script,
        /launchctl bootout "\$SERVICE_TARGET"/u,
    );
    assert.match(
        script,
        /launchctl bootstrap "\$DOMAIN_TARGET" "\$INSTALLED_PLIST"/u,
    );
    assert.match(
        script,
        /127\.0\.0\.1:\$\{port\}/u,
    );
    assert.match(
        script,
        /--data '\{"exact":true\}'/u,
    );
    assert.match(
        script,
        /EXPECTED_COUNT='101'/u,
    );
    assert.match(
        script,
        /wait_for_healthy_job_pid "\$first_job_pid" 60/u,
    );
    assert.match(
        script,
        /restore_manual_qdrant/u,
    );
});

test('README exposes only the activation script as the required Terminal command', () => {
    const section = readme.slice(
        readme.indexOf(
            'TRAE sandbox',
        ),
        readme.indexOf(
            '不经过 LaunchAgent',
        ),
    );
    assert.match(
        section,
        /请在仓库根目录打开用户自己的普通 Terminal/u,
    );
    assert.match(
        section,
        /```bash\nbash scripts\/activate-hogwarts-qdrant-launchagent\.sh\n```/u,
    );
    assert.doesNotMatch(
        section,
        /\/Users\/[^\n`]*activate-hogwarts-qdrant-launchagent\.sh/u,
    );
    assert.doesNotMatch(
        section,
        /launchctl bootstrap/u,
    );
});
