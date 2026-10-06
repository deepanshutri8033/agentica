import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserConnectedAccounts, normalizeToolkitSlug } from "@/lib/composio-connected-accounts";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail =
      user?.primaryEmailAddress?.emailAddress || `user_${userId}@app.com`;

    const accounts = await getUserConnectedAccounts(userEmail);
    const connectedSlugs = new Set(
      accounts.map((account) => normalizeToolkitSlug(account.toolkit.slug))
    );

    return NextResponse.json({
      success: true,
      userEmail,
      connectedSlugs: Array.from(connectedSlugs),
    });
  } catch (err: any) {
    console.error("Failed to fetch integrations:", err);
    return NextResponse.json(
      { error: "Unable to load integration status right now." },
      { status: 502 }
    );
  }
}
