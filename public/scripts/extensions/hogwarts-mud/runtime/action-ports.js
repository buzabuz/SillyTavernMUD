export function createActionPorts(actionNames) {
    let target = null;
    const actions = Object.fromEntries(
        actionNames.map(name => [
            name,
            (...args) => {
                const action = target?.[name];
                if (typeof action !== 'function') {
                    throw new Error(
                        `UI action is not bound: ${name}`,
                    );
                }
                return action(...args);
            },
        ]),
    );

    return {
        actions,
        bind(nextTarget) {
            target = nextTarget;
        },
        unbind() {
            target = null;
        },
    };
}
