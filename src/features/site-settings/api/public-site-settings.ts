import { cache } from "react";

import { getPublicSiteSettings } from "@/features/site-settings/api/site-settings-api";

export const getCachedPublicSiteSettings = cache(getPublicSiteSettings);
