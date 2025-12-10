export interface Field {
  label: string;
  value: string | number;
}

export interface TableRow {
  values: string[];
}

export interface Table {
  name: string;
  headers: string[];
  rows: TableRow[];
}

export interface ExtractedData {
  fields: Field[];
  tables: Table[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  EXPORTING = 'EXPORTING',
}

export interface SheetConfig {
  spreadsheetId: string;
  clientId: string; // Changed from accessToken to clientId for better UX
}

export interface VisionResponse {
  data: ExtractedData;
}

// Google Identity Services Types
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => any;
        };
      };
    };
  }
}