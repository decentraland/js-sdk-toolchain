const path = require('path')
const fs = require('fs')

module.exports = function (dcl, app, express) {
    const dclKernelPath = path.resolve(dcl.getWorkingDir(), 'node_modules', 'decentraland-kernel');
    const dclKernelDefaultProfilePath = path.resolve(dclKernelPath, 'default-profile');
    const dclUnityRenderer = path.resolve(dcl.getWorkingDir(), 'node_modules', '@dcl', 'unity-renderer');

    const routeMappingPath = {
        '/': {
            path: path.resolve(dclKernelPath, 'preview.html'), 
            type: 'text/html'
        },
        '/@/artifacts/preview.js': {
            path: path.resolve(dclKernelPath, 'dist', 'preview.js'), 
            type: 'text/javascript'
        },
        '/@/artifacts/unity-renderer/index.js': {
            path: path.resolve(dclUnityRenderer, 'index.js'), 
            type: 'text/javascript'
        },
        '/@/artifacts/unity-renderer/unity.data.unityweb': {
            path: path.resolve(dclUnityRenderer, 'unity.data'), 
            type: 'text/plain'
        },
        '/@/artifacts/unity-renderer/unity.framework.js.unityweb':{
            path: path.resolve(dclUnityRenderer, 'unity.framework.js'), 
            type: 'text/javascript'
        },
        '/@/artifacts/unity-renderer/unity.wasm.unityweb':{
            path: path.resolve(dclUnityRenderer, 'unity.wasm'), 
            type: 'application/wasm'
        },
    };
    
    for (const route in routeMappingPath){
        app.get(route, async (req, res) => {
            res.setHeader('Content-Type', routeMappingPath[route].type);
            const contentFile = fs.readFileSync(routeMappingPath[route].path);
            res.send(contentFile);
        });
    }

    app.use('/default-profile/', express.static(dclKernelDefaultProfilePath));
};