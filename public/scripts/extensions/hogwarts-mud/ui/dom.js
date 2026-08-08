export function getUiDomRefs(root) {
    if (!root) {
        throw new Error(
            'Hogwarts MUD 模板未生成根节点。',
        );
    }
    return {
        root,
        homeElement:
            root.querySelector('#hpmud_home'),
        setupElement:
            root.querySelector('#hpmud_setup'),
        workspaceElement:
            root.querySelector('#hpmud_workspace'),
        setupForm:
            root.querySelector('#hpmud_setup_form'),
        storyElement:
            root.querySelector('#hpmud_story'),
        inspectorElement:
            root.querySelector(
                '#hpmud_inspector_content',
            ),
        composerInput:
            root.querySelector('#hpmud_input'),
        settingsDialog:
            root.querySelector('#hpmud_settings'),
        profileEditorDialog:
            root.querySelector(
                '#hpmud_profile_editor',
            ),
        sceneTransitionDialog:
            root.querySelector(
                '#hpmud_scene_transition_dialog',
            ),
        sceneArchiveDialog:
            root.querySelector(
                '#hpmud_scene_archive_dialog',
            ),
        launcher: null,
        relationshipGraphController: null,
    };
}
