import type { RequestHandler } from 'express';
import { getMap, removeCountry, upsertCountry } from './map.service.js';
import type { UpsertCountryInput } from './map.schemas.js';

export const getUserMap: RequestHandler = async (req, res) => {
  res.json(await getMap(req.params.userId as string, req.user));
};

export const putCountry: RequestHandler = async (req, res) => {
  const country = await upsertCountry(req.user!._id, req.body as UpsertCountryInput);
  res.json({ country });
};

export const deleteCountry: RequestHandler = async (req, res) => {
  await removeCountry(req.user!._id, req.params.code as string);
  res.status(204).end();
};
