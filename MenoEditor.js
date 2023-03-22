// modules
import {
    convertFromRaw,
    Editor,
    EditorState,
    Modifier,
    RichUtils,
    SelectionState,
    getDefaultKeyBinding,
    CompositeDecorator
} from 'draft-js';
import { useEffect, useRef, useState } from 'react';
import { OrderedSet } from 'immutable';
import {
    mergeStylesConfig, 
    mergeEditingCmds, 
    mergeAlteringCmds
} from './MenoEditorConfig';

// styles
import 'draft-js/dist/Draft.css';

const MenoEditor = ({
    className, 
    // initial content state
    initialContent = { blocks: [], entityMap: {} },
    // configs
    stylesConfig,
    editingCmdsConfig,
    alteringCmdsConfig,
    // outer triggers in order to communicate with parent component
    outerTriggers = {},
    saveTrigger,        // outer trigger to save the editor content
    // error handler
    errHandler,
    // inner hooks for outer use, say trigger save and clear
    innerHooks,
    // specifically for entities at the moment
    decorators,
}) => {
    // init the editor content with raw content state and custom dependency map
    const [ editorState, setEditorState ] = useState(() => {
        // only execute at mount
        if (decorators) {
            return EditorState.createWithContent(
                convertFromRaw(initialContent), 
                new CompositeDecorator(decorators)
            );
        }
        return EditorState.createWithContent(convertFromRaw(initialContent));
    });
    const [ showCmdPanel, setShowCmdPanel ] = useState(false);

    // merge configs
    const _stylesConfig = useRef(null);
    const _editingCmdsInfo = useRef(null);
    const _alteringCmdsInfo = useRef(null);
    // avoid merge config every render
    if (!_stylesConfig.current) {
        _stylesConfig.current = mergeStylesConfig(stylesConfig);
    }
    if (!_editingCmdsInfo.current) {
        _editingCmdsInfo.current = mergeEditingCmds(editingCmdsConfig);
    }
    if (!_alteringCmdsInfo.current) {
        _alteringCmdsInfo.current = mergeAlteringCmds(alteringCmdsConfig);
    }
    // add save trigger into outer triggers
    outerTriggers.saveTrigger = saveTrigger;

    // extract styles and cmds config
    const {
        inlineStylesMap,
        cmdInlineStyle,
        cmdPanelStyles,
    } = _stylesConfig.current;
    const editingCmdsInfo = _editingCmdsInfo.current;
    const alteringCmdsInfo = _alteringCmdsInfo.current;

    // editor focus control
    const editorRef = useRef(null);
    // cmd panel open control
    const openingCmdPanel = useRef(false);

    // export hook functions
    if (innerHooks) {
        innerHooks.current = {
            save: () => {
                execCmd(true, alteringCmdsInfo.cmdsMap['w'], {
                    editorState, outerTriggers
                });
            },
            clear: () => {
                setEditorState(EditorState.createEmpty());
            }
        }
    }

    // cmd panel blur and focus to editor
    useEffect(() => {
        if (!showCmdPanel) {
            editorRef.current.focus();
        }
    }, [ showCmdPanel ]);

    // delay show cmd panel
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

        // turn on editing cmd mode (cannot nest)
        if (char === editingCmdsInfo.promptChar) {
            turnOnEditingCmdMode(editorState);
            return 'handled';
        }
        // turn on altering cmd mode (cannot nest)
        if (char === alteringCmdsInfo.promptChar) {
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
                editingCmdsInfo.promptChar, 
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
        const cmdRange = getCurStyleRange(contentBlock, [ 'cmdInlineStyle' ]);
        // get full command
        const fullCmd = contentBlock.getText()
            .substring(cmdRange.anchorOffset, cmdRange.focusOffset);

        // full command is only the prompt char, do replace
        if (fullCmd === editingCmdsInfo.promptChar) {
            replaceWithPromptChar(cmdRange, editingCmdsInfo.promptChar);
            return;
        }

        // get the command and arg
        let [ command, arg ] = contentBlock
            .getText()
            .substring(cmdRange.anchorOffset, cmdRange.focusOffset)
            .split(':');
        command = command.substring(1);

        // get the info of the command
        const cmdInfo = editingCmdsInfo.cmdsMap[command];

        if (!cmdInfo) {
            // command not found
            const err = new SyntaxError(`editing command: ${command} not found`);
            if (errHandler) {
                errHandler(err);
            } else {
                console.error(err);
            }
            return;
        }

        // execute the command
        execCmd(false, cmdInfo, {
            cmdRange, 
            arg, 
            outerTriggers
        });
    }
    
    // exec the command typed in the cmd panel
    function execAlteringCmd(fullCmd) {
        let contentState = editorState.getCurrentContent();
        const cmdRange = editorState.getSelection();

        // if full cmd is only the prompt character, do replace
        if (fullCmd === alteringCmdsInfo.promptChar + ' ') {
            replaceWithPromptChar(cmdRange, alteringCmdsInfo.promptChar);
            // close the cmd panel
            setShowCmdPanel(false);
            return;
        }

        let [ command, arg ] = fullCmd.split(':');
        command = command.substring(2);

        const inlineArg = contentState
            .getBlockForKey(cmdRange.anchorKey)
            .getText()
            .substring(cmdRange.anchorOffset, cmdRange.focusOffset);
        
        // get the info of the command
        const cmdInfo = alteringCmdsInfo.cmdsMap[command];

        if (!cmdInfo) {
            // command not found
            const err = new SyntaxError(`altering command: ${command} not found`);
            if (errHandler) {
                errHandler(err);
            } else {
                console.error(err);
            }
            return;
        }

        // execute the command
        execCmd(true, cmdInfo, {
            cmdRange, 
            arg, 
            outerTriggers, 
            inlineArg
        });
    }

    // replace the selected range with the prompt char
    // only when the full command is only the prompt char
    function replaceWithPromptChar(commandRange, promptChar) {
        const newEditorState = EditorState.push(
            editorState,
            Modifier.replaceText(
                editorState.getCurrentContent(),
                commandRange.merge({
                    hasFocus: true
                }),
                promptChar
            ),
            'change-block-data'
        );
        setEditorState(newEditorState);
    }

    function execCmd(isAlteringCmd, cmdInfo, argObj) {
        // check the function type
        if (cmdInfo.isAsync) {
            // async function
            (async () => {
                try {
                    const newEditorState = await cmdInfo.exec({ editorState, ...argObj });
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
                    if (errHandler) {
                        errHandler(error);
                    } else {
                        console.error(error);
                    }
                }
            })();
        } else {
            // sync function
            try {
                const newEditorState = cmdInfo.exec({ editorState, ...argObj });
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
                if (errHandler) {
                    errHandler(error);
                } else {
                    console.error(error);
                }
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
            style={{
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {showCmdPanel && 
                <CmdMask
                    style={cmdPanelStyles.cmdMask}
                    onClick={blurCmdPanel}
                >
                    <CmdPanel 
                        onExit={blurCmdPanel}
                        promptChar={alteringCmdsInfo.promptChar} 
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