import {
    EditorState, 
    Modifier,
    convertFromRaw,
    CompositeDecorator
} from "draft-js";

function genStateFromRaw(rawContent, decorators) {
    // default to empty content
    const content = rawContent || { blocks: [], entityMap: {} };
    if (decorators) {
        return EditorState.createWithContent(
            convertFromRaw(content), 
            new CompositeDecorator(decorators)
        );
    }
    return EditorState.createWithContent(convertFromRaw(content));
}

function replaceText(editorState, targetRange, text, inlineStyle) {
    const newEditorState = EditorState.push(
        editorState,
        Modifier.replaceText(
            editorState.getCurrentContent(),
            targetRange,
            text,
            inlineStyle && OrderedSet.of(inlineStyle)
        ),
        'change-inline-style'
    );
    return newEditorState;
}

export {
    replaceText,
    genStateFromRaw
}