import {
  createShortUrl,
  getOriginalUrl,
  getUrlStats,
  getUrlMetrics,
} from "../services/urlService.js";
import { AppError } from "../utils/AppError.js";

export const createUrl = async (req, res) => {
  const originalUrl = req.body.url;
  const expiresIn = req.body.expiresIn;
  if (!originalUrl) {
    throw new AppError("Please provide a url!", 400);
  }
  let url;
  try {
    url = new URL(originalUrl);
  } catch {
    throw new AppError("Please provide a valid url!", 400);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError("Please provide a valid url!", 400);
  }
  if (expiresIn != null && (!Number.isInteger(expiresIn) || expiresIn <= 0)) {
    throw new AppError("Please provide a valid expiry!", 400);
  }
  const result = await createShortUrl(originalUrl, expiresIn);
  res.status(201).json(result);
};

export const redirectToUrl = async (req, res) => {
  const shortCode = req.params.code;
  const originalUrl = await getOriginalUrl(shortCode);
  if (!originalUrl) {
    throw new AppError("Url expired or not found!", 404);
  }
  res.redirect(originalUrl);
};

export const getCodeStats = async (req, res) => {
  const shortCode = req.params.code;
  const result = await getUrlStats(shortCode);
  if (!result) {
    throw new AppError("Stats not found!", 404);
  }
  res.status(200).json(result);
};

export const getCodeMetrics = async (req, res) => {
  const result = await getUrlMetrics();
  res.status(200).json(result);
};
