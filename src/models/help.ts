import type { ID, ISODateString } from "./common";

export type HelpRequest = {
  id: ID;
  title: string;
  description: string;
  city: string;
  countryCode: string;
  createdBy: ID;
  createdAt: ISODateString;
};
