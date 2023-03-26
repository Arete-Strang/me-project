import { EditorState, Modifier } from 'draft-js';
import { OrderedSet } from 'immutable';
import { replaceText } from './MeFacilities';

function toggleItalic({ editorState, cmdRange, arg }) {
    if (!arg) {
        throw new SyntaxError('i: italic command need an argument');
    }
    const newEditorState = replaceText(editorState, cmdRange, arg, 'italic');
    return newEditorState;
}

function toggleImportant({ editorState, cmdRange, arg }) {
    if (!arg) {
        throw new SyntaxError('h: important command need an argument');
    }
    const newEditorState = replaceText(editorState, cmdRange, arg, 'important');
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