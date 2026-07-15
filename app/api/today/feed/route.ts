// Today "What's happening" feed (client refresh endpoint). The server page
// renders the same data via getTodayFeed() for the initial paint.
import { NextResponse } from "next/server";
import { getTodayFeed } from "@/lib/todayFeed";

export const revalidate = 120;

export async function GET() {
  const feed = await getTodayFeed();
  return NextResponse.json(feed);
}
