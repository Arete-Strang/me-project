import defaultEditingCmdInfo from "./editingCmds";
import defaultAlteringCmdInfo from "./alteringCmds";

// meno editor default styles
const defaultInlineStylesMap = {
    italic: {
        fontStyle: 'italic'
    },
    important: {
        backgroundColor: 'rgba(255, 77, 77, .5)',
        borderRadius: '3px'
    }
};
const defaultCmdInlineStyle = {
    backgroundColor: 'rgba(133, 133, 173, .5)',
    borderRadius: '3px'
};
const defaultCmdPanelStyles = {
    cmdMask: {
        backgroundColor: 'rgba(0, 0, 0, .5)'
    },
    cmdPanel: {
        height: '50px',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'rgba(0, 0, 0, .5)',
    },
    cmdInput: {
        width: '100%',
        height: '100%',
        padding: '0 10px',
        border: 'none',
        outline: 'none',
        color: '#d1e0e0',
        fontSize: '16px',
        fontFamily: 'Fira Code, monospace',
        backgroundColor: 'transparent'
    }
}

// merge the styles config
function mergeStylesConfig(userConfig) {
    let inlineStylesMap, cmdInlineStyle, cmdPanelStyles;

    if (userConfig) {
        // when the config is defined, merge the default config with the user config
        inlineStylesMap = {
            ...defaultInlineStylesMap, 
            ...userConfig.inlineStylesMap
        };
        cmdInlineStyle = {
            ...defaultCmdInlineStyle, 
            ...userConfig.cmdInlineStyle
        };
        cmdPanelStyles = {
            ...defaultCmdPanelStyles, 
            ...userConfig.cmdPanelStyles
        };
    } else {
        // when the config is not defined, use the default config
        inlineStylesMap = defaultInlineStylesMap;
        cmdInlineStyle = defaultCmdInlineStyle;
        cmdPanelStyles = defaultCmdPanelStyles;
    }

    return {
        inlineStylesMap,
        cmdInlineStyle,
        cmdPanelStyles
    };
}

// merge the commands config
function mergeAlteringCmds(userConfig) {
    let alteringCmdInfo;
    
    if (userConfig) {
        // when the config is defined, merge the default config with the user config
        // merge altering cmds map
        const alteringCmdsMap = {
            ...defaultAlteringCmdInfo.cmdsMap, 
            ...userConfig.cmdsMap
        };
        alteringCmdInfo = {
            ...defaultAlteringCmdInfo,
            ...userConfig,
            cmdsMap: alteringCmdsMap
        };
    } else {
        // when the config is not defined, use the default config
        alteringCmdInfo = defaultAlteringCmdInfo;
    }

    return alteringCmdInfo;
}

function mergeEditingCmds(userConfig) {
    let editingCmdInfo;

    if (userConfig) {
        // when the config is defined, merge the default config with the user config
        // merge editing cmds map
        const editingCmdsMap = {
            ...defaultEditingCmdInfo.cmdsMap, 
            ...userConfig.cmdsMap
        };
        editingCmdInfo = {
            ...defaultEditingCmdInfo,
            ...userConfig,
            cmdsMap: editingCmdsMap
        };
    } else {
        // when the config is not defined, use the default config
        editingCmdInfo = defaultEditingCmdInfo;
    }

    return editingCmdInfo;
}

export {
    mergeStylesConfig,
    mergeEditingCmds,
    mergeAlteringCmds
};