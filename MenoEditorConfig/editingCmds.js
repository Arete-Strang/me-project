import { EditorState, Modifier } from 'draft-js';
import { OrderedSet } from 'immutable';

function toggleItalic(editorState, commandRange, arg) {
    if (!arg) {
        throw new SyntaxError('i: italic command need an argument');
    }
    const contentState = editorState.getCurrentContent();
    const newEditorState = EditorState.push(
        editorState,
        Modifier.replaceText(
            contentState,
            commandRange,
            arg,
            OrderedSet.of('italic')
        ),
        'change-inline-style'
    );

    return newEditorState;
}

const editingCmdInfo = {
    promptChar: '$',
    cmdsMap: {
        i: {
            isAsync: false,
            exec: toggleItalic
        }
    }
};

export default editingCmdInfo;