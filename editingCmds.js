import { EditorState, Modifier } from 'draft-js';
import { OrderedSet } from 'immutable';

function toggleItalic({ editorState, cmdRange, arg }) {
    if (!arg) {
        throw new SyntaxError('i: italic command need an argument');
    }
    const contentState = editorState.getCurrentContent();
    const newEditorState = EditorState.push(
        editorState,
        Modifier.replaceText(
            contentState,
            cmdRange,
            arg,
            OrderedSet.of('italic')
        ),
        'change-inline-style'
    );
    return newEditorState;
}


function toggleImportant({ editorState, cmdRange, arg }) {
    if (!arg) {
        throw new SyntaxError('h: important command need an argument');
    }
    const contentState = editorState.getCurrentContent();

    const newEditorState = EditorState.push(
        editorState,
        Modifier.replaceText(
            contentState,
            cmdRange,
            arg,
            OrderedSet.of('important')
        ),
        'change-inline-style'
    );

    return newEditorState;
}

export default {
    promptChar: '$', 
    cmdsMap: {
        h: {
            isAsync: false,
            exec: toggleImportant
        },
        i: {
            isAsync: false,
            exec: toggleItalic
        }
    }
};