import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';
import { getGoogleMapsComponents, getGoogleMapsServerKey } from '../lib/googleMapsConfig.js';

const router = Router();
router.use(authenticate);

/** GET /api/places/autocomplete?input=...&session=… */
router.get('/autocomplete', async (req: AuthRequest, res: Response) => {
  try {
    const input = String(req.query.input ?? '').trim();
    if (input.length < 2) {
      return res.json({ predictions: [] as unknown[] });
    }
    const key = await getGoogleMapsServerKey();
    if (!key) {
      return res.status(503).json({ error: 'Location search is not configured', predictions: [] });
    }
    const session = String(req.query.session ?? '').trim();
    const componentsFromQuery = String(req.query.components ?? '').trim();
    const componentsDefault = (await getGoogleMapsComponents()) ?? '';
    const components = componentsFromQuery || componentsDefault;

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', key);
    if (components) {
      url.searchParams.set('components', components);
    }
    if (session) {
      url.searchParams.set('sessiontoken', session);
    }

    const r = await fetch(url);
    const data = (await r.json()) as {
      status: string;
      error_message?: string;
      predictions?: { description: string; place_id: string }[];
    };
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res
        .status(502)
        .json({ error: data.error_message || data.status, predictions: [] });
    }
    res.json({ predictions: data.predictions ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'autocomplete failed', predictions: [] });
  }
});

/** GET /api/places/details?placeId=...&session=… */
router.get('/details', async (req: AuthRequest, res: Response) => {
  try {
    const placeId = String(req.query.placeId ?? '').trim();
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }
    const key = await getGoogleMapsServerKey();
    if (!key) {
      return res.status(503).json({ error: 'Location search is not configured' });
    }
    const session = String(req.query.session ?? '').trim();

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', key);
    url.searchParams.set('fields', 'formatted_address,geometry,place_id');
    if (session) {
      url.searchParams.set('sessiontoken', session);
    }

    const r = await fetch(url);
    const data = (await r.json()) as { status: string; error_message?: string; result?: { formatted_address?: string } };
    if (data.status !== 'OK') {
      return res.status(502).json({ error: data.error_message || data.status });
    }
    res.json({ result: data.result || {} });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'details failed' });
  }
});

/** GET /api/places/reverse-geocode?lat=…&lng=… */
router.get('/reverse-geocode', async (req: AuthRequest, res: Response) => {
  try {
    const lat = parseFloat(String(req.query.lat));
    const lng = parseFloat(String(req.query.lng));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    const key = await getGoogleMapsServerKey();
    if (!key) {
      return res.status(503).json({ error: 'Location search is not configured' });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', key);

    const r = await fetch(url);
    const data = (await r.json()) as { status: string; error_message?: string; results?: { formatted_address: string }[] };
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: data.error_message || data.status });
    }
    const first = data.results?.[0];
    res.json({
      formattedAddress: first?.formatted_address || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'reverse geocode failed' });
  }
});

export default router;
