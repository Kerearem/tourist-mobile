import type { ID, ISODateString } from "./common";

export type Event = {
  id: ID;
  title: string;
  city: string;
  countryCode: string;
  startsAt: ISODateString;
  organizerId: ID;
};
