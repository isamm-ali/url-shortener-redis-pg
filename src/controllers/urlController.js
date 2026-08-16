import {
  createShortUrl,
  getOriginalUrl,
  getUrlStats,
  getUrlMetrics,
} from "../services/urlService.js";

export const createUrl = async (req, res) => {
  try {
    const originalUrl = req.body.url;
    const expiresIn = req.body.expiresIn;
    if (!originalUrl) {
      return res.status(400).json({
        error: "Please provide a url!",
      });
    }
    let url;
    try {
      url = new URL(originalUrl);
    } catch {
      return res.status(500).json({
        error: "Something went wrong!",
      });
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      return res.status(400).json({
        error: "Please provide a valid url!",
      });
    }
    if (expiresIn != null && (!Number.isInteger(expiresIn) || expiresIn <= 0)) {
      return res.status(400).json({
        error: "Please provide a valid expiry!",
      });
    }
    const result = await createShortUrl(originalUrl, expiresIn);
    res.status(201).json(result);
  } catch {
    res.status(500).json({
      error: "Something went wrong!",
    });
  }
};

export const redirectToUrl = async (req, res) => {
  try {
    const shortCode = req.params.code;
    const originalUrl = await getOriginalUrl(shortCode);
    if (!originalUrl) {
      return res.status(404).json({
        error: "Url expired or not found!",
      });
    }
    res.redirect(originalUrl);
  } catch {
    res.status(500).json({
      error: "Something went wrong!",
    });
  }
};

export const getCodeStats = async (req, res) => {
  try {
    const shortCode = req.params.code;
    const result = await getUrlStats(shortCode);
    if (!result) {
      return res.status(404).json({
        error: "Stats not found!",
      });
    }
    res.status(200).json(result);
  } catch {
    res.status(500).json({
      error: "Something went wrong!",
    });
  }
};

export const getCodeMetrics = async (req, res) => {
  try {
    const result = await getUrlMetrics();
    res.status(200).json(result);
  } catch {
    res.status(500).json({
      error: "Something went wrong!",
    });
  }
};
