// FinnhubNews DTO for passing between route, service, and DAO
export interface FinnhubNews {
  headline: string;
  link: string;
  datetime: number;
  source: string;
  summary: string;
}