import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  if (!user || !userEmail) {
    return NextResponse.json(
      { error: "Unauthorized or email missing" },
      { status: 401 }
    );
  }

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail));

  // If user does not exist, insert them
  if (userResult.length === 0) {
    const result = await db
      .insert(users)
      .values({
        name: user.fullName ?? "",
        email: userEmail,
      })
      .returning();

    return NextResponse.json(result[0]);
  }

  // Return existing user if found
  return NextResponse.json(userResult[0]);
}