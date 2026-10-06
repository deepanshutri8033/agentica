import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

async function getCurrentDbUser() {
  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!user || !userEmail) {
    return null;
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail));

  if (userResult.length === 0) {
    const result = await db
      .insert(users)
      .values({
        name: user.fullName ?? "",
        email: userEmail,
      })
      .returning();

    return result[0];
  }

  return userResult[0];
}

export async function GET() {
  const userRecord = await getCurrentDbUser();

  if (!userRecord) {
    return NextResponse.json({ error: "Unauthorized or email missing" }, { status: 401 });
  }

  return NextResponse.json(userRecord);
}

export async function POST(req: NextRequest) {
  const userRecord = await getCurrentDbUser();

  if (!userRecord) {
    return NextResponse.json(
      { error: "Unauthorized or email missing" },
      { status: 401 }
    );
  }

  return NextResponse.json(userRecord);
}