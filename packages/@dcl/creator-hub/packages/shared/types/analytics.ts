export type Events = {
  'Open Editor': {
    version: string;
  };
  'Auto Update Editor': {
    version: string;
  };
  'Scene created': {
    projectType: 'github-repo';
    url: string;
    project_id: string;
  };
  'Create Project': {
    project_id: string;
    project_name: string;
    template: string;
    rows: number;
    cols: number;
  };
  'Open Project': {
    project_id: string;
    project_name: string;
  };
  'Save Project Success': {
    project_id: string;
    project_name: string;
  };
  'Preview Scene': {
    project_id: string;
  };
  'Publish Scene': {
    project_id: string;
    target: string;
    targetContent: string;
  };
  'Open Code': undefined;
};
