import { db } from "@/lib/db";
import { brandCreators } from "@/lib/db/schema";
import { requireOwnedBrand } from "@/lib/auth/access";
import { eq } from "drizzle-orm";

export type BrandProcessedIdentitySet = {
  creatorIds: Set<string>;
  platformHandles: Set<string>;
  profileUrls: Set<string>;
};

type IdentityCandidate = {
  id?: string | null;
  creatorId?: string | null;
  platform?: string | null;
  platformId?: string | null;
  handle?: string | null;
  profileUrl?: string | null;
  profile_url?: string | null;
  platforms?: Array<{
    platform?: string | null;
    platformId?: string | null;
    handle?: string | null;
    profileUrl?: string | null;
    profile_url?: string | null;
  }> | null;
};

export async function getBrandProcessedIdentitySet(
  brandId: string
): Promise<BrandProcessedIdentitySet> {
  await requireOwnedBrand(brandId);

  const linked = await db.query.brandCreators.findMany({
    where: eq(brandCreators.brandId, brandId),
    columns: { creatorId: true },
    with: {
      creator: {
        columns: { id: true },
        with: {
          platforms: {
            columns: {
              platformId: true,
              handle: true,
              profileUrl: true,
            },
          },
        },
      },
    },
  });

  const identities: BrandProcessedIdentitySet = {
    creatorIds: new Set(),
    platformHandles: new Set(),
    profileUrls: new Set(),
  };

  for (const linkedCreator of linked) {
    identities.creatorIds.add(linkedCreator.creatorId);
    identities.creatorIds.add(linkedCreator.creator.id);

    for (const platform of linkedCreator.creator.platforms) {
      addPlatformHandle(identities, platform.platformId, platform.handle);
      addProfileUrl(identities, platform.profileUrl);
    }
  }

  return identities;
}

export function isProcessedByBrandIdentity(
  identities: BrandProcessedIdentitySet,
  candidate: IdentityCandidate
) {
  const creatorId = candidate.creatorId || candidate.id;
  if (creatorId && identities.creatorIds.has(creatorId)) return true;

  const platformEntries = [
    candidate,
    ...(candidate.platforms || []),
  ];

  for (const entry of platformEntries) {
    const platform = entry.platformId || entry.platform;
    const handle = entry.handle;
    const profileUrl = entry.profileUrl || entry.profile_url;

    const platformHandle = getPlatformHandleKey(platform, handle);
    if (platformHandle && identities.platformHandles.has(platformHandle)) return true;

    const normalizedUrl = normalizeProfileUrl(profileUrl);
    if (normalizedUrl && identities.profileUrls.has(normalizedUrl)) return true;

    const urlIdentity = getPlatformHandleFromProfileUrl(profileUrl, platform);
    if (urlIdentity && identities.platformHandles.has(urlIdentity)) return true;
  }

  return false;
}

export function filterNewToBrandByIdentity<T extends IdentityCandidate>(
  identities: BrandProcessedIdentitySet,
  candidates: T[]
) {
  return candidates.filter((candidate) => !isProcessedByBrandIdentity(identities, candidate));
}

export function normalizePlatform(platform?: string | null) {
  if (!platform) return null;
  const normalized = platform.toLowerCase().trim();
  if (["x", "x_twitter", "twitter"].includes(normalized)) return "twitter";
  return normalized;
}

export function normalizeHandle(handle?: string | null) {
  if (!handle) return null;
  return decodeURIComponent(handle)
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/[^/]+\/@?/i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

export function normalizeProfileUrl(profileUrl?: string | null) {
  if (!profileUrl) return null;
  try {
    const url = new URL(profileUrl.startsWith("http") ? profileUrl : `https://${profileUrl}`);
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return profileUrl
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

function addPlatformHandle(
  identities: BrandProcessedIdentitySet,
  platform?: string | null,
  handle?: string | null
) {
  const key = getPlatformHandleKey(platform, handle);
  if (key) identities.platformHandles.add(key);
}

function addProfileUrl(
  identities: BrandProcessedIdentitySet,
  profileUrl?: string | null
) {
  const normalizedUrl = normalizeProfileUrl(profileUrl);
  if (normalizedUrl) identities.profileUrls.add(normalizedUrl);

  const urlIdentity = getPlatformHandleFromProfileUrl(profileUrl);
  if (urlIdentity) identities.platformHandles.add(urlIdentity);
}

function getPlatformHandleKey(platform?: string | null, handle?: string | null) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedPlatform || !normalizedHandle) return null;
  return `${normalizedPlatform}:${normalizedHandle}`;
}

function getPlatformHandleFromProfileUrl(profileUrl?: string | null, fallbackPlatform?: string | null) {
  if (!profileUrl) return null;

  try {
    const url = new URL(profileUrl.startsWith("http") ? profileUrl : `https://${profileUrl}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    const first = segments[0]?.replace(/^@/, "");
    if (!first) return null;

    if (host.includes("instagram.com")) return getPlatformHandleKey("instagram", first);
    if (host.includes("tiktok.com")) return getPlatformHandleKey("tiktok", first);
    if (host.includes("youtube.com")) {
      if (first.startsWith("@")) return getPlatformHandleKey("youtube", first);
      if (["c", "channel", "user"].includes(first) && segments[1]) {
        return getPlatformHandleKey("youtube", segments[1]);
      }
      return getPlatformHandleKey("youtube", first);
    }
    if (host.includes("twitter.com") || host.includes("x.com")) return getPlatformHandleKey("twitter", first);
  } catch {
    // Fall back to explicit platform + normalized URL-ish handle below.
  }

  return getPlatformHandleKey(fallbackPlatform, profileUrl);
}
