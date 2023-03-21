// modules
import {
    convertFromRaw,
    Editor,
    EditorState,
    Modifier,
    RichUtils,
    SelectionState,
    getDefaultKeyBinding
} from 'draft-js';
import { useEffect, useRef, useState } from 'react';
import { OrderedSet } from 'immutable';

// styles
import 'draft-js/dist/Draft.css';

const MenoEditor = ({
    className, 
    initialContent = { blocks: [], entityMap: {} },
    inlineStylesMap,
    editingCmdInfo = { promptChar: '$', cmdsMap: {} },
    alteringCmdInfo = { promptChar: '#', cmdsMap: {} },
    cmdInlineStyle = {
        backgroundColor: 'rgba(133, 133, 173, .5)',
        borderRadius: '3px'
    },
    editorTriggers,
    cmdPanelStyles = {
        cmdMask: {
            backgroundColor: 'rgba(0, 0, 0, .5)'
        },
        cmdPanel: {
            height: '50px',
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            backgroundColor: 'rgba(255, 255, 255, .5)',
        },
        cmdInput: {
            width: '100%',
            height: '100%',
        }
    },
    stateRef // ref to the editor state
}) => {
    // init the editor content with raw content state and custom dependency map
    const [ editorState, setEditorState ] = useState(() => {
        // only execute at mount
        return EditorState.createWithContent(convertFromRaw(initialContent));
    });
    const [ showCmdPanel, setShowCmdPanel ] = useState(false);
    
    // ref to the editor state
    stateRef && (stateRef.current = editorState);

    // editor focus control
    const editorRef = useRef(null);
    // cmd panel open control
    const openingCmdPanel = useRef(false);

    // cmd panel blur and focus to editor
    useEffect(() => {
        if (!showCmdPanel) {
            editorRef.current.focus();
        }
    }, [ showCmdPanel ]);

    // show cmd panel
    useEffect(() => {
        if (openingCmdPanel.current) {
            setShowCmdPanel(true);
            openingCmdPanel.current = false;
        }
    }, [ openingCmdPanel.current ]);

    function keyBindingFn(event) {
        return getDefaultKeyBinding(event);
    }

    function handleKeyCommand(command, editorState) {
        const newEditorState = RichUtils.handleKeyCommand(editorState, command);
        if (newEditorState) {
            setEditorState(newEditorState);
            return 'handled';
        }
        return 'not-handled';
    }

    // turn on the cmd mode
    function handleBeforeInput(char, editorState) {
        const currentInlineStyle = editorState.getCurrentInlineStyle();

        // typing cmd, do nothing with a new prompt char
        if (currentInlineStyle.has('cmdInlineStyle')) {
            return 'not-handled';
        }

        // -------------cmd maps not defined, deal with it later----------------
        if (!editingCmdInfo || !alteringCmdInfo) {
            return 'not-handled';
        }

        // turn on editing cmd mode (cannot nest)
        if (char === editingCmdInfo.promptChar) {
            turnOnEditingCmdMode(editorState);
            return 'handled';
        }
        // turn on altering cmd mode (cannot nest)
        if (char === alteringCmdInfo.promptChar) {
            turnOnAlteringCmdMode(editorState);
            return 'handled';
        }

        return 'not-handled';
    }

    function turnOnEditingCmdMode(editorState) {
        // turn on the inline cmd style and insert the prompt char directly
        const newEditorState = EditorState.push(
            editorState,
            Modifier.insertText(
                editorState.getCurrentContent(), 
                editorState.getSelection(), 
                editingCmdInfo.promptChar, 
                OrderedSet.of('cmdInlineStyle')
            ),
            'insert-characters'
        );
        setEditorState(newEditorState);
    }

    function turnOnAlteringCmdMode(editorState) {
        const selectionState = editorState.getSelection();
        const currentInlineStyle = editorState.getCurrentInlineStyle();
        let selectedRange = null;
            
        if (!selectionState.isCollapsed()) {
            // is not collapsed
            selectedRange = selectionState;
        } else if (currentInlineStyle.size) {
            // is collapsed but is decorated
            // convert the decorated range into selected range
            // get the current block
            const contentBlock = editorState
                .getCurrentContent()
                .getBlockForKey(selectionState.anchorKey);
            // get the selected range
            selectedRange = getCurStyleRange(contentBlock, currentInlineStyle);
        }

        // there's selected range, turn on the inline cmd style
        // and open the cmd panel (delay a little bit)
        if (selectedRange) {
            openPanelWithSelected(selectedRange);
            return 'handled';
        }

        // there's no selected range, open the cmd panel directly
        setShowCmdPanel(true);
    }

    // toggle up the inline style and cmd panel, when the selected range is not collapsed
    function openPanelWithSelected(selectedRange) {
        const newEditorState = EditorState.push(
            editorState,
            Modifier.applyInlineStyle(
                editorState.getCurrentContent(),
                selectedRange,
                'cmdInlineStyle'
            ),
            'change-inline-style'
        );
        setEditorState(newEditorState);
        openingCmdPanel.current = true;
    }

    // trigger editing cmd complete
    function handleReturn(event, editorState) {
        const currentInlineStyle = editorState.getCurrentInlineStyle();
        const selectionState = editorState.getSelection();

        // not handle selected ranges text
        if (!selectionState.isCollapsed()) {
            return 'not-handled';
        }

        // editing command typing complete
        if (currentInlineStyle.has('cmdInlineStyle')) {
            execEditingCmd();
            return 'handled';
        }

        // turn off all inline style (collapsed selection range)
        if (currentInlineStyle.size) {
            const newEditorState = currentInlineStyle.reduce((newEditorState, inlineStyle) => {
                return RichUtils.toggleInlineStyle(newEditorState, inlineStyle);
            }, editorState);
            setEditorState(newEditorState);
            return 'handled';
        }

        return 'not-handled';
    }

    function execEditingCmd() {
        const selectionState = editorState.getSelection();
        // parse the full command
        const contentBlock = editorState.getCurrentContent()
            .getBlockForKey(selectionState.anchorKey);
        // get the command range
        const commandRange = getCurStyleRange(contentBlock, [ 'cmdInlineStyle' ]);
        // get full command
        const fullCmd = contentBlock.getText()
            .substring(commandRange.anchorOffset, commandRange.focusOffset);

        // full command is only the prompt char, do replace
        if (fullCmd === editingCmdInfo.promptChar) {
            replaceWithPromptChar(fullCmd, commandRange);
            return;
        }

        // get the command and arg
        let [ command, arg ] = contentBlock
            .getText()
            .substring(commandRange.anchorOffset, commandRange.focusOffset)
            .split(':');
        command = command.substring(1);

        // get the info of the command
        const cmdInfo = editingCmdInfo.cmdsMap[command];

        if (!cmdInfo) {
            // command not found
            alert(`editing command: ${command} not found`);
            return;
        }

        // execute the command
        execCmd(false, cmdInfo, commandRange, arg, editorTriggers);
    }
    
    // exec the command typed in the cmd panel
    function execAlteringCmd(fullCmd) {
        let contentState = editorState.getCurrentContent();
        const commandRange = editorState.getSelection();

        // if full cmd is only the prompt character, do replace
        if (fullCmd === alteringCmdInfo.promptChar) {
            replaceWithPromptChar(fullCmd, commandRange);
            // close the cmd panel
            setShowCmdPanel(false);
            return;
        }

        let [ command, arg ] = fullCmd.split(':');
        command = command.substring(2);

        const inlineArg = contentState
            .getBlockForKey(commandRange.anchorKey)
            .getText()
            .substring(commandRange.anchorOffset, commandRange.focusOffset);
        
        // get the info of the command
        const cmdInfo = alteringCmdInfo.cmdsMap[command];

        if (!cmdInfo) {
            // command not found
            console.log(`altering command: ${command} not found`);
            return;
        }

        // execute the command
        execCmd(true, cmdInfo, commandRange, arg, editorTriggers, inlineArg);
    }

    function replaceWithPromptChar(promptChar, commandRange) {
        const newEditorState = EditorState.push(
            editorState,
            Modifier.replaceText(
                editorState.getCurrentContent(),
                commandRange,
                promptChar
            ),
            'change-block-data'
        );
        setEditorState(newEditorState);
    }

    function execCmd(isAlteringCmd, cmdInfo, ...args) {
        // check the function type
        if (cmdInfo.isAsync) {
            // async function
            (async () => {
                try {
                    const newEditorState = await cmdInfo.exec(editorState, ...args);
                    if (newEditorState) {
                        setEditorState(newEditorState);
                        if (isAlteringCmd) {
                            // close the cmd panel when altering cmd success
                            setShowCmdPanel(false);
                        }
                        return;
                    }
                    throw new Error('something wrong with cmd logic');
                } catch (error) {
                    alert(error.message);
                }
            })();
        } else {
            // sync function
            try {
                const newEditorState = cmdInfo.exec(editorState, ...args);
                if (newEditorState) {
                    setEditorState(newEditorState);
                    if (isAlteringCmd) {
                        // close the cmd panel when altering cmd success
                        setShowCmdPanel(false);
                    }
                    return;
                }
                throw new Error('something wrong with cmd logic');
            } catch (error) {
                alert(error.message);
            }
        }
    }

    // when click on the mask of the cmd panel, blur the cmd panel
    // or when press the esc key
    function blurCmdPanel() {
        // toggle down cmd inline style
        const newEditorState = EditorState.push(
            editorState,
            Modifier.removeInlineStyle(
                editorState.getCurrentContent(),
                editorState.getSelection(),
                'cmdInlineStyle'
            ),
            'change-inline-style'
        );
        setEditorState(newEditorState);
        // hidden cmd panel
        setShowCmdPanel(false);
    }

    return (
        <div 
            className={className}
            style={{position: 'relative'}}
        >
            {showCmdPanel && 
                <CmdMask
                    style={cmdPanelStyles.cmdMask}
                    onClick={blurCmdPanel}
                >
                    <CmdPanel 
                        onExit={blurCmdPanel}
                        promptChar={alteringCmdInfo.promptChar} 
                        onExec={execAlteringCmd}
                        styles={cmdPanelStyles}
                    />
                </CmdMask>
            }
            <div
                onClick={() => editorRef.current.focus()}
                style={{
                    width: '100%',
                    height: '100%',
                    overflowX: 'hidden',
                    wordWrap: 'break-word',
                    wordBreak: 'break-all'
                }}
            >
                <Editor
                    editorState={editorState}
                    onChange={setEditorState}
                    ref={editorRef}
                    customStyleMap={{ ...inlineStylesMap, cmdInlineStyle }}
                    handleBeforeInput={handleBeforeInput}
                    handleReturn={handleReturn}
                    keyBindingFn={keyBindingFn}
                    handleKeyCommand={handleKeyCommand}
                />
            </div>
        </div>
    );
}

