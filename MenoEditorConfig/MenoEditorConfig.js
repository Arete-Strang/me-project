import editingCmdInfo from "./editingCmds";
import alteringCmdInfo from "./alteringCmds";

const inlineStylesMap = {
    italic: {
        fontStyle: 'italic'
    },
    important: {
        backgroundColor: 'rgba(255, 77, 77, .5)',
        borderRadius: '3px'
    }
};

const cmdPanelStyles = {
    cmdMask: {
        backgroundColor: 'rgba(0, 0, 0, .5)'
    },
    cmdPanel: {
        height: '50px',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'rgba(102, 102, 153, .5)',
    },
    cmdInput: {
        width: '100%',
        height: '100%',
        padding: '0 10px',
        fontSize: '16px',
        color: '#d1e0e0'
    }
}

export {
    inlineStylesMap,
    editingCmdInfo,
    alteringCmdInfo,
    cmdPanelStyles
};