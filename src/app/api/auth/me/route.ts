import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/backend/presentation/middlewares/authorization";
import { publicUser } from "@/backend/infrastructure/auth/accessStore";

export async function GET(request: NextRequest) {
  const user = getRequestUser(request);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}
