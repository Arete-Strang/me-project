import { convertToRaw, EditorState, Modifier } from 'draft-js';
import { OrderedSet } from 'immutable';

async function writeFile({ editorState, outerTriggers }) {
    try {
        if (!outerTriggers.saveTrigger) {
            throw new Error('w: saveTrigger is not defined.');
        }
        const rawContent = convertToRaw(editorState.getCurrentContent());
        await outerTriggers.saveTrigger(rawContent);
        return null;
    } catch (error) {
        throw error;
    }
}

function changeBlockType({ editorState, cmdRange, arg }) {
    let blockType;
    switch (arg) {
        case 'p':
            blockType = 'unstyled';
            break;
        case 'h1':
            blockType = 'header-one';
            break;
        case 'h2':
            blockType = 'header-two';
            break;
        case 'h3':
            blockType = 'header-three';
            break;
        case 'h4':
            blockType = 'header-four';
            break;
        case 'h5':
            blockType = 'header-five';
            break;
        case 'h6':
            blockType = 'header-six';
            break;
        case 'ul':
            blockType = 'unordered-list-item';
            break;
        case 'ol':
            blockType = 'ordered-list-item';
            break;
        case 'q':
            blockType = 'blockquote';
            break;
        case 'c':
            blockType = 'code-block';
            break;
        default:
            // -------------------------
            throw new SyntaxError(`cb: ${arg} block doesn't exist.`);
    }
    
    const newEditorState = EditorState.push(
        editorState,
        Modifier.setBlockType(
            editorState.getCurrentContent(),
            cmdRange,
            blockType
        ),
        'change-block-type'
    );

    return newEditorState;
}

function toggleHighlight({ editorState, cmdRange, inlineArg }) {
    const contentState = editorState.getCurrentContent();
    const newEditorState = EditorState.push(
        editorState,
        Modifier.replaceText(
            contentState,
            cmdRange,
            inlineArg,
            OrderedSet.of('important')
        ),
        'change-inline-style'
    );
    return newEditorState;
}

export default {
    promptChar: '#',
    cmdsMap: {
        w: {
            isAsync: true,
            exec: writeFile
        },
        cb: {
            isAsync: false,
            exec: changeBlockType
        },
        h: {
            isAsync: false,
            exec: toggleHighlight
        }
    }
};;