function getCurStyleRange(blockState, inlineStyles) {
    let commandRange = SelectionState.createEmpty(blockState.getKey());

    blockState.findStyleRanges(
        (charMetadata) => {
            for (let style of inlineStyles) {
                if (!charMetadata.hasStyle(style)) {
                    return false;
                }
            }
            return true;
        },
        (start, end) => {
            commandRange = commandRange.merge({
                anchorOffset: start,
                focusOffset: end,
                hasFocus: true
            });
        }
    );
    return commandRange;
}

const CmdMask = ({ children, style, onClick }) => {
    const innerStyle = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99
    }
    
    return (
        <div
            style={{ ...style, ...innerStyle }}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

const CmdPanel = ({ promptChar, onExec, styles, onExit }) => {
    const [ fullCmd, setFullCmd ] = useState(promptChar + ' ');

    function handleKeyDown(event) {
        event.stopPropagation();

        // Escape the cmd panel
        if (event.key === 'Escape') {
            event.preventDefault();
            onExit();
            return;
        }

        // when press backspace and the cmd is empty, exit the cmd panel
        if (event.key === 'Backspace' && fullCmd.length === 2) {
            event.preventDefault();
            onExit();
            return;
        }

        // only handle the Enter key
        if (event.key !== 'Enter') {
            return;
        }
        event.preventDefault();
        onExec(fullCmd);
    }
    
    return (
        <div style={styles.cmdPanel}>
            <input 
                type="text" 
                style={styles.cmdInput} 
                value={fullCmd}
                onChange={(event) => setFullCmd(event.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus={true}
                spellCheck={false}
                onClick={(event) => event.stopPropagation()}
            />
        </div>
    );
}

export default MenoEditor;