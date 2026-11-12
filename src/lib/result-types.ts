export interface StoredRaceResult {id:string;date:number;roomName:string;speed:number;accuracy:number|null;rank:number;won:boolean;abandoned:boolean;score:number|null}
export interface ResultSummary {races:number;wins:number;bestSpeed:number;averageSpeed:number;averageAccuracy:number|null}
export interface ResultPage {results:StoredRaceResult[];total:number;page:number;pageSize:number;summary:ResultSummary;progression:{date:number;speed:number}[]}
