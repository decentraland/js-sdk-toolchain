type Scene = 'scene-template';
type Repos = {
    [key in Scene]: {
        url: string;
        contentFolders: string[];
    };
};
export declare const get: (scene: Scene) => Repos[Scene];
export {};
