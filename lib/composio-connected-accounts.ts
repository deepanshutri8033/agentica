import "server-only";

import { composio } from "@/lib/composio";
import { normalizeToolkitSlug } from "@/lib/normalize-toolkit-slug";

export { normalizeToolkitSlug } from "@/lib/normalize-toolkit-slug";

export async function getUserConnectedAccounts(
  userId: string,
  toolkitSlug?: string
) {
  const items = [];
  let cursor: string | undefined;

  do {
    const response = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ["ACTIVE"],
      limit: 100,
      ...(toolkitSlug
        ? { toolkitSlugs: [normalizeToolkitSlug(toolkitSlug)] }
        : {}),
      ...(cursor ? { cursor } : {}),
    });

    items.push(...response.items);
    cursor = response.nextCursor || undefined;
  } while (cursor);

  return items;
}
